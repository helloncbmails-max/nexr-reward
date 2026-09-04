import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { telegram_id, username, first_name } = req.body;

    if (!telegram_id) {
      return res.status(400).json({
        error: "telegram_id is required"
      });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: user, error: userError } = await supabase
      .from("nexr_users")
      .upsert(
        {
          telegram_id: Number(telegram_id),
          username: username || null,
          first_name: first_name || null
        },
        {
          onConflict: "telegram_id"
        }
      )
      .select()
      .single();

    if (userError) {
      console.error("Nexr user error:", userError);

      return res.status(500).json({
        error: "Could not create or update Nexr user"
      });
    }

const { data: balance, error: balanceError } = await supabase
      .from("nexr_balances")
      .upsert(
        {
          user_id: user.id
        },
        {
          onConflict: "user_id"
        }
      )
      .select()
      .single();

    if (balanceError) {
      console.error("Nexr balance error:", balanceError);

      return res.status(500).json({
        error: "Could not create Nexr balance"
      });
    }

    return res.status(200).json({
      success: true,
      user,
      balance
    });
  } catch (error) {
    console.error("Sync error:", error);

    return res.status(500).json({
      error: "Server error"
    });
  }
}