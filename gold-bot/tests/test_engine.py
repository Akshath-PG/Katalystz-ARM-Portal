import unittest
from datetime import date, datetime, timedelta

from goldbot.broker.paper import PaperBroker
from goldbot.config import BotConfig, Phase, Program
from goldbot.engine import Engine
from goldbot.models import Side, TradeSignal
from goldbot.news import NewsCalendar, NewsEvent
from goldbot.risk_engine import Mode, Pace
from goldbot.state import BotState, DayRecord
from goldbot.timeutil import NY, UTC

BAL = 100_000.0


def ny(y, m, d, hh=10, mm=0):
    return datetime(y, m, d, hh, mm, tzinfo=NY).astimezone(UTC)


class Clock:
    def __init__(self, t):
        self.t = t

    def __call__(self):
        return self.t


def buy(grade="A", stop=2390.0, symbol="XAUUSD"):
    return TradeSignal("test", symbol, Side.BUY, 2400.2, stop, (2425.0,), grade)


class Base(unittest.TestCase):
    phase = Phase.PHASE1
    start = date(2026, 10, 1)
    leverage = 20.0

    def setUp(self):
        self.clock = Clock(ny(2026, 10, 7))  # Wednesday 10:00 NY
        self.cfg = BotConfig().with_overrides({"news_max_age_hours": 24 * 365})  # tests jump the clock
        self.state = BotState.new(Program.STANDARD, self.phase, BAL, self.start)
        self.broker = PaperBroker(BAL, self.clock, self.leverage)
        self.engine = Engine(self.cfg, self.state, self.broker, self.calendar([]), clock=self.clock)

    def calendar(self, events):
        return NewsCalendar(events, self.clock(), self.cfg.news_currencies)

    def open_trade(self, **kw):
        d = self.engine.submit(buy(**kw))
        self.assertTrue(d.approved, d.reasons)
        return d

    def history(self, pcts, start, step=1):
        """Write past day records with the given closed P&L percentages."""
        d = start
        for pct in pcts:
            self.state.days[d.isoformat()] = DayRecord(BAL, BAL * pct / 100)
            d += timedelta(days=step)


class GuardianTests(Base):
    def test_sizes_one_percent_risk(self):
        d = self.open_trade()
        self.assertEqual(d.mode, Mode.EVAL_ATTACK.value)
        self.assertAlmostEqual(d.risk_pct, 1.0)
        # $1,000 risk over a $10.20 stop on $100/point = 0.98 lots
        self.assertAlmostEqual(d.lots, 0.98)

    def test_force_flat_before_5pm(self):
        self.open_trade()
        self.clock.t = ny(2026, 10, 7, 16, 46)
        self.assertTrue(self.engine.tick())
        self.assertEqual(self.broker.positions(), [])

    def test_no_entries_in_rollover_blackout_or_friday_afternoon(self):
        self.clock.t = ny(2026, 10, 7, 16, 20)
        self.assertIn("blackout", " ".join(self.engine.submit(buy()).reasons))
        self.clock.t = ny(2026, 10, 9, 13, 31)  # Friday
        self.assertIn("weekend", " ".join(self.engine.submit(buy()).reasons))

    def test_daily_breaker_uses_reference_equity(self):
        d = self.open_trade()
        self.broker.set_floating(d.order.ticket, -2_850)
        self.engine.tick()
        self.assertEqual(self.broker.positions(), [])
        self.assertIn("daily breaker fired today", self.engine.submit(buy()).reasons)
        # Next trading day the breaker resets.
        self.clock.t = ny(2026, 10, 8)
        self.assertTrue(self.engine.submit(buy()).approved)

    def test_trade_risk_shrinks_to_remaining_daily_room(self):
        self.broker.realize(-2_000)
        d = self.open_trade()
        # 2.8% breaker - 2.0% lost - 0.2% buffer = 0.6% left
        self.assertAlmostEqual(d.risk_pct, 0.6)

    def test_equity_kill_switch_is_permanent(self):
        self.broker.realize(-6_000, ny(2026, 10, 5))
        self.broker.realize(-2_600)
        self.engine.tick()
        self.assertTrue(self.state.killed)
        self.clock.t = ny(2026, 10, 12)
        self.assertTrue(any("killed" in r for r in self.engine.submit(buy()).reasons))

    def test_news_lockout_and_preflat(self):
        event = NewsEvent(ny(2026, 10, 7, 10, 25), "USD", "High", "CPI m/m")
        self.engine.news = self.calendar([event])
        self.assertTrue(any("red-folder" in r for r in self.engine.submit(buy()).reasons))
        # Position opened earlier: flattened 12 minutes before the release.
        self.engine.news = self.calendar([])
        self.open_trade()
        self.engine.news = self.calendar([event])
        self.clock.t = ny(2026, 10, 7, 10, 14)
        self.assertTrue(any("pre-news" in r for r in self.engine.tick()))

    def test_fail_closed_without_calendar(self):
        self.engine.news = None
        self.assertIn("no fresh economic calendar", self.engine.submit(buy()).reasons)

    def test_max_two_trades_per_day(self):
        for _ in range(2):
            d = self.open_trade()
            self.broker.set_floating(d.order.ticket, 100)
            self.broker.close_all("test")
        self.assertTrue(any("max 2" in r for r in self.engine.submit(buy()).reasons))

    def test_rejects_non_gold_and_bad_stop(self):
        self.assertTrue(any("not an allowed" in r for r in self.engine.submit(buy(symbol="EURUSD")).reasons))
        self.assertIn("invalid stop loss", self.engine.submit(buy(stop=2410.0)).reasons)


class EvalRiskTests(Base):
    def plan(self):
        return self.engine.risk.plan(self.broker.account(), date(2026, 10, 7))

    def test_recovery_and_house_money_tiers(self):
        self.broker.realize(-500, ny(2026, 10, 5))
        self.assertAlmostEqual(self.plan().risk_pct, 0.65)
        self.broker.realize(3_000, ny(2026, 10, 6))
        self.assertAlmostEqual(self.plan().risk_pct, 1.25)

    def test_behind_schedule_boosts_but_never_past_cap(self):
        self.clock.t = ny(2026, 10, 20)  # day 19 of a 27-day phase-1 plan, still flat
        plan = self.engine.risk.plan(self.broker.account(), date(2026, 10, 20))
        self.assertIn("pace=behind", plan.notes)
        self.assertAlmostEqual(plan.risk_pct, 1.25)

    def test_past_45_days_keeps_trading_at_standard_risk(self):
        self.clock.t = ny(2026, 11, 25)
        plan = self.engine.risk.plan(self.broker.account(), date(2026, 11, 25))
        self.assertEqual(self.engine.risk.pace(date(2026, 11, 25), 0.0, 10.0), Pace.OVERDUE)
        self.assertEqual(plan.mode, Mode.EVAL_ATTACK)
        self.assertAlmostEqual(plan.risk_pct, 1.0)
        self.assertTrue(self.engine.submit(buy()).approved)

    def test_target_hit_flattens_then_hunts_missing_profitable_days(self):
        self.broker.realize(9_500, ny(2026, 10, 6))
        self.history([9.5], date(2026, 10, 2))  # closing today's trade makes only the 2nd qualifying day
        d = self.open_trade()
        self.broker.set_floating(d.order.ticket, 600)
        self.assertTrue(any("target" in r for r in self.engine.tick()))
        self.clock.t = ny(2026, 10, 8)
        plan = self.engine.risk.plan(self.broker.account(), date(2026, 10, 8))
        self.assertEqual(plan.mode, Mode.EVAL_QUALIFY)
        self.assertAlmostEqual(plan.risk_pct, 0.35)

    def test_passed_when_target_and_days_met(self):
        self.broker.realize(10_200, ny(2026, 10, 6))
        self.history([3.4, 3.4, 3.4], date(2026, 10, 2))
        reasons = self.engine.submit(buy()).reasons
        self.assertTrue(any("eval_passed" in r for r in reasons))


class FundedTests(Base):
    phase = Phase.FUNDED
    start = date(2026, 10, 1)
    leverage = 10.0

    def test_funded_risk_and_grade_filter(self):
        self.assertTrue(any("grade A below" in r for r in self.engine.submit(buy("A")).reasons))
        d = self.open_trade(grade="A+")
        self.assertAlmostEqual(d.risk_pct, 0.35)

    def test_funded_breaker_is_point_eight(self):
        d = self.open_trade(grade="A+")
        self.broker.set_floating(d.order.ticket, -810)
        self.engine.tick()
        self.assertTrue(self.state.day(date(2026, 10, 7)).breaker)

    def test_day_locks_after_qualifying_profit(self):
        d = self.open_trade(grade="A+")
        self.broker.set_floating(d.order.ticket, 560)
        self.broker.close_all("tp")
        self.engine.tick()
        self.assertIn("qualifying day already banked", self.engine.submit(buy("A+")).reasons)

    def test_hibernate_until_payout_then_resume_if_payout_missed(self):
        self.history([0.55, 0.55, 0.55], date(2026, 10, 2))
        self.broker.realize(1_650, ny(2026, 10, 4))
        self.history([0.0], date(2026, 10, 6))
        self.state.days["2026-10-02"].closed_pnl = 550 + 300  # cycle now at +1.95%
        plan = self.engine.risk.plan(self.broker.account(), date(2026, 10, 7))
        self.assertEqual(plan.mode, Mode.FUNDED_HIBERNATE)
        self.assertTrue(any("2026-10-15" in n for n in plan.notes))

        # Day 14: payout window. No withdrawal happened (missed payout) -> the bot trades again.
        self.clock.t = ny(2026, 10, 15)
        d = self.engine.submit(buy("A+"))
        self.assertTrue(d.approved, d.reasons)
        self.assertEqual(self.state.cycle_start, "2026-10-15")

    def test_monthly_cap_stops_at_four_percent(self):
        self.history([0.6] * 7, date(2026, 10, 1), step=2)  # 4.2% this month, spread over two cycles
        self.clock.t = ny(2026, 10, 21)
        plan = self.engine.risk.plan(self.broker.account(), date(2026, 10, 21))
        self.assertEqual(plan.mode, Mode.FUNDED_HIBERNATE)
        self.assertTrue(any("monthly cap" in n for n in plan.notes))
        # New month: trading resumes.
        self.clock.t = ny(2026, 11, 2)
        self.assertTrue(self.engine.submit(buy("A+")).approved)

    def test_payout_withdrawal_is_detected(self):
        self.clock.t = ny(2026, 10, 15)
        self.broker.withdraw(1_800, "op-1")
        self.engine.tick()
        self.assertEqual([p.amount for p in self.state.payouts], [1_800])
        self.engine.tick()
        self.assertEqual(len(self.state.payouts), 1)

    def test_margin_respects_funded_leverage(self):
        # Tight stop -> risk sizing wants ~12 lots; 1:10 margin on 50% of free margin allows ~2.08.
        d = self.open_trade(grade="A+", stop=2397.3)
        self.assertLessEqual(d.lots * 2400 * 100 / 10, BAL * 0.5 + 1)


if __name__ == "__main__":
    unittest.main()
