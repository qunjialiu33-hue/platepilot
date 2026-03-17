import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Verify the webhook signature (optional, recommended for production)
    const webhookSecret = process.env.CREEM_WEBHOOK_SECRET;
    const signature = req.headers.get("x-signature");

    if (webhookSecret && signature !== webhookSecret) {
      console.error("Invalid webhook signature");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }

    // Handle different event types
    const eventType = body.event;

    switch (eventType) {
      case "payment_completed":
      case "subscription_created": {
        const userId = body.user_id;

        if (userId) {
          await db
            .update(users)
            .set({ isPro: true })
            .where(eq(users.id, userId));

          console.log(`User ${userId} upgraded to Pro via Creem`);
        }
        break;
      }

      case "subscription_cancelled":
      case "subscription_expired": {
        const userId = body.user_id;

        if (userId) {
          await db
            .update(users)
            .set({ isPro: false })
            .where(eq(users.id, userId));

          console.log(`User ${userId} subscription cancelled`);
        }
        break;
      }

      default:
        console.log(`Unhandled Creem event: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
