import crypto from "crypto";

export const verifyClickUpSignature = (
  rawBody: string,
  signature?: string,
): boolean => {
  const secret = process.env.CLICKUP_WEBHOOK_SECRET;
  if (!signature || !secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
};
