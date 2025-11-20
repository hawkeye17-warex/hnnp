package config

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

// Config holds receiver configuration loaded from environment or a simple env-style file.
//
// These correspond to the receiver parameters in protocol/spec.md (org_id, receiver_id, receiver_secret)
// plus api_base_url for the Cloud API base URL.
type Config struct {
	OrgID          string
	ReceiverID     string
	ReceiverSecret string
	BackendURL     string
}

// Load reads configuration from environment variables, optionally seeded by a simple
// KEY=VALUE file. Environment variables take precedence over file values.
//
// Supported environment variables:
//   - HNNP_ORG_ID
//   - HNNP_RECEIVER_ID
//   - HNNP_RECEIVER_SECRET
//   - HNNP_BACKEND_URL (deprecated; prefer HNNP_API_BASE_URL)
//   - HNNP_API_BASE_URL
//   - HNNP_CONFIG_PATH (optional; default "receiver.env")
func Load() (Config, error) {
	configPath := os.Getenv("HNNP_CONFIG_PATH")
	if configPath == "" {
		configPath = "receiver.env"
	}

	// If a simple env file exists, load it first (without overriding existing env).
	if _, err := os.Stat(configPath); err == nil {
		if err := loadEnvFile(configPath); err != nil {
			return Config{}, fmt.Errorf("loading config file %s: %w", configPath, err)
		}
	}

	orgID := strings.TrimSpace(os.Getenv("HNNP_ORG_ID"))
	receiverID := strings.TrimSpace(os.Getenv("HNNP_RECEIVER_ID"))
	receiverSecret := strings.TrimSpace(os.Getenv("HNNP_RECEIVER_SECRET"))

	backendURL := strings.TrimSpace(os.Getenv("HNNP_API_BASE_URL"))
	if backendURL == "" {
		backendURL = strings.TrimSpace(os.Getenv("HNNP_BACKEND_URL"))
	}

	cfg := Config{
		OrgID:          orgID,
		ReceiverID:     receiverID,
		ReceiverSecret: receiverSecret,
		BackendURL:     backendURL,
	}

	if cfg.OrgID == "" {
		return Config{}, fmt.Errorf("HNNP_ORG_ID is required")
	}
	if cfg.ReceiverID == "" {
		return Config{}, fmt.Errorf("HNNP_RECEIVER_ID is required")
	}
	if cfg.ReceiverSecret == "" {
		return Config{}, fmt.Errorf("HNNP_RECEIVER_SECRET is required")
	}
	if cfg.BackendURL == "" {
		return Config{}, fmt.Errorf("HNNP_API_BASE_URL (or HNNP_BACKEND_URL) is required")
	}

	return cfg, nil
}

func loadEnvFile(path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		if key == "" {
			continue
		}

		if _, exists := os.LookupEnv(key); !exists {
			_ = os.Setenv(key, value)
		}
	}

	if err := scanner.Err(); err != nil {
		return err
	}

	return nil
}
