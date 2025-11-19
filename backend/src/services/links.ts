export interface LinkRecord {
  linkId: string;
  orgId: string;
  deviceId: string;
  userRef: string;
  createdAt: number;
  revokedAt?: number | null;
}

export interface ResolveLinkParams {
  orgId: string;
  deviceId: string | null;
}

export interface ResolveLinkResult {
  linked: boolean;
  linkId?: string;
  userRef?: string;
}

const links: LinkRecord[] = [];

export function createLink(params: { orgId: string; deviceId: string; userRef: string }): LinkRecord {
  const linkId = `link_${links.length + 1}`;
  const record: LinkRecord = {
    linkId,
    orgId: params.orgId,
    deviceId: params.deviceId,
    userRef: params.userRef,
    createdAt: Date.now(),
    revokedAt: null,
  };
  links.push(record);
  return record;
}

export function revokeLink(params: { orgId: string; linkId: string }): LinkRecord | null {
  const link = links.find((l) => l.linkId === params.linkId && l.orgId === params.orgId && !l.revokedAt);
  if (!link) {
    return null;
  }
  link.revokedAt = Date.now();
  return link;
}

// resolveLink looks up an active link for (orgId, deviceId), ignoring revoked links.
export function resolveLink(params: ResolveLinkParams): ResolveLinkResult {
  const { orgId, deviceId } = params;
  if (!deviceId) {
    return { linked: false };
  }

  const link = links.find((l) => l.orgId === orgId && l.deviceId === deviceId && !l.revokedAt);
  if (!link) {
    return { linked: false };
  }

  return {
    linked: true,
    linkId: link.linkId,
    userRef: link.userRef,
  };
}

export function listLinks(): LinkRecord[] {
  return links.slice();
}
