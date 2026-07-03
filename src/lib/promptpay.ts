import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

export async function generatePromptPayQr(
  promptPayId: string,
  amount: number
): Promise<string> {
  const payload = generatePayload(promptPayId, { amount });
  return QRCode.toDataURL(payload, { margin: 1, width: 320 });
}
