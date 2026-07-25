#!/usr/bin/env python3
"""Inject the iOS home-screen / PWA <head> tags into every static page.

The site is 40 hand-written HTML files with no shared layout, and none of them
referenced manifest.json -- it shipped but was never linked, so "Add to Home
Screen" produced a plain Safari bookmark. This adds the manifest link, the
Apple-specific meta tags that make the launched page look like an app, and the
service worker registration.

Idempotent per tag, not per file: each entry carries its own marker, so adding
a new tag to TAGS below and re-running only inserts the missing one and leaves
existing pages otherwise untouched. Mirrors inject-site-visit-tracker.mjs in
spirit; written in Python because this repo's toolchain has python3 but not node.

    python3 scripts/inject_pwa_meta.py [public_dir]
"""
import os
import re
import sys

# (marker, tag). The marker is the substring searched for to decide whether the
# tag is already present, so it must be unique within a page.
#
# theme-color matches --bg (#f6fafd) so Safari's toolbar blends into the page.
# status-bar-style is deliberately "default", not "black-translucent": the
# translucent style pulls content up under the status bar and would overlap
# every .nav header on this site.
TAGS = [
    ('rel="manifest"', '<link rel="manifest" href="/manifest.json">'),
    ('name="theme-color"', '<meta name="theme-color" content="#f6fafd">'),
    ('"apple-mobile-web-app-capable"', '<meta name="apple-mobile-web-app-capable" content="yes">'),
    ('"mobile-web-app-capable"', '<meta name="mobile-web-app-capable" content="yes">'),
    ('"apple-mobile-web-app-status-bar-style"',
     '<meta name="apple-mobile-web-app-status-bar-style" content="default">'),
    ('"apple-mobile-web-app-title"', '<meta name="apple-mobile-web-app-title" content="Tengyunzi">'),
    ('rel="apple-touch-icon"', '<link rel="apple-touch-icon" href="/images/apple-touch-icon.png">'),
    ('js/pwa-register.js', '<script src="/js/pwa-register.js" defer></script>'),
]

VIEWPORT_RE = re.compile(r'[ \t]*<meta[^>]+name=["\']viewport["\'][^>]*>[ \t]*\r?\n', re.I)
HEAD_RE = re.compile(r'<head[^>]*>[ \t]*\r?\n', re.I)
# Anchor new tags after the block this script previously wrote, so repeat runs
# keep the group together instead of interleaving with the page's own tags.
LAST_KNOWN_RE = re.compile(
    r'[ \t]*<link rel="apple-touch-icon"[^>]*>[ \t]*\r?\n', re.I)


def inject(text):
    missing = [tag for marker, tag in TAGS if marker not in text]
    if not missing:
        return False, text

    eol = "\r\n" if "\r\n" in text else "\n"
    block = "".join(f"  {tag}{eol}" for tag in missing)

    # Preferred anchor: straight after the tags a previous run wrote, else after
    # the viewport meta, where these conventionally live and where every page in
    # this repo has a stable line.
    match = LAST_KNOWN_RE.search(text) or VIEWPORT_RE.search(text) or HEAD_RE.search(text)
    if not match:
        return False, text

    end = match.end()
    return True, text[:end] + block + text[end:]


# offline.html is served by the service worker when the network is unreachable
# and is deliberately self-contained -- injecting a <script src> into it would
# leave a request that cannot succeed at the one moment the page is used.
EXCLUDED_FILENAMES = {"offline.html"}


def walk(root):
    for dirpath, _dirnames, filenames in os.walk(root):
        for name in sorted(filenames):
            if name.lower().endswith(".html") and name not in EXCLUDED_FILENAMES:
                yield os.path.join(dirpath, name)


def main():
    root = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "public")
    changed = complete = no_anchor = 0

    for path in walk(root):
        with open(path, "r", encoding="utf-8") as handle:
            raw = handle.read()
        did_change, content = inject(raw)
        if did_change:
            with open(path, "w", encoding="utf-8", newline="") as handle:
                handle.write(content)
            changed += 1
        elif all(marker in raw for marker, _ in TAGS):
            complete += 1
        else:
            no_anchor += 1
            print(f"WARN: no <head> anchor found, skipped {path}")

    print(f"updated={changed} already_complete={complete} skipped={no_anchor}")


if __name__ == "__main__":
    main()
