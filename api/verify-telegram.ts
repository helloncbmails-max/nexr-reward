import crypto from "crypto";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { initData } = req.body;

    if (!initData) {
      return res.status(400).json({
        error: "Missing Telegram authentication data"
      });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      console.error("Telegram bot token is not configured");

      return res.status(500).json({
        error: "Server configuration error"
      });
    }

    const params = new URLSearchParams(initData);
    const receivedHash = params.get("hash");

    if (!receivedHash) {
      return res.status(400).json({
        error: "Invalid Telegram authentication data"
      });
    }

    params.delete("hash");

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(calculatedHash),
        Buffer.from(receivedHash)
      )
    ) {
      return res.status(401).json({
        error: "Telegram authentication failed"
      });
    }

    const userData = params.get("user");

    if (!userData) {
      return res.status(400).json({
        error: "Telegram user data missing"
      });
    }

    const user = JSON.parse(userData);

    return res.status(200).json({
      verified: true,
      user: {
        telegram_id: user.id,
        username: user.username || null,
        first_name: user.first_name || null
      }
    });
  } catch (error) {
    console.error("Telegram verification error:", error);

    return res.status(500).json({
      error: "Authentication verification failed"
    });
  }
}