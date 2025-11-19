export interface ResolveLinkParams {
  orgId: string;
  deviceId: string | null;
}

export interface ResolveLinkResult {
  linked: boolean;
  linkId?: string;
  userRef?: string;
}

// resolveLink is a stub for now; it always returns linked = false.
//
// A real implementation would look up an active link based on orgId + deviceId
// and return link_id, user_ref when present.
export function resolveLink(_params: ResolveLinkParams): ResolveLinkResult {
  return {
    linked: false,
  };
}

