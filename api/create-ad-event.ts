import { createClient } from "@supabase/supabase-js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    const { telegram_id } = req.body;

    if (!telegram_id) {
      return res.status(400).json({
        error: "telegram_id is required"
      });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase server configuration");

      return res.status(500).json({
        error: "Server configuration error"
      });
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey
    );

    const { data: user, error: userError } = await supabase
      .from("nexr_users")
      .select("id")
      .eq("telegram_id", Number(telegram_id))
      .single();

    if (userError || !user) {
      return res.status(404).json({
        error: "Nexr user not found"
      });
    }

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
      console.error("Ad event error:", eventError);

      return res.status(500).json({
        error: "Could not create ad event"
      });
    }

    return res.status(200).json({
      success: true,
      tracking_id: adEvent.tracking_id
    });

  } catch (error) {
    console.error("Create ad event error:", error);

    return res.status(500).json({
      error: "Server error"
    });
  }
}