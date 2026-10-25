"""Command line: init / advance / payout / status / run."""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
from datetime import date, datetime
from pathlib import Path

from .config import BotConfig, Phase, Program
from .engine import Engine, run_forever
from .news import load_calendar
from .state import BotState, Payout
from .timeutil import UTC, trading_day


def _today() -> date:
    return trading_day(datetime.now(UTC))


def _mt5_broker(args):
    from .broker.mt5 import MT5Broker

    return MT5Broker(
        login=args.login, password=args.password, server=args.server, path=args.terminal,
        server_utc_offset_hours=args.server_utc_offset,
    )


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(prog="goldbot")
    p.add_argument("--state", default="goldbot_state.json")
    p.add_argument("--config", help="JSON file overriding BotConfig defaults")
    sub = p.add_subparsers(dest="cmd", required=True)

    i = sub.add_parser("init", help="start tracking a new account")
    i.add_argument("--program", choices=[x.value for x in Program], default="standard")
    i.add_argument("--phase", choices=[x.value for x in Phase], default="phase1")
    i.add_argument("--balance", type=float, required=True)
    i.add_argument("--start", type=date.fromisoformat)

    a = sub.add_parser("advance", help="move to the next phase (new account credentials from the firm)")
    a.add_argument("--phase", choices=["phase2", "funded"], required=True)
    a.add_argument("--balance", type=float, required=True)
    a.add_argument("--start", type=date.fromisoformat)

    po = sub.add_parser("payout", help="record a payout manually (MT5 withdrawals are detected automatically)")
    po.add_argument("--amount", type=float, required=True)
    po.add_argument("--day", type=date.fromisoformat)

    for name in ("status", "run"):
        s = sub.add_parser(name)
        s.add_argument("--login", type=int)
        s.add_argument("--password")
        s.add_argument("--server")
        s.add_argument("--terminal", help="path to terminal64.exe")
        s.add_argument("--server-utc-offset", type=float, default=0.0)
        s.add_argument("--calendar-cache", default="ff_calendar_cache.json")

    args = p.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    cfg = BotConfig.load(args.config)
    state_path = Path(args.state)

    if args.cmd == "init":
        if state_path.exists():
            raise SystemExit(f"{state_path} exists; delete it or use 'advance'")
        st = BotState.new(Program(args.program), Phase(args.phase), args.balance, args.start or _today())
        st.save(state_path)
        print(f"initialized {st.program.value} {st.phase.value} at {st.initial_balance:,.2f}")
        return

    st = BotState.load(state_path)
    if st.program is not cfg.program:
        cfg = cfg.with_overrides({"program": st.program.value})
        cfg.validate()

    if args.cmd == "advance":
        st.advance(Phase(args.phase), args.balance, args.start or _today())
        st.save(state_path)
        print(f"now in {st.phase.value} at {st.initial_balance:,.2f}")
        return

    if args.cmd == "payout":
        st.payouts.append(Payout((args.day or _today()).isoformat(), args.amount))
        st.save(state_path)
        print(f"recorded payout {args.amount:,.2f}")
        return

    broker = _mt5_broker(args)
    refresh = lambda: load_calendar(cfg.news_currencies, args.calendar_cache)  # noqa: E731
    engine = Engine(cfg, st, broker, refresh(), state_path)

    if args.cmd == "status":
        print(json.dumps(engine.status(), indent=2, default=str))
        return

    signals: asyncio.Queue = asyncio.Queue()
    try:
        asyncio.run(run_forever(engine, signals, refresh))
    except KeyboardInterrupt:
        pass
    finally:
        broker.shutdown()
