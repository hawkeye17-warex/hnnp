# HNNP Node.js SDK

This directory contains the official Node.js SDK for interacting with the HNNP Cloud backend.
It implements REST API wrappers and webhook verification logic exactly as defined in the protocol specification.

All SDK behavior MUST follow: protocol/spec.md

---

## Features

- Typed API client (TypeScript)
- REST methods for presence, events, links
- Webhook signature verification
- Pagination helpers
- Error handling & retry wrappers

---

## Installation

npm install @hnnp/sdk

---

## Usage Example

import { HnnpClient } from "@hnnp/sdk";

const client = new HnnpClient({
  apiKey: "YOUR_API_KEY",
  orgId: "org_123",
  baseUrl: "https://api.hnnp.example"
});

const events = await client.listEvents();

await client.linkPresenceSession({
  presenceSessionId: "psess_001",
  userRef: "emp_45"
});

---

## Webhook Verification

import { verifyHnnpWebhook } from "@hnnp/sdk";

const isValid = verifyHnnpWebhook({
  rawBody,
  signature: headers["x-hnnp-signature"],
  timestamp: headers["x-hnnp-timestamp"],
  webhookSecret: process.env.WEBHOOK_SECRET
});

---

## Available Methods

client.listEvents()
client.getEvent(eventId)
client.linkPresenceSession({ presenceSessionId, userRef })
client.unlink(linkId)
client.getLinks()
client.getDevice(deviceId)

---

## File Structure

src/
  index.ts
  client.ts
  http.ts
  webhook.ts
  types.ts

---

## Environment Variables

WEBHOOK_SECRET=your_org_webhook_secret

---

## Notes

- Webhook signing follows the HMAC rules in Section 10.3 of the v2 spec.
- All network calls use HTTPS.
- SDK MUST NOT alter any packet formats or cryptographic logic.

---

## Reference

Full protocol spec: ../../protocol/spec.md
