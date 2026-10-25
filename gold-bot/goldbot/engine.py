"""Wires Guardian (Agent 1) and the Bimodal Risk Engine (Agent 4) to a broker.

`tick()` runs every 500 ms. `submit()` is the single door alpha agents use to place a trade.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Callable

from . import sizing
from .broker.base import Broker
from .config import BotConfig
from .guardian import Guardian
from .models import Decision, OrderRequest, Side, TradeSignal
from .news import NewsCalendar
from .risk_engine import RiskEngine, RiskPlan
from .state import BotState, DayRecord, Payout
from .timeutil import UTC, to_ny, trading_day, trading_day_bounds

log = logging.getLogger(__name__)


class Engine:
    def __init__(
        self,
        cfg: BotConfig,
        state: BotState,
        broker: Broker,
        news: NewsCalendar | None = None,
        state_path: str | Path | None = None,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
    ):
        self.cfg = cfg
        self.state = state
        self.broker = broker
        self.state_path = state_path
        self.clock = clock
        self.guardian = Guardian(cfg, state, news)
        self.risk = RiskEngine(cfg, state)

    @property
    def news(self) -> NewsCalendar | None:
        return self.guardian.news

    @news.setter
    def news(self, cal: NewsCalendar | None) -> None:
        self.guardian.news = cal

    # ---------------- monitoring ----------------

    def _sync_day(self, now: datetime, today: date, balance: float, equity: float) -> DayRecord:
        start, end = trading_day_bounds(today)
        closed = self.broker.closed_pnl(start, end)
        rec = self.state.day(today)
        if rec is None:
            # The bot is always flat at 5 PM, so the firm's reference is the balance at rollover,
            # i.e. today's balance minus what has closed since. Right after rollover, equity counts too.
            reference = balance - closed
            if now - start <= timedelta(minutes=5):
                reference = max(reference, equity)
            rec = self.state.days[today.isoformat()] = DayRecord(reference_equity=reference)
        rec.closed_pnl = closed
        return rec

    def _sync_payouts(self, now: datetime) -> None:
        seen = {p.op_id for p in self.state.payouts if p.op_id}
        since, _ = trading_day_bounds(date.fromisoformat(self.state.phase_start))
        for op in self.broker.balance_operations(since, now + timedelta(seconds=1)):
            if op.amount < 0 and op.id not in seen:
                self.state.payouts.append(Payout(trading_day(op.time).isoformat(), -op.amount, op.id))
                log.info("payout detected: %.2f", -op.amount)

    def _context(self) -> tuple[datetime, date, DayRecord, RiskPlan]:
        now = self.clock()
        today = trading_day(now)
        snap = self.broker.account()
        rec = self._sync_day(now, today, snap.balance, snap.equity)
        if not self.state.phase.is_eval:
            self._sync_payouts(now)
            if self.state.roll_cycle(today, self.cfg.funded_cycle_days):
                log.info("new payout cycle from %s", self.state.cycle_start)
        return now, today, rec, self.risk.plan(snap, today)

    def tick(self) -> list[str]:
        now, today, rec, plan = self._context()
        reasons = [f.reason for f in self.guardian.observe(now, self.broker.account(), self.broker.positions(), rec, plan)]
        if reasons:
            log.warning("flatten: %s", "; ".join(reasons))
            for res in self.broker.close_all(reasons[0]):
                if not res.ok:
                    log.error("close failed: %s", res.message)
            # Closing realizes P&L, which can bank a day or trip a flag: re-read before saving.
            snap = self.broker.account()
            self._sync_day(now, today, snap.balance, snap.equity)
        self.save()
        return reasons

    # ---------------- order gate ----------------

    def submit(self, signal: TradeSignal) -> Decision:
        now, today, rec, plan = self._context()
        snap = self.broker.account()
        positions = self.broker.positions()
        # Let the guardian set breaker / lock flags from the latest numbers before judging the entry.
        self.guardian.observe(now, snap, positions, rec, plan)
        vetoes = self.guardian.entry_vetoes(now, signal, plan, positions, rec)
        decision = Decision(False, vetoes, plan.mode.value)
        if vetoes:
            return decision

        risk_pct = self.risk.cap_for_room(plan.risk_pct, snap, rec.reference_equity)
        decision.risk_pct = round(risk_pct, 4)
        if risk_pct < self.cfg.min_risk_pct:
            decision.reasons.append(f"no room for a trade: risk {risk_pct:.2f}% below {self.cfg.min_risk_pct}%")
            return decision

        spec = self.broker.symbol_spec(signal.symbol)
        price = spec.ask if signal.side is Side.BUY else spec.bid
        risk_money = self.state.initial_balance * risk_pct / 100
        lots = sizing.lots_for_risk(risk_money, abs(price - signal.stop_loss), spec, self.cfg.commission_per_lot)
        leverage = self.cfg.rules.metals_leverage[self.state.phase]
        margin_lots = sizing.lots_for_margin(spec, price, leverage, snap.margin_free, self.cfg.max_margin_usage)
        lots = min(lots, margin_lots)
        if lots <= 0:
            decision.reasons.append("size below the minimum lot at this risk, or margin too thin")
            return decision

        tp = signal.take_profits[0] if signal.take_profits else None
        request = OrderRequest(signal.symbol, signal.side, lots, signal.stop_loss, tp, f"{signal.agent}:{signal.grade}")
        broker_margin = self.broker.calc_margin(request, price)
        if broker_margin is None or broker_margin > snap.margin_free * self.cfg.max_margin_usage:
            decision.reasons.append(f"broker margin {broker_margin} exceeds {self.cfg.max_margin_usage:.0%} of free margin")
            return decision

        result = self.broker.send_order(request)
        decision.lots = lots
        decision.order = result
        if result.ok:
            rec.entries += 1
            decision.approved = True
            self.save()
        else:
            decision.reasons.append(f"broker rejected: {result.message}")
        return decision

    # ---------------- status ----------------

    def status(self) -> dict:
        now, today, rec, plan = self._context()
        snap = self.broker.account()
        st, rules = self.state, self.cfg.rules
        out = {
            "now_ny": to_ny(now).strftime("%Y-%m-%d %H:%M"),
            "trading_day": today.isoformat(),
            "phase": st.phase.value,
            "mode": plan.mode.value,
            "risk_pct": plan.risk_pct,
            "notes": list(plan.notes),
            "balance": snap.balance,
            "equity": snap.equity,
            "profit_pct": round(st.pct(snap.balance - st.initial_balance), 3),
            "daily_loss_pct": round(self.guardian.daily_loss_pct(snap, rec), 3),
            "daily_breaker_pct": self.guardian.daily_breaker_pct,
            "today": vars(rec),
            "qualifying_days": st.qualifying_days(rules.min_profitable_day_pct),
            "killed": st.kill_reason if st.killed else False,
        }
        if st.phase.is_eval:
            out["target_pct"] = rules.profit_target_pct[st.phase]
            out["days_into_eval"] = (today - date.fromisoformat(st.eval_start)).days
            out["plan_deadline"] = self.risk.phase_deadline().isoformat()
        else:
            start, end = st.cycle_bounds(self.cfg.funded_cycle_days)
            out["cycle"] = {"start": start.isoformat(), "payout_date": end.isoformat()}
            out["month_pnl_pct"] = round(st.month_pnl_pct(today), 3)
            out["payouts"] = [vars(p) for p in st.payouts]
        return out

    def save(self) -> None:
        if self.state_path:
            self.state.save(self.state_path)


async def run_forever(
    engine: Engine,
    signals: asyncio.Queue[TradeSignal],
    refresh_news: Callable[[], NewsCalendar | None] | None = None,
    poll_seconds: float = 0.5,
    news_refresh_hours: float = 6.0,
) -> None:
    """Guardian loop plus signal intake. Alpha agents put TradeSignals on `signals`."""
    last_news = datetime.min.replace(tzinfo=UTC)

    async def guardian_loop():
        nonlocal last_news
        while True:
            try:
                if refresh_news and engine.clock() - last_news >= timedelta(hours=news_refresh_hours):
                    cal = await asyncio.to_thread(refresh_news)
                    if cal is not None:
                        engine.news = cal
                    last_news = engine.clock()
                engine.tick()
            except Exception:
                log.exception("guardian tick failed")
            await asyncio.sleep(poll_seconds)

    async def signal_loop():
        while True:
            sig = await signals.get()
            try:
                d = engine.submit(sig)
                log.info("%s %s %s -> approved=%s lots=%s risk=%s%% %s",
                         sig.agent, sig.symbol, sig.side.value, d.approved, d.lots, d.risk_pct, d.reasons)
            except Exception:
                log.exception("submit failed")

    await asyncio.gather(guardian_loop(), signal_loop())
