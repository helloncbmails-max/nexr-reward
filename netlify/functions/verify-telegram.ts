import crypto from "crypto";

export default async (request: Request) => {
  // Only allow POST requests
  if (request.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  try {
    const { initData } = await request.json();

    if (!initData) {
      return new Response(
        JSON.stringify({ error: "Missing Telegram authentication data" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      console.error("Telegram bot token is not configured");

      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Parse Telegram Mini App authentication data
    const params = new URLSearchParams(initData);
    const receivedHash = params.get("hash");

    if (!receivedHash) {
      return new Response(
        JSON.stringify({ error: "Invalid Telegram authentication data" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    params.delete("hash");

    // Create the data check string
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");

    // Create Telegram WebApp verification secret
    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    // Calculate expected hash
    const calculatedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    // Compare hashes securely
    if (
      !crypto.timingSafeEqual(
        Buffer.from(calculatedHash),
        Buffer.from(receivedHash)
      )
    ) {
      return new Response(
        JSON.stringify({ error: "Telegram authentication failed" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // Extract the authenticated Telegram user
    const userData = params.get("user");

    if (!userData) {
      return new Response(
        JSON.stringify({ error: "Telegram user data missing" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    const user = JSON.parse(userData);

    // Return only verified user information
    return new Response(
      JSON.stringify({
        verified: true,
        user: {
          telegram_id: user.id,
          username: user.username || null,
          first_name: user.first_name || null
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error) {
    console.error("Telegram verification error:", error);

    return new Response(
      JSON.stringify({
        error: "Authentication verification failed"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
};