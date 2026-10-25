"""Red-folder economic calendar. Trades opened or closed near high-impact news get their profit capped."""
from __future__ import annotations

import json
import logging
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

from .timeutil import UTC

log = logging.getLogger(__name__)

FOREXFACTORY_WEEK_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"


@dataclass(frozen=True)
class NewsEvent:
    time: datetime  # UTC
    currency: str
    impact: str
    title: str


def parse_forexfactory(raw: str) -> list[NewsEvent]:
    events = []
    for item in json.loads(raw):
        try:
            when = datetime.fromisoformat(item["date"]).astimezone(UTC)
        except (KeyError, ValueError):
            continue
        events.append(NewsEvent(when, item.get("country", ""), item.get("impact", ""), item.get("title", "")))
    return events


class NewsCalendar:
    def __init__(self, events: list[NewsEvent], loaded_at: datetime, currencies: tuple[str, ...]):
        wanted = set(currencies)
        self.events = sorted(
            (e for e in events if e.impact.lower() == "high" and e.currency in wanted), key=lambda e: e.time
        )
        self.loaded_at = loaded_at

    def is_fresh(self, now: datetime, max_age_hours: float) -> bool:
        return now - self.loaded_at <= timedelta(hours=max_age_hours)

    def within(self, now: datetime, before_min: float, after_min: float) -> NewsEvent | None:
        """An event in [now - before_min, now + after_min], i.e. now sits in its exclusion zone."""
        lo, hi = now - timedelta(minutes=before_min), now + timedelta(minutes=after_min)
        return next((e for e in self.events if lo <= e.time <= hi), None)

    def upcoming(self, now: datetime, minutes: float) -> NewsEvent | None:
        hi = now + timedelta(minutes=minutes)
        return next((e for e in self.events if now < e.time <= hi), None)


def load_calendar(
    currencies: tuple[str, ...],
    cache_path: str | Path,
    url: str = FOREXFACTORY_WEEK_URL,
    now: datetime | None = None,
) -> NewsCalendar | None:
    """Fetch this week's calendar, falling back to the last cached copy. None if neither is available."""
    now = now or datetime.now(UTC)
    cache = Path(cache_path)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "goldbot-calendar/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            raw = resp.read().decode("utf-8")
        events = parse_forexfactory(raw)
        cache.write_text(raw)
        return NewsCalendar(events, now, currencies)
    except Exception as exc:  # network errors, rate limits, bad JSON
        log.warning("calendar fetch failed: %s", exc)
    if cache.exists():
        loaded_at = datetime.fromtimestamp(cache.stat().st_mtime, UTC)
        return NewsCalendar(parse_forexfactory(cache.read_text()), loaded_at, currencies)
    return None
