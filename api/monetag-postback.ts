import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Supabase server configuration missing");
    return res.status(500).json({
      error: "Server configuration error",
    });
  }

  const {
    ymid,
    event_type,
    reward_event_type,
    estimated_price,
    zone_id,
    sub_zone_id,
    request_var,
    telegram_id,
  } = req.query;

  console.log("Monetag postback received:", {
    ymid,
    event_type,
    reward_event_type,
    estimated_price,
    zone_id,
    sub_zone_id,
    request_var,
    telegram_id,
  });

  if (!ymid || typeof ymid !== "string") {
    return res.status(400).json({
      error: "Missing ymid",
    });
  }

  if (zone_id && String(zone_id) !== "11741797") {
    return res.status(400).json({
      error: "Invalid zone",
    });
  }

  if (
    event_type &&
    event_type !== "impression" &&
    event_type !== "click"
  ) {
    return res.status(400).json({
      error: "Invalid event type",
    });
  }

if (
  reward_event_type &&
  reward_event_type !== "valued" &&
  reward_event_type !== "non_valued"
) {
    return res.status(400).json({
      error: "Invalid reward event type",
    });
  }

  const supabase = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
      },
    }
  );

  const { data: adEvent, error: lookupError } = await supabase
    .from("nexr_ad_events")
    .select(
      "id, user_id, tracking_id, status, completed_at, rewarded_at"
    )
    .eq("tracking_id", ymid)
    .maybeSingle();

  if (lookupError) {
    console.error("Ad event lookup failed:", lookupError);

    return res.status(500).json({
      error: "Database lookup failed",
    });
  }

  if (!adEvent) {
    console.warn("Unknown Monetag ymid:", ymid);

    return res.status(404).json({
      error: "Unknown ad event",
    });
  }

  /*
    Only a Monetag rewarded event is allowed
    to trigger an NXR reward.
  */
  if (reward_event_type === "valued") {
    /*
      Rewarded Interstitial should settle from the
      monetized impression, not from a click event.
    */
    if (event_type && event_type !== "impression") {
      console.log(
        "Ignoring rewarded click event for settlement:",
        ymid
      );

      return res.status(200).json({
        success: true,
        received: true,
        rewarded: false,
      });
    }

    /*
      The trusted Monetag postback is the server-side
      confirmation that the ad was completed.
      Mark the pending ad event completed before the
      settlement function checks its lifecycle state.
    */
    if (adEvent.completed_at === null) {
      const { data: completedEvent, error: completionError } =
        await supabase
          .from("nexr_ad_events")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", adEvent.id)
          .is("completed_at", null)
          .select(
            "id, user_id, tracking_id, status, completed_at, rewarded_at"
          )
          .maybeSingle();

      if (completionError) {
        console.error(
          "Ad event completion failed:",
          completionError
        );

        return res.status(500).json({
          error: "Ad event completion failed",
        });
      }

      if (!completedEvent) {
        console.log(
          "Ad event was completed by another postback:",
          ymid
        );
      }
    }

    /*
      TESTNET REWARD
      25 NXR is temporary and will later be replaced
      by the revenue-backed reward calculation.
    */
    const testnetReward = 25;

    const { data: settlement, error: settlementError } =
      await supabase.rpc("settle_nxr_ad_reward", {
        p_event_id: adEvent.id,
        p_provider_event_id: ymid,
        p_reward_amount: testnetReward,
      });

    if (settlementError) {
      console.error(
        "NXR reward settlement failed:",
        settlementError
      );

      return res.status(500).json({
        error: "Reward settlement failed",
      });
    }

    console.log("NXR reward settlement result:", settlement);

    return res.status(200).json({
      success: true,
      received: true,
      rewarded: true,
      settlement,
    });
  }

  /*
    Monetag says the event was not paid.
    No NXR reward is created.
  */
  return res.status(200).json({
    success: true,
    received: true,
    rewarded: false,
  });
}