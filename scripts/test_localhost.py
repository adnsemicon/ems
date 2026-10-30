#!/usr/bin/env python3
"""Smoke-test the local EMS frontend, official icon, and API."""

import argparse
import json
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import urlopen


def get(url: str) -> bytes:
    try:
        with urlopen(url, timeout=5) as response:
            if response.status != 200:
                raise RuntimeError(f"{url} returned HTTP {response.status}")
            return response.read()
    except (HTTPError, URLError, TimeoutError) as error:
        raise RuntimeError(f"Could not reach {url}: {error}") from error


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--frontend-url", default="http://127.0.0.1:5173/")
    parser.add_argument("--api-url", default="http://127.0.0.1:8787/")
    args = parser.parse_args()

    frontend_url = args.frontend_url.rstrip("/") + "/"
    api_url = args.api_url.rstrip("/") + "/"

    try:
        html = get(frontend_url).decode("utf-8")
        if "Employee Daily Updates | ADN Semiconductor" not in html:
            raise RuntimeError("Frontend response does not contain the expected EMS page title.")
        if 'href="./icon.png"' not in html:
            raise RuntimeError("Frontend page does not reference the official icon.png file.")
        print("PASS frontend page")

        icon = get(urljoin(frontend_url, "icon.png"))
        if not icon.startswith(b"\x89PNG\r\n\x1a\n"):
            raise RuntimeError("The served icon.png is not a valid PNG file.")
        print("PASS official icon")

        health = json.loads(get(urljoin(api_url, "api/health")).decode("utf-8"))
        if health.get("status") != "ok":
            raise RuntimeError("API health endpoint did not return status='ok'.")
        print("PASS API health")

        deadline = json.loads(get(urljoin(api_url, "api/deadline-status")).decode("utf-8"))
        if not isinstance(deadline.get("isLocked"), bool) or not isinstance(deadline.get("currentDate"), str):
            raise RuntimeError("API deadline-status response has an unexpected shape.")
        print("PASS API deadline status")
    except (RuntimeError, json.JSONDecodeError, UnicodeDecodeError) as error:
        print(f"FAIL {error}", file=sys.stderr)
        return 1

    print("All localhost smoke tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
