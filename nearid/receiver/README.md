# HNNP Receiver

The HNNP Receiver is a lightweight software agent that listens for BLE broadcasts, validates HNNP packets, signs presence reports, and sends them to the HNNP Cloud backend.

It implements all receiver-side responsibilities defined in: protocol/spec.md

---

## Responsibilities

- Continuous BLE scanning
- Parsing HNNP BLE packet structure
- Extracting version, flags, time_slot, token_prefix, mac
- Validating packet integrity
- Creating a presence report payload (fields per v2 spec)
- Signing it using receiver_secret via HMAC-SHA256
- Sending POST /v2/presence to the Cloud
- Retrying offline using local queue
- Enforcing timestamp skew limits

---

## Supported Platforms

- Linux (recommended for production)
- Raspberry Pi (fully supported)
- macOS (development only)
- Windows (partial BLE support depending on adapter)

---

## Requirements

- Python 3.10+ or Node.js 18+
- BLE adapter with scanning capabilities
- Internet connection for Cloud API requests

---

## Setup

cd hnnp/receiver
pip install -r requirements.txt
python3 src/main.py

---

## Environment Variables

ORG_ID=
RECEIVER_ID=
RECEIVER_SECRET=
API_BASE_URL=
MAX_SKEW_SECONDS=120         # max allowed |server_time - timestamp| in seconds (sender-side dropping)
MAX_DRIFT_SLOTS=1            # receiver-side |time_slot - current_slot| tolerance (15s windows)
DUPLICATE_SUPPRESS_SECONDS=5 # receiver-side duplicate suppression window for same token_prefix+time_slot

---

## Offline Queue Behavior

If the Cloud is unreachable, the receiver:

1. Saves presence reports in a local queue (memory or disk)
2. Automatically retries when internet is restored
3. Drops reports older than allowed server-side skew

---

## File Structure

src/
  ble_scanner.py
  packet_parser.py
  signer.py
  sender.py
  queue.py
  main.py

---

## Notes

- Must NEVER modify BLE payload format
- Must strictly follow signature rules from spec.md
- Must use HTTPS for Cloud communication
- Must not log secrets

---

## Reference

Full protocol: ../../protocol/spec.md
