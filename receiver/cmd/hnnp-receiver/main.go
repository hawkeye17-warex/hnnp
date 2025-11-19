package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/hawkeye17-warex/hnnp/receiver/internal/config"
	"github.com/hawkeye17-warex/hnnp/receiver/internal/netclient"
)

func main() {
	log.Println("HNNP receiver starting (Go daemon stub, no real BLE/crypto yet)")

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	client := netclient.NewClient(cfg.BackendURL)

	maxIterations := parseMaxIterations()

	// Set up graceful shutdown on SIGINT/SIGTERM.
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	iteration := 0

	for {
		if maxIterations > 0 && iteration >= maxIterations {
			log.Printf("Reached max iterations (%d); exiting", maxIterations)
			return
		}

		select {
		case <-ctx.Done():
			log.Println("Shutdown signal received; exiting")
			return
		case t := <-ticker.C:
			iteration++
			err := sendStubPresence(ctx, client, cfg, t.UTC())
			if err != nil {
				log.Printf("error sending presence: %v", err)
			}
		}
	}
}

func parseMaxIterations() int {
	raw := os.Getenv("HNNP_MAX_ITERATIONS")
	if raw == "" {
		return 0
	}
	n, err := strconv.Atoi(raw)
	if err != nil || n < 0 {
		log.Printf("Invalid HNNP_MAX_ITERATIONS=%q, ignoring", raw)
		return 0
	}
	return n
}

func sendStubPresence(ctx context.Context, client *netclient.Client, cfg config.Config, now time.Time) error {
	const rotationWindowSeconds = 15

	timestamp := now.Unix()
	timeSlot := timestamp / rotationWindowSeconds

	// NOTE: This is a stub implementation. We DO NOT implement real cryptography or BLE here.
	// The payload shape follows protocol/spec.md (v2 /v2/presence), but token_prefix/mac/signature
	// are placeholder values until real HMAC + BLE parsing is implemented.

	req := netclient.PresenceRequest{
		OrgID:       cfg.OrgID,
		ReceiverID:  cfg.ReceiverID,
		Timestamp:   timestamp,
		TimeSlot:    uint32(timeSlot),
		Version:     0x02,
		Flags:       0x00,
		TokenPrefix: "00000000000000000000000000000000", // 16-byte hex stub
		Mac:         "0000000000000000",                 // 8-byte hex stub
		Signature:   "stub-signature-no-hmac",           // placeholder; not spec-compliant yet
	}

	log.Printf("Simulating presence: time_slot=%d org_id=%s receiver_id=%s", req.TimeSlot, req.OrgID, req.ReceiverID)

	if err := client.SendPresence(ctx, req); err != nil {
		return err
	}

	return nil
}

