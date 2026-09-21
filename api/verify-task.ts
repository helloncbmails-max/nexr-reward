import crypto from "crypto";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { initData, task_id } = req.body;

    if (!initData || !task_id) {
      return res.status(400).json({
        error: "Missing authentication data or task ID",
      });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!botToken || !supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        error: "Server configuration error",
      });
    }

    // Verify Telegram Mini App initData
    const params = new URLSearchParams(initData);
    const receivedHash = params.get("hash");

    if (!receivedHash) {
      return res.status(401).json({
        error: "Invalid Telegram authentication data",
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

    const expectedBuffer = Buffer.from(calculatedHash, "hex");
    const receivedBuffer = Buffer.from(receivedHash, "hex");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return res.status(401).json({
        error: "Telegram authentication failed",
      });
    }

    const userData = params.get("user");

    if (!userData) {
      return res.status(400).json({
        error: "Telegram user data missing",
      });
    }

    const telegramUser = JSON.parse(userData);
    const telegramId = telegramUser.id;

    // Find Nexr user
    const userResponse = await fetch(
      `${supabaseUrl}/rest/v1/nexr_users?telegram_id=eq.${telegramId}&select=id`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    const users = await userResponse.json();

    if (!userResponse.ok || !users.length) {
      return res.status(404).json({
        error: "Nexr user not found",
      });
    }

    const userId = users[0].id;

    // Confirm the campaign exists and is active
    const taskResponse = await fetch(
      `${supabaseUrl}/rest/v1/tasks?id=eq.${task_id}&status=eq.active&select=id,title,reward`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    const tasks = await taskResponse.json();

    if (!taskResponse.ok || !tasks.length) {
      return res.status(404).json({
        error: "Active campaign not found",
      });
    }

    // Find pending completion
    const completionResponse = await fetch(
      `${supabaseUrl}/rest/v1/task_completions?user_id=eq.${userId}&task_id=eq.${task_id}&select=id,status`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      }
    );

    const completions = await completionResponse.json();

    if (!completionResponse.ok || !completions.length) {
      return res.status(404).json({
        error: "Task completion not found",
      });
    }

    const completion = completions[0];

    if (completion.status === "approved") {
      return res.status(200).json({
        success: true,
        status: "approved",
        message: "Task already verified.",
      });
    }

    // Check Telegram membership
    const telegramResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=@nexronboarding&user_id=${telegramId}`
    );

    const telegramData = await telegramResponse.json();

    if (!telegramResponse.ok || !telegramData.ok) {
      console.error("Telegram membership check failed:", telegramData);

      return res.status(502).json({
        error: "Unable to verify Telegram membership",
      });
    }

    const memberStatus = telegramData.result?.status;

    const isMember = [
      "creator",
      "administrator",
      "member",
    ].includes(memberStatus);

    if (!isMember) {
      return res.status(200).json({
        success: false,
        status: "pending",
        message: "Please join the NEXR community first.",
      });
    }

    // Approve the completion
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/task_completions?id=eq.${completion.id}`,
      {
        method: "PATCH",
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({
          status: "approved",
        }),
      }
    );

    const updated = await updateResponse.json();

    if (!updateResponse.ok) {
      console.error("Completion update failed:", updated);

      return res.status(500).json({
        error: "Unable to approve task completion",
      });
    }

    return res.status(200).json({
      success: true,
      status: "approved",
      message: "Campaign completed and verified.",
      completion: updated[0],
    });
  } catch (error) {
    console.error("Task verification error:", error);

    return res.status(500).json({
      error: "Task verification failed",
    });
  }
}