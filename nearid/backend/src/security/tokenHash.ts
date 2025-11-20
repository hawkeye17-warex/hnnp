import * as crypto from "crypto";

export function computeTokenHash(fullToken: string): string {
  return crypto.createHash("sha256").update(fullToken, "utf8").digest("hex");
}

