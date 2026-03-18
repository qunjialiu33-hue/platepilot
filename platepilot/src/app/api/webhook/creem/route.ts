import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Log the complete webhook body for debugging
    console.log("=== Creem Webhook 完整 Body ===");
    console.log(JSON.stringify(body, null, 2));
    console.log("==============================");

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

        // Try to get subscription_id from different possible locations
        const subscriptionId =
          body.subscription_id ||
          body.data?.subscription_id ||
          body.subscriptionId ||
          body.data?.subscriptionId ||
          null;

        console.log("🔍 Extracting subscription_id from Creem webhook:");
        console.log("  - body.subscription_id:", body.subscription_id);
        console.log("  - body.data?.subscription_id:", body.data?.subscription_id);
        console.log("  - body.subscriptionId:", body.subscriptionId);
        console.log("  - body.data?.subscriptionId:", body.data?.subscriptionId);
        console.log("  - Final subscriptionId:", subscriptionId);

        if (userId) {
          const updateData: {
            isPro: boolean;
            stripeSubscriptionId?: string | null;
            updatedAt: Date;
          } = {
            isPro: true,
            updatedAt: new Date(),
          };

          if (subscriptionId) {
            updateData.stripeSubscriptionId = subscriptionId;
            console.log(`✅ Saving subscription ID: ${subscriptionId} for user ${userId}`);
          } else {
            console.warn(`⚠️ No subscription_id found in webhook for user ${userId}`);
          }

          await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, userId));

          console.log(`✅ User ${userId} upgraded to Pro via Creem`);
        } else {
          console.error("❌ Missing user_id in webhook body");
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
