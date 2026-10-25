"""Persistent bot state: phase, day-by-day P&L, funded payout cycles."""
from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass, field
from datetime import date, timedelta
from pathlib import Path

from .config import Phase, Program


@dataclass
class DayRecord:
    reference_equity: float  # the firm's daily-loss reference: max(balance, equity) at 5 PM NY
    closed_pnl: float = 0.0
    entries: int = 0
    locked: bool = False  # profitable day banked, no more entries
    breaker: bool = False  # daily circuit breaker fired


@dataclass
class Payout:
    day: str
    amount: float
    op_id: str = ""


@dataclass
class BotState:
    program: Program
    phase: Phase
    initial_balance: float
    eval_start: str
    phase_start: str
    cycle_start: str | None = None
    killed: bool = False
    kill_reason: str = ""
    days: dict[str, DayRecord] = field(default_factory=dict)
    payouts: list[Payout] = field(default_factory=list)
    history: list[dict] = field(default_factory=list)

    # ---- construction / persistence ----

    @classmethod
    def new(cls, program: Program, phase: Phase, balance: float, start: date) -> "BotState":
        s = cls(program, phase, balance, start.isoformat(), start.isoformat())
        if phase is Phase.FUNDED:
            s.cycle_start = start.isoformat()
        return s

    def advance(self, phase: Phase, balance: float, start: date) -> None:
        """Move to the next stage. The firm issues a fresh account per stage, so day records reset."""
        self.history.append(
            {
                "phase": self.phase.value,
                "phase_start": self.phase_start,
                "ended": start.isoformat(),
                "initial_balance": self.initial_balance,
                "closed_pnl": round(sum(r.closed_pnl for r in self.days.values()), 2),
            }
        )
        self.phase = phase
        self.initial_balance = balance
        self.phase_start = start.isoformat()
        self.days = {}
        self.killed = False
        self.kill_reason = ""
        self.cycle_start = start.isoformat() if phase is Phase.FUNDED else None

    def save(self, path: str | Path) -> None:
        data = asdict(self)
        data["program"] = self.program.value
        data["phase"] = self.phase.value
        tmp = Path(f"{path}.tmp")
        tmp.write_text(json.dumps(data, indent=2))
        os.replace(tmp, path)

    @classmethod
    def load(cls, path: str | Path) -> "BotState":
        data = json.loads(Path(path).read_text())
        data["program"] = Program(data["program"])
        data["phase"] = Phase(data["phase"])
        data["days"] = {k: DayRecord(**v) for k, v in data.get("days", {}).items()}
        data["payouts"] = [Payout(**p) for p in data.get("payouts", [])]
        return cls(**data)

    # ---- queries ----

    def day(self, d: date) -> DayRecord | None:
        return self.days.get(d.isoformat())

    def pct(self, money: float) -> float:
        return money / self.initial_balance * 100

    def _records(self, start: date | None = None, end: date | None = None):
        for key, rec in self.days.items():
            d = date.fromisoformat(key)
            if (start is None or d >= start) and (end is None or d <= end):
                yield d, rec

    def qualifying_days(self, min_pct: float, since: date | None = None) -> int:
        return sum(1 for _, r in self._records(since) if self.pct(r.closed_pnl) >= min_pct)

    def closed_pnl_pct(self, start: date | None = None, end: date | None = None) -> float:
        return self.pct(sum(r.closed_pnl for _, r in self._records(start, end)))

    def month_pnl_pct(self, today: date) -> float:
        return self.closed_pnl_pct(today.replace(day=1), today)

    # ---- funded payout cycles ----

    def cycle_bounds(self, cycle_days: int) -> tuple[date, date]:
        start = date.fromisoformat(self.cycle_start)  # type: ignore[arg-type]
        return start, start + timedelta(days=cycle_days)

    def roll_cycle(self, today: date, cycle_days: int) -> bool:
        """Advance the 14-day payout cycle on schedule, whether or not the payout was taken.

        Profit from a missed payout simply stays in the account; the next cycle starts trading again.
        """
        if self.cycle_start is None:
            self.cycle_start = today.isoformat()
            return True
        start = date.fromisoformat(self.cycle_start)
        elapsed = (today - start).days
        if elapsed < cycle_days:
            return False
        self.cycle_start = (start + timedelta(days=cycle_days * (elapsed // cycle_days))).isoformat()
        return True

    def payouts_since(self, d: date) -> float:
        return sum(p.amount for p in self.payouts if date.fromisoformat(p.day) >= d)
