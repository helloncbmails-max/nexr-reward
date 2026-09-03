import type { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const telegram_id = Number(body.telegram_id);
    const username = body.username || null;
    const first_name = body.first_name || null;

    if (!telegram_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "telegram_id is required" })
      };
    }

    // Create the Nexr user if they don't already exist
    const { data: user, error: userError } = await supabase
      .from("nexr_users")
      .upsert(
        {
          telegram_id,
          username,
          first_name
        },
        {
          onConflict: "telegram_id"
        }
      )
      .select()
      .single();

    if (userError) {
      console.error(userError);

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Could not create or update Nexr user"
        })
      };
    }

    // Create the user's balance if it doesn't already exist
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
      console.error(balanceError);

      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Could not create Nexr balance"
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        user,
        balance
      })
    };
  } catch (error) {
    console.error(error);

    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Server error"
      })
    };
  }
};