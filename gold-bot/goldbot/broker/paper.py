"""In-memory broker for tests and dry runs. Prices and floating P&L are set by the caller."""
from __future__ import annotations

from dataclasses import replace
from datetime import datetime
from typing import Callable

from ..models import AccountSnapshot, BalanceOperation, OrderRequest, OrderResult, Position, Side, SymbolSpec

DEFAULT_SPECS = {
    "XAUUSD": SymbolSpec("XAUUSD", 0.01, 1.0, 0.01, 50.0, 0.01, 2400.00, 2400.20),
    "XAUEUR": SymbolSpec("XAUEUR", 0.01, 1.08, 0.01, 50.0, 0.01, 2220.00, 2220.30),
    "XAUGBP": SymbolSpec("XAUGBP", 0.01, 1.27, 0.01, 50.0, 0.01, 1890.00, 1890.30),
    "XAUAUD": SymbolSpec("XAUAUD", 0.01, 0.66, 0.01, 50.0, 0.01, 3640.00, 3640.40),
}


class PaperBroker:
    def __init__(self, balance: float, clock: Callable[[], datetime], leverage: float = 20.0):
        self.balance = balance
        self.clock = clock
        self.leverage = leverage
        self.specs = dict(DEFAULT_SPECS)
        self._positions: dict[int, Position] = {}
        self.deals: list[tuple[datetime, float]] = []
        self.ops: list[BalanceOperation] = []
        self._next_ticket = 1
        self.sent: list[OrderRequest] = []
        self.close_calls: list[str] = []

    # ---- test helpers ----

    def set_floating(self, ticket: int, profit: float) -> None:
        self._positions[ticket] = replace(self._positions[ticket], profit=profit)

    def realize(self, amount: float, when: datetime | None = None) -> None:
        """Book a closed trade result directly."""
        self.balance += amount
        self.deals.append((when or self.clock(), amount))

    def withdraw(self, amount: float, op_id: str) -> None:
        self.balance -= amount
        self.ops.append(BalanceOperation(op_id, self.clock(), -amount))

    # ---- Broker protocol ----

    def account(self) -> AccountSnapshot:
        equity = self.balance + sum(p.profit for p in self._positions.values())
        used = sum(p.volume * p.price_open * self.specs[p.symbol].value_per_price_unit / self.leverage
                   for p in self._positions.values())
        return AccountSnapshot(self.balance, equity, equity - used)

    def positions(self) -> list[Position]:
        return list(self._positions.values())

    def symbol_spec(self, symbol: str) -> SymbolSpec:
        return self.specs[symbol]

    def closed_pnl(self, start: datetime, end: datetime) -> float:
        return sum(amount for when, amount in self.deals if start <= when < end)

    def balance_operations(self, start: datetime, end: datetime) -> list[BalanceOperation]:
        return [op for op in self.ops if start <= op.time < end]

    def calc_margin(self, request: OrderRequest, price: float) -> float | None:
        return request.volume * price * self.specs[request.symbol].value_per_price_unit / self.leverage

    def send_order(self, request: OrderRequest) -> OrderResult:
        spec = self.specs[request.symbol]
        price = spec.ask if request.side is Side.BUY else spec.bid
        ticket = self._next_ticket
        self._next_ticket += 1
        self._positions[ticket] = Position(ticket, request.symbol, request.side, request.volume, price, 0.0)
        self.sent.append(request)
        return OrderResult(True, ticket)

    def close_all(self, reason: str) -> list[OrderResult]:
        self.close_calls.append(reason)
        results = []
        for ticket, pos in list(self._positions.items()):
            self.realize(pos.profit)
            del self._positions[ticket]
            results.append(OrderResult(True, ticket, reason))
        return results
