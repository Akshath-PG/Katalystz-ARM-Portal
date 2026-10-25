"""Agent 1: Guardian & Compliance. Highest authority: it can flatten the account and veto any entry."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from .config import BotConfig
from .models import GRADE_RANK, AccountSnapshot, Position, TradeSignal
from .news import NewsCalendar
from .risk_engine import Mode, RiskPlan
from .state import BotState, DayRecord
from .timeutil import to_ny


@dataclass(frozen=True)
class Flatten:
    reason: str


class Guardian:
    def __init__(self, cfg: BotConfig, state: BotState, news: NewsCalendar | None = None):
        self.cfg = cfg
        self.state = state
        self.news = news

    @property
    def daily_breaker_pct(self) -> float:
        return self.cfg.eval_daily_breaker_pct if self.state.phase.is_eval else self.cfg.funded_daily_breaker_pct

    def daily_loss_pct(self, snap: AccountSnapshot, rec: DayRecord) -> float:
        return self.state.pct(rec.reference_equity - snap.equity)

    # ------------- continuous monitoring -------------

    def observe(
        self, now: datetime, snap: AccountSnapshot, positions: list[Position], rec: DayRecord, plan: RiskPlan
    ) -> list[Flatten]:
        """Update kill/breaker/lock flags and return the reasons, if any, to flatten right now."""
        cfg, st = self.cfg, self.state
        out: list[Flatten] = []

        if snap.equity <= st.initial_balance * cfg.equity_kill_floor_pct / 100:
            if not st.killed:
                st.killed = True
                st.kill_reason = f"equity {snap.equity:.2f} at or below {cfg.equity_kill_floor_pct}% kill floor"
            out.append(Flatten(st.kill_reason))

        if self.daily_loss_pct(snap, rec) >= self.daily_breaker_pct:
            rec.breaker = True
            out.append(Flatten(f"daily breaker: loss {self.daily_loss_pct(snap, rec):.2f}% >= {self.daily_breaker_pct}%"))

        ny = to_ny(now).time()
        if cfg.force_flat_time <= ny < cfg.entry_blackout_end:
            out.append(Flatten("pre-5PM flat: avoid the floating-equity reset of the daily loss reference"))

        if self.news is not None:
            event = self.news.upcoming(now, cfg.news_preflat_minutes)
            if event and not self.news.within(now, cfg.news_lockout_minutes, cfg.news_lockout_minutes):
                out.append(Flatten(f"pre-news flat: {event.currency} {event.title} at {event.time:%H:%M} UTC"))

        if st.phase.is_eval:
            target = cfg.rules.profit_target_pct[st.phase]
            if st.pct(snap.equity - st.initial_balance) >= target and positions:
                out.append(Flatten(f"phase target {target}% reached: lock it in"))
        else:
            floating = sum(p.profit for p in positions)
            if st.pct(rec.closed_pnl + floating) >= cfg.funded_daily_profit_guard_pct:
                out.append(Flatten("funded daily profit guard: stay under the firm's daily profit cap"))

        if plan.day_lock_pct is not None and st.pct(rec.closed_pnl) >= plan.day_lock_pct:
            rec.locked = True
            out.append(Flatten(f"qualifying day banked at {st.pct(rec.closed_pnl):.2f}%"))

        if plan.mode in (Mode.EVAL_PASSED, Mode.FUNDED_HIBERNATE):
            out.append(Flatten(f"{plan.mode.value}: no exposure"))

        return out if positions else []

    # ------------- entry gate -------------

    def entry_vetoes(
        self, now: datetime, signal: TradeSignal, plan: RiskPlan, positions: list[Position], rec: DayRecord
    ) -> list[str]:
        cfg, st = self.cfg, self.state
        v: list[str] = []
        if st.killed:
            v.append(f"killed: {st.kill_reason}")
        if not plan.can_trade:
            v.append(f"mode {plan.mode.value} takes no trades")
        if rec.breaker:
            v.append("daily breaker fired today")
        if rec.locked:
            v.append("qualifying day already banked")
        if rec.entries >= cfg.max_trades_per_day:
            v.append(f"max {cfg.max_trades_per_day} trades per day")
        if len(positions) >= cfg.max_open_positions:
            v.append("max open positions")
        if signal.symbol not in cfg.allowed_symbols:
            v.append(f"{signal.symbol} not an allowed gold pair")
        if GRADE_RANK.get(signal.grade, -1) < GRADE_RANK[plan.min_grade]:
            v.append(f"grade {signal.grade} below required {plan.min_grade}")
        if signal.stop_distance <= 0 or not signal.stop_on_correct_side():
            v.append("invalid stop loss")
        v.extend(self._time_vetoes(now))
        v.extend(self._news_vetoes(now))
        return v

    def _time_vetoes(self, now: datetime) -> list[str]:
        cfg = self.cfg
        ny = to_ny(now)
        wd, t = ny.weekday(), ny.time()
        if wd == 5 or (wd == 4 and t >= cfg.friday_entry_cutoff) or (wd == 6 and t < cfg.sunday_entry_start):
            return ["weekend window: no entries after Friday cutoff or before Sunday open"]
        if cfg.entry_blackout_start <= t < cfg.entry_blackout_end:
            return ["entry blackout around the 5 PM NY rollover"]
        return []

    def _news_vetoes(self, now: datetime) -> list[str]:
        cfg = self.cfg
        if self.news is None or not self.news.is_fresh(now, cfg.news_max_age_hours):
            return ["no fresh economic calendar"] if cfg.news_fail_closed else []
        event = self.news.within(now, cfg.news_lockout_minutes, max(cfg.news_lockout_minutes, cfg.news_entry_horizon_minutes))
        if event:
            return [f"red-folder lockout: {event.currency} {event.title} at {event.time:%Y-%m-%d %H:%M} UTC"]
        return []
