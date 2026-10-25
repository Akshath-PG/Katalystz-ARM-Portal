"""Firm rules (Goat Funded Trader 2-Step) and the bot's own, stricter thresholds."""
from __future__ import annotations

import json
from dataclasses import dataclass, field, fields, replace
from datetime import time
from enum import Enum
from pathlib import Path


class Program(str, Enum):
    STANDARD = "standard"
    GOAT = "goat"


class Phase(str, Enum):
    PHASE1 = "phase1"
    PHASE2 = "phase2"
    FUNDED = "funded"

    @property
    def is_eval(self) -> bool:
        return self is not Phase.FUNDED


@dataclass(frozen=True)
class FirmRules:
    """What the prop firm enforces. Breaching these loses the account or the profit."""

    profit_target_pct: dict[Phase, float]
    max_daily_dd_pct: float
    max_overall_dd_pct: float
    min_profitable_days: int
    min_profitable_day_pct: float
    metals_leverage: dict[Phase, float]
    funded_daily_profit_cap_pct: float = 3.0


def firm_rules(program: Program) -> FirmRules:
    if program is Program.GOAT:
        targets = {Phase.PHASE1: 8.0, Phase.PHASE2: 6.0, Phase.FUNDED: 0.0}
        daily = 4.0
    else:
        targets = {Phase.PHASE1: 10.0, Phase.PHASE2: 5.0, Phase.FUNDED: 0.0}
        daily = 5.0
    return FirmRules(
        profit_target_pct=targets,
        max_daily_dd_pct=daily,
        max_overall_dd_pct=10.0,
        min_profitable_days=3,
        min_profitable_day_pct=0.5,
        metals_leverage={Phase.PHASE1: 20.0, Phase.PHASE2: 20.0, Phase.FUNDED: 10.0},
    )


@dataclass(frozen=True)
class BotConfig:
    """The bot's self-imposed limits. Every value is tighter than the firm's rule it protects.

    All percentages are of the phase's initial balance. All clock times are New York time.
    """

    program: Program = Program.STANDARD

    # --- Guardian: hard brakes ---
    eval_daily_breaker_pct: float = 2.8
    funded_daily_breaker_pct: float = 0.8
    equity_kill_floor_pct: float = 91.5
    risk_buffer_pct: float = 0.2  # a fresh trade's full stop must still leave this much room
    force_flat_time: time = time(16, 45)
    entry_blackout_start: time = time(16, 15)
    entry_blackout_end: time = time(17, 5)
    friday_entry_cutoff: time = time(13, 30)
    sunday_entry_start: time = time(19, 0)
    max_open_positions: int = 1
    max_trades_per_day: int = 2

    # --- News lockout ---
    news_currencies: tuple[str, ...] = ("USD", "EUR", "GBP", "AUD")
    news_lockout_minutes: int = 10
    news_entry_horizon_minutes: int = 30  # no entries if a red-folder event is this close
    news_preflat_minutes: int = 12  # flatten this long before an event so no close lands in its window
    news_fail_closed: bool = True  # no calendar data -> no new entries
    news_max_age_hours: float = 12.0

    # --- Evaluation (Predator) mode ---
    eval_deadline_days: int = 45  # planning target only; the bot keeps trading after it
    phase1_budget_days: int = 27
    p1_base_risk_pct: float = 1.0
    p2_base_risk_pct: float = 0.75
    eval_recovery_risk_pct: float = 0.65  # balance below initial
    p1_house_risk_pct: float = 1.25  # balance at or above the house-money trigger
    p2_house_risk_pct: float = 1.0
    eval_house_trigger_pct: float = 2.0
    eval_max_risk_pct: float = 1.25
    pace_boost_pct: float = 0.25
    pace_ahead_fraction: float = 0.30  # ahead of schedule by 30% of the target -> bank the lead
    pace_behind_fraction: float = 0.30
    qualify_risk_pct: float = 0.35  # target hit but profitable-day count still short
    day_lock_pct: float = 0.52

    # --- Funded (Cash-Cow) mode ---
    funded_risk_pct: float = 0.35
    funded_drawdown_risk_pct: float = 0.25
    funded_drawdown_trigger_pct: float = 1.0
    funded_cycle_days: int = 14
    funded_qualifying_days: int = 3
    funded_cycle_target_min_pct: float = 1.5
    funded_cycle_target_max_pct: float = 2.5
    funded_monthly_cap_pct: float = 4.0
    funded_daily_profit_guard_pct: float = 2.8
    funded_min_grade: str = "A+"

    # --- Sizing ---
    allowed_symbols: tuple[str, ...] = ("XAUUSD", "XAUEUR", "XAUGBP", "XAUAUD")
    commission_per_lot: float = 0.0  # round-turn, account currency
    max_margin_usage: float = 0.5
    min_risk_pct: float = 0.1

    @property
    def rules(self) -> FirmRules:
        return firm_rules(self.program)

    def validate(self) -> None:
        r = self.rules
        if self.eval_daily_breaker_pct >= r.max_daily_dd_pct:
            raise ValueError("eval daily breaker must sit below the firm's daily drawdown limit")
        if self.funded_daily_breaker_pct >= r.max_daily_dd_pct:
            raise ValueError("funded daily breaker must sit below the firm's daily drawdown limit")
        if self.equity_kill_floor_pct <= 100 - r.max_overall_dd_pct:
            raise ValueError("equity kill floor must sit above the firm's static loss floor")
        if self.day_lock_pct < r.min_profitable_day_pct:
            raise ValueError("day lock must be at least the firm's profitable-day minimum")
        if self.funded_qualifying_days < r.min_profitable_days:
            raise ValueError("funded qualifying days cannot be fewer than the firm requires")
        if self.funded_daily_profit_guard_pct >= r.funded_daily_profit_cap_pct:
            raise ValueError("funded profit guard must sit below the firm's daily profit cap")

    @classmethod
    def load(cls, path: str | Path | None) -> "BotConfig":
        cfg = cls()
        if path:
            cfg = cfg.with_overrides(json.loads(Path(path).read_text()))
        cfg.validate()
        return cfg

    def with_overrides(self, data: dict) -> "BotConfig":
        known = {f.name: f for f in fields(self)}
        changes = {}
        for key, value in data.items():
            if key not in known:
                raise ValueError(f"unknown config key: {key}")
            current = getattr(self, key)
            if isinstance(current, time):
                hh, mm = str(value).split(":")
                value = time(int(hh), int(mm))
            elif isinstance(current, Program):
                value = Program(value)
            elif isinstance(current, tuple):
                value = tuple(value)
            changes[key] = value
        return replace(self, **changes)
