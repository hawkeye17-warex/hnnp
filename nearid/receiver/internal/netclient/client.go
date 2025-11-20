package netclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// PresenceRequest matches the JSON request body for POST /v2/presence
// as defined in protocol/spec.md (v2 receiver/cloud interface).
//
// Fields:
//   - org_id
//   - receiver_id
//   - timestamp
//   - time_slot
//   - version
//   - flags
//   - token_prefix
//   - mac
//   - signature
type PresenceRequest struct {
	OrgID       string `json:"org_id"`
	ReceiverID  string `json:"receiver_id"`
	Timestamp   int64  `json:"timestamp"`
	TimeSlot    uint32 `json:"time_slot"`
	Version     uint8  `json:"version"`
	Flags       uint8  `json:"flags"`
	TokenPrefix string `json:"token_prefix"`
	Mac         string `json:"mac"`
	Signature   string `json:"signature"`
}

type Client struct {
	baseURL    string
	httpClient *http.Client
}

// NewClient constructs a Client with a default HTTP client.
func NewClient(baseURL string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// SendPresence sends a presence report to the Cloud backend using POST /v2/presence.
//
// NOTE: This uses stub token data and signature; it is only wiring/structure,
// not a cryptographically valid implementation.
func (c *Client) SendPresence(ctx context.Context, req PresenceRequest) error {
	body, err := json.Marshal(req)
	if err != nil {
		return fmt.Errorf("marshal presence request: %w", err)
	}

	url := c.baseURL + "/v2/presence"

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create HTTP request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("POST %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("POST %s: non-2xx status %s", url, resp.Status)
	}

	return nil
}

