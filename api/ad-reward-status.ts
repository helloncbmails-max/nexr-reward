import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function verifyTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");

  if (!receivedHash) {
    throw new Error("Invalid Telegram authentication data");
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

  const expectedBuffer = Buffer.from(calculatedHash, "hex");
  const receivedBuffer = Buffer.from(receivedHash, "hex");

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new Error("Telegram authentication failed");
  }

  const authDate = Number(params.get("auth_date"));

  if (!authDate) {
    throw new Error("Telegram authentication date missing");
  }

  const now = Math.floor(Date.now() / 1000);
  const age = now - authDate;

  if (age < -60 || age > 86400) {
    throw new Error("Telegram authentication data expired");
  }

  const userData = params.get("user");

  if (!userData) {
    throw new Error("Telegram user data missing");
  }

  return JSON.parse(userData);
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { initData, tracking_id } = req.body;

    if (!initData) {
      return res.status(400).json({
        error: "Missing Telegram authentication data",
      });
    }

    if (!tracking_id || typeof tracking_id !== "string") {
      return res.status(400).json({
        error: "Missing ad tracking ID",
      });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!botToken || !supabaseUrl || !serviceRoleKey) {
      console.error("Missing server configuration");

      return res.status(500).json({
        error: "Server configuration error",
      });
    }

    const telegramUser = verifyTelegramInitData(
      initData,
      botToken
    );

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    const { data: user, error: userError } = await supabase
      .from("nexr_users")
      .select("id")
      .eq("telegram_id", Number(telegramUser.id))
      .single();

    if (userError || !user) {
      console.error("Nexr user lookup error:", userError);

      return res.status(404).json({
        error: "Nexr user not found",
      });
    }

    const { data: adEvent, error: adError } = await supabase
      .from("nexr_ad_events")
      .select(
        "id, user_id, tracking_id, status, rewarded_at"
      )
      .eq("tracking_id", tracking_id)
      .eq("user_id", user.id)
      .single();

    if (adError || !adEvent) {
      console.error("Ad event lookup error:", adError);

      return res.status(404).json({
        error: "Ad event not found",
      });
    }

    if (adEvent.rewarded_at) {
      return res.status(200).json({
        success: true,
        status: "approved",
        reward: 25,
      });
    }

    if (adEvent.status === "completed") {
      return res.status(200).json({
        success: true,
        status: "processing",
        reward: 25,
      });
    }

    return res.status(200).json({
      success: true,
      status: "pending",
      reward: 25,
    });
  } catch (error) {
    console.error("Ad reward status error:", error);

    return res.status(401).json({
      error:
        error instanceof Error
          ? error.message
          : "Authentication failed",
    });
  }
}