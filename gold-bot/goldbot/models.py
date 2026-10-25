from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class Side(str, Enum):
    BUY = "buy"
    SELL = "sell"


GRADE_RANK = {"B": 0, "A": 1, "A+": 2}


@dataclass(frozen=True)
class AccountSnapshot:
    balance: float
    equity: float
    margin_free: float
    currency: str = "USD"


@dataclass(frozen=True)
class Position:
    ticket: int
    symbol: str
    side: Side
    volume: float
    price_open: float
    profit: float  # floating, including swap
    magic: int = 0


@dataclass(frozen=True)
class SymbolSpec:
    name: str
    tick_size: float
    tick_value: float  # account currency per tick per 1.0 lot
    volume_min: float
    volume_max: float
    volume_step: float
    bid: float
    ask: float

    @property
    def value_per_price_unit(self) -> float:
        """Account-currency P&L of a 1.0 price move on 1.0 lot (e.g. $100 for XAUUSD)."""
        return self.tick_value / self.tick_size


@dataclass(frozen=True)
class BalanceOperation:
    id: str
    time: datetime
    amount: float  # negative = withdrawal / payout


@dataclass(frozen=True)
class TradeSignal:
    """What an alpha agent proposes. The engine decides whether, and how big."""

    agent: str
    symbol: str
    side: Side
    entry: float
    stop_loss: float
    take_profits: tuple[float, ...] = ()
    grade: str = "A"
    comment: str = ""

    @property
    def stop_distance(self) -> float:
        return abs(self.entry - self.stop_loss)

    def stop_on_correct_side(self) -> bool:
        if self.side is Side.BUY:
            return self.stop_loss < self.entry
        return self.stop_loss > self.entry


@dataclass(frozen=True)
class OrderRequest:
    symbol: str
    side: Side
    volume: float
    stop_loss: float
    take_profit: float | None
    comment: str = ""


@dataclass(frozen=True)
class OrderResult:
    ok: bool
    ticket: int | None = None
    message: str = ""


@dataclass
class Decision:
    approved: bool
    reasons: list[str] = field(default_factory=list)
    mode: str = ""
    risk_pct: float = 0.0
    lots: float = 0.0
    order: OrderResult | None = None
