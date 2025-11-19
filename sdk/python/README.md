# HNNP Python SDK

This directory contains the official Python SDK for interacting with the HNNP Cloud backend.
It provides a simple, clean API client plus webhook verification utilities.

All behavior MUST strictly follow: protocol/spec.md

---

## Features

- REST API client (requests-based)
- Webhook signature verification
- Typed dataclasses for events, links, sessions
- Error handling and pagination helpers

---

## Installation

pip install hnnp-sdk

---

## Usage Example

from hnnp_sdk import HnnpClient

client = HnnpClient(
    api_key="YOUR_API_KEY",
    org_id="org_123",
    base_url="https://api.hnnp.example"
)

events = client.list_events()

client.link_presence_session(
    presence_session_id="psess_001",
    user_ref="emp_45"
)

---

## Webhook Verification

from hnnp_sdk import verify_webhook_signature

is_valid = verify_webhook_signature(
    secret=webhook_secret,
    timestamp=timestamp_header,
    raw_body=raw_body_bytes,
    signature_hex=signature_header,
)

---

## Flask Webhook Example

```python
import os
from flask import Flask, request, jsonify
from hnnp_sdk import verify_webhook_signature

app = Flask(__name__)

WEBHOOK_SECRET = os.environ["WEBHOOK_SECRET"]

@app.route("/hnnp/webhook", methods=["POST"])
def hnnp_webhook() -> "tuple[dict, int]" | "tuple[dict, int, dict]":
    signature = request.headers.get("X-HNNP-Signature", "")
    timestamp = request.headers.get("X-HNNP-Timestamp", "")
    raw_body = request.get_data()  # bytes

    if not verify_webhook_signature(WEBHOOK_SECRET, timestamp, raw_body, signature):
        return jsonify({"error": "invalid_webhook_signature"}), 400

    # At this point, request.json is trusted HNNP payload
    print("Received HNNP webhook:", request.json)
    return jsonify({"status": "ok"}), 200
```

---

## FastAPI Webhook Example

```python
import os
from fastapi import FastAPI, Request, HTTPException
from hnnp_sdk import verify_webhook_signature

app = FastAPI()
WEBHOOK_SECRET = os.environ["WEBHOOK_SECRET"]

@app.post("/hnnp/webhook")
async def hnnp_webhook(request: Request):
    signature = request.headers.get("X-HNNP-Signature", "")
    timestamp = request.headers.get("X-HNNP-Timestamp", "")
    raw_body = await request.body()  # bytes

    if not verify_webhook_signature(WEBHOOK_SECRET, timestamp, raw_body, signature):
        raise HTTPException(status_code=400, detail="invalid_webhook_signature")

    payload = await request.json()
    print("Received HNNP webhook:", payload)
    return {"status": "ok"}
```

---

## Methods

client.list_events()
client.get_event(event_id)
client.list_links()
client.link_presence_session(presence_session_id, user_ref)
client.unlink(link_id)

---

## File Structure

hnnp_sdk/
  client.py
  http.py
  webhook.py
  types.py
  __init__.py

---

## Environment Variables (optional)

WEBHOOK_SECRET=your_org_webhook_secret

---

## Notes

- HMAC verification MUST use exact rules defined in Section 10.3 of spec.md (v2).
- All network calls MUST use HTTPS
- Must not alter any packet format or cryptographic behavior

---

## Reference

Full protocol: ../../protocol/spec.md
