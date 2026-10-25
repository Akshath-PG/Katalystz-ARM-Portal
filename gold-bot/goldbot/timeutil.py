"""New York trading-day arithmetic. The firm rolls its daily drawdown at 5:00 PM New York."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

NY = ZoneInfo("America/New_York")
UTC = timezone.utc
ROLLOVER = time(17, 0)


def to_ny(dt: datetime) -> datetime:
    return dt.astimezone(NY)


def trading_day(dt: datetime) -> date:
    """The trading day a moment belongs to: anything after 5 PM NY counts toward tomorrow."""
    ny = to_ny(dt)
    return ny.date() + timedelta(days=1) if ny.time() >= ROLLOVER else ny.date()


def trading_day_bounds(day: date) -> tuple[datetime, datetime]:
    start = datetime.combine(day - timedelta(days=1), ROLLOVER, NY)
    end = datetime.combine(day, ROLLOVER, NY)
    return start.astimezone(UTC), end.astimezone(UTC)


def weekdays_between(start: date, end: date) -> int:
    """Weekdays in [start, end)."""
    if end <= start:
        return 0
    n = 0
    d = start
    while d < end:
        if d.weekday() < 5:
            n += 1
        d += timedelta(days=1)
    return n
