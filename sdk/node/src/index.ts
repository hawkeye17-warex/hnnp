type FetchLike = typeof fetch;

export class HnnpApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export interface HnnpClientOptions {
  baseUrl: string;
  apiKey: string;
  fetch?: FetchLike;
  retries?: number;
}

export class HnnpClient {
  private readonly baseUrl: string;

  private readonly apiKey: string;

  private readonly fetchImpl: FetchLike;

  private readonly retries: number;

  constructor(opts: HnnpClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
    this.fetchImpl = opts.fetch ?? globalThis.fetch;
    if (!this.fetchImpl) {
      throw new Error("Fetch API is not available. Provide a fetch implementation.");
    }
    this.retries = typeof opts.retries === "number" ? opts.retries : 2;
  }

  // ---- Receivers ----
  async listReceivers(params: { orgId: string }) {
    const { orgId } = params;
    return this.getJson(`/v2/orgs/${encodeURIComponent(orgId)}/receivers`);
  }

  async createReceiver(params: {
    orgId: string;
    receiverId: string;
    displayName?: string;
    locationLabel?: string;
    authMode: string;
    sharedSecret?: string;
    publicKeyPem?: string;
    firmwareVersion?: string;
    status?: string;
  }) {
    const { orgId, ...body } = params;
    return this.postJson(`/v2/orgs/${encodeURIComponent(orgId)}/receivers`, {
      receiver_id: body.receiverId,
      display_name: body.displayName,
      location_label: body.locationLabel,
      auth_mode: body.authMode,
      shared_secret: body.sharedSecret,
      public_key_pem: body.publicKeyPem,
      firmware_version: body.firmwareVersion,
      status: body.status,
    });
  }

  async updateReceiver(params: {
    orgId: string;
    receiverId: string;
    displayName?: string;
    locationLabel?: string;
    authMode?: string;
    sharedSecret?: string;
    publicKeyPem?: string;
    firmwareVersion?: string;
    status?: string;
  }) {
    const { orgId, receiverId, ...body } = params;
    return this.patchJson(`/v2/orgs/${encodeURIComponent(orgId)}/receivers/${encodeURIComponent(receiverId)}`, {
      display_name: body.displayName,
      location_label: body.locationLabel,
      auth_mode: body.authMode,
      shared_secret: body.sharedSecret,
      public_key_pem: body.publicKeyPem,
      firmware_version: body.firmwareVersion,
      status: body.status,
    });
  }

  // ---- Presence read ----
  async listPresenceEvents(params: {
    orgId: string;
    userRef?: string;
    receiverId?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    return this.getJson("/v1/presence/events", params);
  }

  async listPresenceSessions(params: {
    orgId: string;
    userRef?: string;
    receiverId?: string;
    deviceIdHash?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) {
    return this.getJson("/v1/presence/sessions", params);
  }

  // ---- Links ----
  async createLink(params: { orgId: string; userRef: string; deviceId?: string }) {
    return this.postJson("/v1/links", params);
  }

  async activateLink(id: string) {
    return this.postJson(`/v1/links/${encodeURIComponent(id)}/activate`);
  }

  async revokeLink(id: string) {
    return this.postJson(`/v1/links/${encodeURIComponent(id)}/revoke`);
  }

  async listLinks(params: { orgId: string; userRef?: string }) {
    return this.getJson("/v1/links", params);
  }

  // ---- HTTP helpers ----
  private async getJson(path: string, query?: Record<string, unknown>) {
    const url = this.buildUrl(path, query);
    return this.requestWithRetry(url, { method: "GET", headers: this.authHeaders() });
  }

  private async postJson(path: string, body?: any) {
    const url = this.buildUrl(path);
    return this.requestWithRetry(url, {
      method: "POST",
      headers: { ...this.authHeaders(), "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private async patchJson(path: string, body?: any) {
    const url = this.buildUrl(path);
    return this.requestWithRetry(url, {
      method: "PATCH",
      headers: { ...this.authHeaders(), "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private authHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  private buildUrl(path: string, query?: Record<string, unknown>) {
    const url = new URL(path, `${this.baseUrl}/`);
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        url.searchParams.set(k, String(v));
      });
    }
    return url.toString();
  }

  private async requestWithRetry(url: string, init: RequestInit, attempt = 0): Promise<any> {
    try {
      const res = await this.fetchImpl(url, init);
      const text = await res.text();
      const body = text ? safeJsonParse(text) : null;

      if (!res.ok) {
        throw new HnnpApiError(`HTTP ${res.status}`, res.status, body);
      }
      return body;
    } catch (err) {
      if (attempt < this.retries && isRetryable(err)) {
        return this.requestWithRetry(url, init, attempt + 1);
      }
      throw err;
    }
  }
}

function safeJsonParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isRetryable(err: unknown): boolean {
  if (err instanceof HnnpApiError) {
    return err.status >= 500 && err.status < 600;
  }
  return true;
}

/**
 * Example:
 * const client = new HnnpClient({ baseUrl: process.env.HNNP_URL!, apiKey: process.env.HNNP_KEY! });
 * const events = await client.listPresenceEvents({ orgId: "test_org" });
 */

