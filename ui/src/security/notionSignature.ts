import crypto from "crypto";

export function verifyNotionSignature(
  rawBody: string,
  signature?: string,
): boolean {
  if (!signature) return false;

  const secret = process.env.NOTION_WEBHOOK_SECRET;
  if (!secret) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}
