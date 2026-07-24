#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Minimal Feishu sender used by Tengyunzi Hermes automations."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

import requests

BASE_URL = "https://open.feishu.cn/open-apis"
ENV_FILE = Path(os.environ.get("HERMES_ENV_FILE", "/root/.hermes/.env"))


def env_value(name: str) -> str:
    direct = os.environ.get(name, "").strip()
    if direct:
        return direct
    if ENV_FILE.exists():
        for raw in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            if key.strip() == name:
                return value.strip().strip('"').strip("'")
    raise RuntimeError(f"Missing required environment variable: {name}")


def token() -> str:
    response = requests.post(
        f"{BASE_URL}/auth/v3/tenant_access_token/internal",
        json={
            "app_id": env_value("FEISHU_APP_ID"),
            "app_secret": env_value("FEISHU_APP_SECRET"),
        },
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    if payload.get("code") not in (None, 0) or not payload.get("tenant_access_token"):
        raise RuntimeError(f"Feishu token failed: {json.dumps(payload, ensure_ascii=False)}")
    return str(payload["tenant_access_token"])


def send_text(access_token: str, chat_id: str, text: str) -> dict[str, Any]:
    response = requests.post(
        f"{BASE_URL}/im/v1/messages?receive_id_type=chat_id",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=utf-8",
        },
        json={
            "receive_id": chat_id,
            "msg_type": "text",
            "content": json.dumps({"text": text}, ensure_ascii=False),
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def list_chats(access_token: str) -> list[dict[str, Any]]:
    response = requests.get(
        f"{BASE_URL}/im/v1/chats",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=30,
    )
    response.raise_for_status()
    payload = response.json()
    return payload.get("data", {}).get("items", [])


def upload_image(access_token: str, path: str) -> str:
    with open(path, "rb") as image_file:
        response = requests.post(
            f"{BASE_URL}/im/v1/images",
            headers={"Authorization": f"Bearer {access_token}"},
            files={"image": image_file},
            data={"image_type": "message"},
            timeout=60,
        )
    response.raise_for_status()
    payload = response.json()
    if payload.get("code") != 0:
        raise RuntimeError(f"Feishu image upload failed: {json.dumps(payload, ensure_ascii=False)}")
    return str(payload["data"]["image_key"])


def send_image(access_token: str, chat_id: str, image_key: str) -> dict[str, Any]:
    response = requests.post(
        f"{BASE_URL}/im/v1/messages?receive_id_type=chat_id",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json; charset=utf-8",
        },
        json={
            "receive_id": chat_id,
            "msg_type": "image",
            "content": json.dumps({"image_key": image_key}),
        },
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def main() -> int:
    access_token = token()
    command = sys.argv[1] if len(sys.argv) > 1 else "list"
    if command == "list":
        for chat in list_chats(access_token):
            print(chat.get("chat_id"), "|", chat.get("name"), "|", chat.get("chat_mode"))
        return 0
    if command == "send" and len(sys.argv) >= 4:
        print(json.dumps(send_text(access_token, sys.argv[2], sys.argv[3]), ensure_ascii=False))
        return 0
    if command == "img" and len(sys.argv) >= 4:
        image_key = upload_image(access_token, sys.argv[3])
        if len(sys.argv) > 4:
            send_text(access_token, sys.argv[2], sys.argv[4])
        print(json.dumps(send_image(access_token, sys.argv[2], image_key), ensure_ascii=False))
        return 0
    raise SystemExit("Usage: feishu_send.py list | send <chat_id> <text> | img <chat_id> <path> [text]")


if __name__ == "__main__":
    raise SystemExit(main())
