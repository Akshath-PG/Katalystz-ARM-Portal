"""Agent 4: the Bimodal Risk Engine.

Evaluation (Predator) mode paces risk against a 45-day plan but never stops trading when the plan
runs over. Funded (Cash-Cow) mode hunts qualifying days, hibernates until the 14-day payout date,
then trades the next cycle whether or not the payout was taken, capped at a monthly profit ceiling.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from enum import Enum

from .config import BotConfig, Phase
from .models import AccountSnapshot
from .state import BotState


class Mode(str, Enum):
    EVAL_ATTACK = "eval_attack"
    EVAL_QUALIFY = "eval_qualify"  # target hit, still short of profitable days
    EVAL_PASSED = "eval_passed"  # target and profitable days done: flat until advanced
    FUNDED_HUNT = "funded_hunt"
    FUNDED_HIBERNATE = "funded_hibernate"


class Pace(str, Enum):
    AHEAD = "ahead"
    ON_TRACK = "on_track"
    BEHIND = "behind"
    OVERDUE = "overdue"


@dataclass(frozen=True)
class RiskPlan:
    mode: Mode
    risk_pct: float
    day_lock_pct: float | None = None  # bank the day once closed P&L reaches this
    min_grade: str = "A"
    notes: tuple[str, ...] = ()

    @property
    def can_trade(self) -> bool:
        return self.risk_pct > 0


class RiskEngine:
    def __init__(self, cfg: BotConfig, state: BotState):
        self.cfg = cfg
        self.state = state

    @property
    def rules(self):
        return self.cfg.rules

    def plan(self, snap: AccountSnapshot, today: date) -> RiskPlan:
        if self.state.phase.is_eval:
            return self._eval_plan(snap, today)
        return self._funded_plan(snap, today)

    # ---------------- Evaluation ----------------

    def phase_deadline(self) -> date:
        eval_start = date.fromisoformat(self.state.eval_start)
        if self.state.phase is Phase.PHASE1:
            return eval_start + timedelta(days=self.cfg.phase1_budget_days)
        return eval_start + timedelta(days=self.cfg.eval_deadline_days)

    def pace(self, today: date, profit_pct: float, target_pct: float) -> Pace:
        start = date.fromisoformat(self.state.phase_start)
        total = (self.phase_deadline() - start).days
        elapsed = (today - start).days
        if total <= 0 or elapsed >= total:
            return Pace.OVERDUE
        expected = target_pct * elapsed / total
        if profit_pct >= expected + self.cfg.pace_ahead_fraction * target_pct:
            return Pace.AHEAD
        if profit_pct <= expected - self.cfg.pace_behind_fraction * target_pct:
            return Pace.BEHIND
        return Pace.ON_TRACK

    def _eval_plan(self, snap: AccountSnapshot, today: date) -> RiskPlan:
        cfg, st = self.cfg, self.state
        target = self.rules.profit_target_pct[st.phase]
        profit_pct = st.pct(snap.balance - st.initial_balance)

        if profit_pct >= target:
            days = st.qualifying_days(self.rules.min_profitable_day_pct)
            if days >= self.rules.min_profitable_days:
                return RiskPlan(Mode.EVAL_PASSED, 0.0, notes=("target and profitable days met: request the next phase",))
            return RiskPlan(
                Mode.EVAL_QUALIFY,
                cfg.qualify_risk_pct,
                day_lock_pct=cfg.day_lock_pct,
                notes=(f"target met, {days}/{self.rules.min_profitable_days} profitable days",),
            )

        phase1 = st.phase is Phase.PHASE1
        base = cfg.p1_base_risk_pct if phase1 else cfg.p2_base_risk_pct
        house = cfg.p1_house_risk_pct if phase1 else cfg.p2_house_risk_pct
        notes = []
        if snap.balance < st.initial_balance or snap.equity < st.initial_balance:
            tier, risk = "recovery", cfg.eval_recovery_risk_pct
        elif profit_pct >= cfg.eval_house_trigger_pct:
            tier, risk = "house", house
        else:
            tier, risk = "base", base
        notes.append(f"tier={tier}")

        pace = self.pace(today, profit_pct, target)
        notes.append(f"pace={pace.value}")
        if pace is Pace.AHEAD and tier == "house":
            risk = base  # bank the lead, cut variance
        elif pace is Pace.BEHIND and tier != "recovery":
            risk = min(risk + cfg.pace_boost_pct, cfg.eval_max_risk_pct)
        elif pace is Pace.OVERDUE:
            # Past the plan: keep working at normal risk. No catch-up gambling.
            notes.append("past the 45-day plan, continuing at standard risk")
        return RiskPlan(Mode.EVAL_ATTACK, min(risk, cfg.eval_max_risk_pct), notes=tuple(notes))

    # ---------------- Funded ----------------

    def _funded_plan(self, snap: AccountSnapshot, today: date) -> RiskPlan:
        cfg, st = self.cfg, self.state
        cycle_start, cycle_end = st.cycle_bounds(cfg.funded_cycle_days)
        cycle_pct = st.closed_pnl_pct(cycle_start, today)
        cycle_days = st.qualifying_days(self.rules.min_profitable_day_pct, since=cycle_start)
        month_pct = st.month_pnl_pct(today)
        notes = (
            f"cycle {cycle_start}..{cycle_end}: {cycle_pct:+.2f}%, {cycle_days} qualifying days",
            f"month {month_pct:+.2f}% of {cfg.funded_monthly_cap_pct}% cap",
        )

        if month_pct >= cfg.funded_monthly_cap_pct:
            return RiskPlan(Mode.FUNDED_HIBERNATE, 0.0, notes=notes + ("monthly cap reached: flat until next month",))
        days_met = cycle_days >= cfg.funded_qualifying_days
        if days_met and cycle_pct >= cfg.funded_cycle_target_min_pct:
            return RiskPlan(
                Mode.FUNDED_HIBERNATE, 0.0, notes=notes + (f"cycle target met: flat until payout date {cycle_end}",)
            )

        risk = cfg.funded_risk_pct
        if snap.balance < st.initial_balance * (1 - cfg.funded_drawdown_trigger_pct / 100):
            risk = cfg.funded_drawdown_risk_pct
        # Never let the cycle run past its ceiling: once there, only hunt the missing days at minimum size.
        if cycle_pct >= cfg.funded_cycle_target_max_pct:
            risk = min(risk, cfg.funded_drawdown_risk_pct)
        return RiskPlan(
            Mode.FUNDED_HUNT, risk, day_lock_pct=cfg.day_lock_pct, min_grade=cfg.funded_min_grade, notes=notes
        )

    # ---------------- Per-trade cap ----------------

    def cap_for_room(self, risk_pct: float, snap: AccountSnapshot, reference_equity: float) -> float:
        """Shrink risk so a full stop-out can never trip the daily breaker or the equity kill floor."""
        cfg, st = self.cfg, self.state
        breaker = cfg.eval_daily_breaker_pct if st.phase.is_eval else cfg.funded_daily_breaker_pct
        daily_room = breaker - st.pct(reference_equity - snap.equity) - cfg.risk_buffer_pct
        floor_room = st.pct(snap.equity - st.initial_balance * cfg.equity_kill_floor_pct / 100) - cfg.risk_buffer_pct
        return max(0.0, min(risk_pct, daily_room, floor_room))
