"""Lot sizing from tick value, never hardcoded, so XAUUSD / XAUEUR / XAUGBP / XAUAUD all size correctly."""
from __future__ import annotations

import math

from .models import SymbolSpec

_EPS = 1e-9


def _floor_to_step(lots: float, step: float) -> float:
    steps = math.floor(lots / step + _EPS)
    decimals = max(0, -int(math.floor(math.log10(step)))) if step < 1 else 0
    return round(steps * step, decimals)


def lots_for_risk(risk_money: float, stop_distance: float, spec: SymbolSpec, commission_per_lot: float = 0.0) -> float:
    """Largest lot size whose full stop-out (plus commission) costs no more than risk_money.

    Rounds down, never up: 0.0 means even the minimum lot would over-risk, so skip the trade.
    """
    if risk_money <= 0 or stop_distance <= 0:
        return 0.0
    loss_per_lot = stop_distance * spec.value_per_price_unit + commission_per_lot
    lots = min(_floor_to_step(risk_money / loss_per_lot, spec.volume_step), spec.volume_max)
    return lots if lots >= spec.volume_min - _EPS else 0.0


def margin_per_lot(spec: SymbolSpec, price: float, leverage: float) -> float:
    """price * value_per_price_unit is the lot's notional in account currency, whatever the quote currency."""
    return price * spec.value_per_price_unit / leverage


def lots_for_margin(spec: SymbolSpec, price: float, leverage: float, free_margin: float, usage: float) -> float:
    per_lot = margin_per_lot(spec, price, leverage)
    if per_lot <= 0:
        return 0.0
    lots = min(_floor_to_step(free_margin * usage / per_lot, spec.volume_step), spec.volume_max)
    return lots if lots >= spec.volume_min - _EPS else 0.0
