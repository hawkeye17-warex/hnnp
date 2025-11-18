# HNNP Python SDK

This directory contains the official Python SDK for interacting with the HNNP Cloud backend.
It provides a simple, clean API client plus webhook verification utilities.

All behavior MUST strictly follow: hnnp/protocol/spec.md

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

from hnnp_sdk import verify_hnnp_webhook

is_valid = verify_hnnp_webhook(
    raw_body,
    signature,
    timestamp,
    webhook_secret
)

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

- HMAC verification MUST use exact rules defined in Section 8.3 of spec.md
- All network calls MUST use HTTPS
- Must not alter any packet format or cryptographic behavior

---

## Reference

Full protocol: ../../protocol/spec.md
