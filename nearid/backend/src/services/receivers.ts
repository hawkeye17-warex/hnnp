export interface ReceiverRecord {
  orgId: string;
  receiverId: string;
  receiverSecret: string;
}

/**
 * Receiver registry and lookup.
 *
 * For now, this is backed by environment variables and supports a single
 * configured receiver:
 *
 *   RECEIVER_ORG_ID
 *   RECEIVER_ID
 *   RECEIVER_SECRET
 *
 * A real implementation would use a database table (see protocol/spec.md,
 * "receivers" data model) to store many receivers.
 */
export function getReceiverSecret(orgId: string, receiverId: string): string | null {
  const envOrgId = process.env.RECEIVER_ORG_ID;
  const envReceiverId = process.env.RECEIVER_ID;
  const envReceiverSecret = process.env.RECEIVER_SECRET;

  if (!envOrgId || !envReceiverId || !envReceiverSecret) {
    return null;
  }

  if (envOrgId !== orgId || envReceiverId !== receiverId) {
    return null;
  }

  return envReceiverSecret;
}

