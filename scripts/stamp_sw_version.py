#!/usr/bin/env python3
"""Stamp a fresh SW_VERSION into public/sw.js.

The service worker is network-first, so freshness does not depend on this --
bumping the version just drops every previous cache on activate, which is what
you want after changing caching rules or shipping assets you would rather not
have anyone holding a stale copy of.

Run before deploying when you want a clean slate:

    python3 scripts/stamp_sw_version.py

Uses the current git commit when available so the value maps back to a build,
falling back to a UTC timestamp outside a repo.
"""
import datetime
import os
import re
import subprocess
import sys

SW_PATH_DEFAULT = "public/sw.js"
VERSION_RE = re.compile(r"^const SW_VERSION = '([^']*)';$", re.M)


def build_version():
    stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d-%H%M")
    try:
        sha = subprocess.run(
            ["git", "rev-parse", "--short=7", "HEAD"],
            capture_output=True, text=True, check=True,
        ).stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return stamp
    return f"{stamp}-{sha}" if sha else stamp


def main():
    path = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else SW_PATH_DEFAULT)
    with open(path, "r", encoding="utf-8") as handle:
        text = handle.read()

    match = VERSION_RE.search(text)
    if not match:
        print(f"ERROR: no SW_VERSION line found in {path}", file=sys.stderr)
        return 1

    previous = match.group(1)
    version = build_version()
    if previous == version:
        print(f"SW_VERSION already {version}, nothing to do")
        return 0

    with open(path, "w", encoding="utf-8", newline="") as handle:
        handle.write(VERSION_RE.sub(f"const SW_VERSION = '{version}';", text, count=1))
    print(f"SW_VERSION {previous} -> {version}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
