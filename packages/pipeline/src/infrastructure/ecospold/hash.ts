import { createHash } from "node:crypto";

export function sha256Hex(text: string): string {
  const digest = createHash("sha256").update(text.trim(), "utf8").digest("hex");
  return `sha256:${digest}`;
}
