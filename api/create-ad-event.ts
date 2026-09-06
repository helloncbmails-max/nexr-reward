 
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

  // Reject authentication data older than 24 hours.
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
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!botToken || !supabaseUrl || !serviceRoleKey) {
      console.error("Missing server configuration");

      return res.status(500).json({
        error: "Server configuration error"
      });
    }

    // 🔐 Verify the signed Telegram identity
    const telegramUser = verifyTelegramInitData(
      initData,
      botToken
    );

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    // Find the verified Nexr user
    const { data: user, error: userError } = await supabase
      .from("nexr_users")
      .select("id")
      .eq("telegram_id", Number(telegramUser.id))
      .single();

    if (userError || !user) {
      return res.status(404).json({
        error: "Nexr user not found"
      });
    }

    // Create a pending advertising event
    const { data: adEvent, error: eventError } = await supabase
      .from("nexr_ad_events")
      .insert({
        user_id: user.id,
        zone_id: "11741797",
        status: "pending"
      })
      .select("tracking_id")
      .single();

    if (eventError || !adEvent) {
      console.error("Ad event creation error:", eventError);

      return res.status(500).json({
        error: "Could not create advertising event"
      });
    }

    return res.status(200).json({
      success: true,
      tracking_id: adEvent.tracking_id
    });

  } catch (error) {
    console.error("Create ad event error:", error);

    return res.status(401).json({
      error:
        error instanceof Error
          ? error.message
          : "Authentication failed"
    });
  }
}