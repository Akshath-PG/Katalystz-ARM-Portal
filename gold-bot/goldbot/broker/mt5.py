"""MetaTrader 5 adapter (official `MetaTrader5` package, Windows terminal required)."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

from ..models import AccountSnapshot, BalanceOperation, OrderRequest, OrderResult, Position, Side, SymbolSpec
from ..timeutil import UTC

log = logging.getLogger(__name__)


class MT5Broker:
    """MT5 stamps deals in broker *server* time. Set server_utc_offset_hours to the server's offset
    (most FX servers run UTC+2 in winter, UTC+3 in summer) or daily P&L lands on the wrong day."""

    def __init__(
        self,
        login: int | None = None,
        password: str | None = None,
        server: str | None = None,
        path: str | None = None,
        magic: int = 770_001,
        deviation: int = 30,
        server_utc_offset_hours: float = 0.0,
    ):
        import MetaTrader5 as mt5  # imported lazily: only available on Windows

        self.mt5 = mt5
        self.magic = magic
        self.deviation = deviation
        self.offset = timedelta(hours=server_utc_offset_hours)
        kwargs = {k: v for k, v in dict(login=login, password=password, server=server, path=path).items() if v}
        if not mt5.initialize(**kwargs):
            raise RuntimeError(f"MT5 initialize failed: {mt5.last_error()}")

    def shutdown(self) -> None:
        self.mt5.shutdown()

    # ---- reads ----

    def account(self) -> AccountSnapshot:
        a = self.mt5.account_info()
        if a is None:
            raise RuntimeError(f"account_info failed: {self.mt5.last_error()}")
        return AccountSnapshot(a.balance, a.equity, a.margin_free, a.currency)

    def positions(self) -> list[Position]:
        out = []
        for p in self.mt5.positions_get() or ():
            side = Side.BUY if p.type == self.mt5.POSITION_TYPE_BUY else Side.SELL
            out.append(Position(p.ticket, p.symbol, side, p.volume, p.price_open, p.profit + p.swap, p.magic))
        return out

    def symbol_spec(self, symbol: str) -> SymbolSpec:
        if not self.mt5.symbol_select(symbol, True):
            raise RuntimeError(f"symbol_select({symbol}) failed: {self.mt5.last_error()}")
        info = self.mt5.symbol_info(symbol)
        tick = self.mt5.symbol_info_tick(symbol)
        if info is None or tick is None:
            raise RuntimeError(f"no symbol data for {symbol}: {self.mt5.last_error()}")
        return SymbolSpec(
            symbol, info.trade_tick_size, info.trade_tick_value, info.volume_min, info.volume_max,
            info.volume_step, tick.bid, tick.ask,
        )

    def _deals(self, start: datetime, end: datetime):
        return self.mt5.history_deals_get(start + self.offset, end + self.offset) or ()

    def _deal_time(self, deal) -> datetime:
        return datetime.fromtimestamp(deal.time, UTC) - self.offset

    def closed_pnl(self, start: datetime, end: datetime) -> float:
        m = self.mt5
        trade_types = (m.DEAL_TYPE_BUY, m.DEAL_TYPE_SELL)
        exits = (m.DEAL_ENTRY_OUT, m.DEAL_ENTRY_INOUT, m.DEAL_ENTRY_OUT_BY)
        total = 0.0
        for d in self._deals(start, end):
            if d.type not in trade_types or not (start <= self._deal_time(d) < end):
                continue
            total += d.commission + getattr(d, "fee", 0.0)  # entry commissions count toward the day too
            if d.entry in exits:
                total += d.profit + d.swap
        return total

    def balance_operations(self, start: datetime, end: datetime) -> list[BalanceOperation]:
        return [
            BalanceOperation(str(d.ticket), self._deal_time(d), d.profit)
            for d in self._deals(start, end)
            if d.type == self.mt5.DEAL_TYPE_BALANCE
        ]

    def calc_margin(self, request: OrderRequest, price: float) -> float | None:
        order_type = self.mt5.ORDER_TYPE_BUY if request.side is Side.BUY else self.mt5.ORDER_TYPE_SELL
        return self.mt5.order_calc_margin(order_type, request.symbol, request.volume, price)

    # ---- writes ----

    def _filling(self, symbol: str) -> int:
        mode = self.mt5.symbol_info(symbol).filling_mode
        if mode & 1:
            return self.mt5.ORDER_FILLING_FOK
        if mode & 2:
            return self.mt5.ORDER_FILLING_IOC
        return self.mt5.ORDER_FILLING_RETURN

    def _deal_request(self, symbol: str, side: Side, volume: float, comment: str) -> dict:
        tick = self.mt5.symbol_info_tick(symbol)
        buy = side is Side.BUY
        return {
            "action": self.mt5.TRADE_ACTION_DEAL,
            "symbol": symbol,
            "volume": volume,
            "type": self.mt5.ORDER_TYPE_BUY if buy else self.mt5.ORDER_TYPE_SELL,
            "price": tick.ask if buy else tick.bid,
            "deviation": self.deviation,
            "magic": self.magic,
            "comment": comment[:31],
            "type_time": self.mt5.ORDER_TIME_GTC,
            "type_filling": self._filling(symbol),
        }

    def _send(self, req: dict) -> OrderResult:
        res = self.mt5.order_send(req)
        if res is None:
            return OrderResult(False, message=f"order_send failed: {self.mt5.last_error()}")
        ok = res.retcode in (self.mt5.TRADE_RETCODE_DONE, self.mt5.TRADE_RETCODE_PLACED)
        return OrderResult(ok, res.order or None, f"{res.retcode} {res.comment}")

    def send_order(self, request: OrderRequest) -> OrderResult:
        req = self._deal_request(request.symbol, request.side, request.volume, request.comment)
        req["sl"] = request.stop_loss
        if request.take_profit is not None:
            req["tp"] = request.take_profit
        check = self.mt5.order_check(req)
        if check is None or check.retcode != 0:
            return OrderResult(False, message=f"order_check rejected: {getattr(check, 'comment', self.mt5.last_error())}")
        return self._send(req)

    def close_all(self, reason: str) -> list[OrderResult]:
        results = []
        for p in self.positions():
            closing_side = Side.SELL if p.side is Side.BUY else Side.BUY
            for attempt in range(3):
                req = self._deal_request(p.symbol, closing_side, p.volume, f"guardian:{reason}")
                req["position"] = p.ticket
                res = self._send(req)
                if res.ok:
                    break
                log.error("close %s attempt %d failed: %s", p.ticket, attempt + 1, res.message)
            results.append(res)
        return results
