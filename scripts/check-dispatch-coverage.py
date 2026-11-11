#!/usr/bin/env python3
"""Check every monthly dispatch's stated coverage window against the newest dated
entry in its own tables and timeline cards.

The September 2026 dispatch carried a "September 26" dateline while the month ran
to September 30, so the last four days of launches were missing until someone
noticed. Nothing compared the dateline with the content, so the gap survived.
This check makes that comparison automatic:

  WINDOW_STALE        FAIL   dated content is newer than the stated window end
  METADATA_STALE      FAIL   JSON-LD dateModified predates dated content
  WINDOW_UNEVIDENCED  WARN   window end is >T days past the newest dated entry
  MONTH_SHORT         FAIL   post claims a whole month but stops short of its end
                            after that month has finished (INFO while in progress)
  WINDOW_MISSING      WARN   dispatch has no stated coverage window

Exit status: 0 when nothing fails, 1 on any FAIL (or any WARN with --strict).

Usage:
  python scripts/check-dispatch-coverage.py                 # discover in blog/
  python scripts/check-dispatch-coverage.py path/to/post.html ...
  python scripts/check-dispatch-coverage.py --strict --tolerance 3
"""

from __future__ import annotations

import argparse
import glob
import json
import os
import re
import sys
from datetime import date, datetime, timedelta

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

MONTHS = {m.lower(): i for i, m in enumerate(
    ["January", "February", "March", "April", "May", "June", "July",
     "August", "September", "October", "November", "December"], start=1)}
MONTH_ABBR = {m[:3].lower(): i for m, i in MONTHS.items()}

# Rows that describe a schedule rather than something that shipped or was verified.
FORWARDISH = re.compile(
    r"coming|expected|upcoming|no date|tbd|~|q[1-4]|mid[-\u2013]late|weeks?|months?|soon",
    re.I)

# A dated row that schedules a future change rather than recording one (price ledgers).
SCHEDULED_ROW = re.compile(r"\bscheduled\b|\bpromo ends\b|\breverts\b|\bexpiry\b", re.I)

DISPATCH_NAME = re.compile(
    r"(january|february|march|april|may|june|july|august|september|october|november|december)"
    r"[-_ ]?20\d\d.*(update|roundup)|(update|roundup).*20\d\d", re.I)


def month_day(token: str, default_year: int):
    """'Sep 28', 'Sep 17–19', 'Sep 22 (done)', 'Jan 1, 2027' -> date (range end)."""
    token = re.sub(r"\([^)]*\)", " ", token)
    token = re.sub(r"\s+", " ", token).strip().strip(",;")
    m = re.match(r"^([A-Za-z]{3,9})\.?\s+(\d{1,2})"
                 r"(?:\s*[-\u2013\u2014]\s*(\d{1,2}))?"
                 r"(?:\s*,?\s*(\d{4}))?", token)
    if not m:
        return None
    name = m.group(1).lower()
    mon = MONTH_ABBR.get(name) or MONTHS.get(name)
    if mon is None:
        return None
    day = int(m.group(3)) if m.group(3) else int(m.group(2))
    year = int(m.group(4)) if m.group(4) else default_year
    try:
        return date(year, mon, day)
    except ValueError:
        return None


def iso_or_none(token: str):
    m = re.match(r"^\s*(20\d\d)-(\d{2})-(\d{2})", token)
    if not m:
        return None
    try:
        return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
    except ValueError:
        return None


def text_of(fragment: str) -> str:
    fragment = re.sub(r"<[^>]+>", " ", fragment)
    return re.sub(r"\s+", " ", fragment).replace("\xa0", " ").strip()


def parse_window(html: str):
    """'Coverage window: July 31 – September 30, 2026. ...' -> (start, end, verified)."""
    m = re.search(r"Coverage window:\s*([A-Za-z]{3,9}\s+\d{1,2})(?:\s*,?\s*(20\d\d))?"
                  r"\s*(?:[\u2013\u2014]|&ndash;|-)\s*"
                  r"([A-Za-z]{3,9}\s+\d{1,2})(?:\s*,?\s*(20\d\d))?", html)
    if not m:
        return None, None, None
    end_year = int(m.group(4) or m.group(2) or 0)
    end = month_day(m.group(3), end_year) if end_year else None
    start = month_day(m.group(1), end_year) if end_year else None
    v = re.search(r"last verified\s+([A-Za-z]{3,9}\s+\d{1,2}),?\s*(20\d\d)", html[m.start():m.start() + 400])
    verified = month_day(v.group(1) + ", " + v.group(2), int(v.group(2))) if v else None
    return start, end, verified


def dated_entries(html: str, default_year: int):
    """Split dated rows into evidence (shipped/verified) and scheduled (forward-looking).

    Evidence = dated cells in non-calendar tables plus timeline badges, minus rows whose
    own wording is prospective. The forward calendar table (Date | Event | Why it matters)
    only counts a row as evidence when it is explicitly marked '(done)'.
    """
    evidence, scheduled = [], []
    for table in re.findall(r"<table\b.*?</table>", html, re.S | re.I):
        head = re.search(r"<thead\b.*?</thead>", table, re.S | re.I)
        is_calendar = bool(head and re.search(r"Event|Why it matters|Upcoming", head.group(0), re.I))
        for row in re.findall(r"<tr\b.*?</tr>", table, re.S | re.I):
            cells = re.findall(r"<td\b[^>]*>(.*?)</td>", row, re.S | re.I)
            if not cells:
                continue
            raw = text_of(cells[0])
            d = iso_or_none(raw) or month_day(raw, default_year)
            if not d:
                continue
            done = "(done)" in row.lower()
            if (FORWARDISH.search(raw) or SCHEDULED_ROW.search(text_of(row))
                    or (is_calendar and not done)):
                scheduled.append((d, raw, "calendar" if is_calendar else "table"))
            else:
                evidence.append((d, raw, "calendar" if is_calendar else "table"))
    for card in re.findall(r'<div class="model-release">.*?</div>\s*</div>', html, re.S):
        badge = re.search(r'<div class="model-badge"[^>]*>([^<]+)</div>', card)
        if not badge:
            continue
        raw = text_of(badge.group(1))
        d = month_day(raw, default_year)
        if not d:
            continue
        (scheduled if FORWARDISH.search(raw) else evidence).append((d, raw, "timeline"))
    evidence.sort(key=lambda e: e[0])
    scheduled.sort(key=lambda e: e[0])
    return evidence, scheduled


def metadata_dates(html: str, default_year: int):
    out = {}
    m = re.search(r'"dateModified":\s*"(20\d\d-\d\d-\d\d)"', html)
    if m:
        out["dateModified"] = datetime.strptime(m.group(1), "%Y-%m-%d").date()
    m = re.search(r"\(Updated\s+([A-Za-z]{3,9}\s+\d{1,2}),\s*(20\d\d)\)", html)
    if m:
        out["headerUpdated"] = month_day(m.group(1) + ", " + m.group(2), int(m.group(2)))
    m = re.search(r"Last Updated:\s*([A-Za-z]{3,9}\s+\d{1,2}),\s*(20\d\d)", html)
    if m:
        out["footerUpdated"] = month_day(m.group(1) + ", " + m.group(2), int(m.group(2)))
    return out


def month_end(year: int, mon: int) -> date:
    nxt_year, nxt_mon = (year + 1, 1) if mon == 12 else (year, mon + 1)
    return date(nxt_year, nxt_mon, 1) - timedelta(days=1)


def claimed_month(title: str, html: str):
    """'September 2026 AI Model Updates' -> (9, date of month end) or None."""
    blob = title + " " + html[:4000]
    m = re.search(r"\b(January|February|March|April|May|June|July|August|September|"
                  r"October|November|December)\s+(20\d\d)\b", blob)
    if not m:
        return None
    mon = MONTHS[m.group(1).lower()]
    return mon, month_end(int(m.group(2)), mon)


def check(path: str, tolerance: int):
    html = open(path, encoding="utf-8", errors="replace").read()
    title = re.search(r"<title>([^<]*)</title>", html)
    title = title.group(1) if title else os.path.basename(path)

    start, window_end, verified = parse_window(html)
    meta = metadata_dates(html, 0)
    reference = meta.get("dateModified") or verified or window_end or date.today()
    default_year = (window_end or reference).year

    entries, scheduled = dated_entries(html, default_year)
    newest, oldest = (entries[-1] if entries else None), (entries[0] if entries else None)

    fails, warns, infos = [], [], []

    if window_end is None:
        warns.append("WINDOW_MISSING: no 'Coverage window:' statement in this dispatch")
    else:
        if newest and newest[0] > window_end:
            fails.append("WINDOW_STALE: newest dated entry %s (%s, %s) is after the stated "
                         "window end %s — the dateline was not moved when this content was added"
                         % (newest[0].isoformat(), newest[1], newest[2], window_end.isoformat()))
        if newest and (window_end - newest[0]).days > tolerance:
            warns.append("WINDOW_UNEVIDENCED: window ends %s but the newest dated entry is %s "
                         "(%s) — the window claims %d day(s) with nothing dated behind them"
                         % (window_end.isoformat(), newest[0].isoformat(), newest[1],
                            (window_end - newest[0]).days))
        if start and oldest and oldest[0] < start:
            infos.append("window starts %s, oldest dated row is %s (%s) — deliberate for ledgers "
                         "that reach back before the window"
                         % (start.isoformat(), oldest[0].isoformat(), oldest[1]))

    if meta.get("dateModified") and newest and meta["dateModified"] < newest[0]:
        fails.append("METADATA_STALE: JSON-LD dateModified %s predates dated content from %s (%s)"
                     % (meta["dateModified"].isoformat(), newest[0].isoformat(), newest[1]))

    cm = claimed_month(title, html)
    if cm and window_end:
        _, m_end = cm
        if window_end < m_end:
            msg = ("MONTH_SHORT: dispatch claims %s but its window stops at %s, %d day(s) short "
                   "of the month's end (%s)" % (m_end.strftime("%B %Y"), window_end.isoformat(),
                                                (m_end - window_end).days, m_end.isoformat()))
            if meta.get("dateModified") and meta["dateModified"] >= m_end:
                fails.append(msg)
            else:
                infos.append(msg + " — dispatch still in progress as of %s"
                             % (meta.get("dateModified") or reference).isoformat())

    row = {
        "file": path,
        "window": [start.isoformat() if start else None, window_end.isoformat() if window_end else None],
        "last_verified": verified.isoformat() if verified else None,
        "date_modified": meta.get("dateModified").isoformat() if meta.get("dateModified") else None,
        "newest_entry": [newest[0].isoformat(), newest[1], newest[2]] if newest else None,
        "oldest_entry": oldest[0].isoformat() if oldest else None,
        "dated_entries": len(entries),
        "forward_looking": [f[0].isoformat() + " " + f[1] for f in scheduled],
        "fails": fails, "warnings": warns, "infos": infos,
    }
    return row


def main(argv=None):
    ap = argparse.ArgumentParser(description="Compare dispatch coverage windows with their tables.")
    ap.add_argument("paths", nargs="*", help="dispatch files (default: discover in blog/)")
    ap.add_argument("--tolerance", type=int, default=3, help="days a window may exceed the newest dated entry (default 3)")
    ap.add_argument("--strict", action="store_true", help="treat warnings as failures")
    ap.add_argument("--json", action="store_true", help="emit JSON instead of text")
    args = ap.parse_args(argv)

    paths = args.paths or sorted(
        p for p in glob.glob(os.path.join("blog", "*.html"))
        if DISPATCH_NAME.search(os.path.basename(p)))

    if not paths:
        print("no monthly dispatch posts found")
        return 0

    rows = [check(p, args.tolerance) for p in paths]
    n_fail = sum(1 for r in rows if r["fails"])
    n_warn = sum(1 for r in rows if r["warnings"])

    if args.json:
        print(json.dumps(rows, indent=2))
    else:
        for r in rows:
            status = "FAIL" if r["fails"] else ("WARN" if r["warnings"] else "PASS")
            print("%-4s  %s" % (status, r["file"]))
            print("      window      : %s -> %s%s" % (
                r["window"][0] or "?", r["window"][1] or "?",
                "  (last verified %s)" % r["last_verified"] if r["last_verified"] else ""))
            print("      dateModified: %s | dated rows: %d (newest %s, oldest %s) | forward-looking: %s"
                  % (r["date_modified"] or "?", r["dated_entries"],
                     r["newest_entry"][0] + " (" + r["newest_entry"][1] + ")" if r["newest_entry"] else "none",
                     r["oldest_entry"] or "none",
                     ", ".join(r["forward_looking"]) or "none"))
            for line in r["infos"]:
                print("      INFO  " + line)
            for line in r["warnings"]:
                print("      WARN  " + line)
            for line in r["fails"]:
                print("      FAIL  " + line)
        print("\n%d dispatch(es) checked: %d failed, %d with warnings"
              % (len(rows), n_fail, n_warn))

    if n_fail:
        return 1
    if args.strict and n_warn:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
