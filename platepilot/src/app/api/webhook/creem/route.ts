import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    // Get raw body as text for signature verification
    const rawBody = await req.text();

    // Log the complete webhook body for debugging
    console.log("=== Creem Webhook 接收 ===");
    console.log("Raw body:", rawBody);

    // Verify the webhook signature using HMAC-SHA256
    const webhookSecret = process.env.CREEM_WEBHOOK_SECRET;
    const signature = req.headers.get("creem-signature");

    if (webhookSecret) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      console.log("🔐 签名验证:");
      console.log("  - 收到的签名:", signature);
      console.log("  - 期望的签名:", expectedSignature);

      if (signature !== expectedSignature) {
        console.error("❌ Invalid webhook signature");
        return NextResponse.json(
          { error: "Invalid signature" },
          { status: 401 }
        );
      }

      console.log("✅ 签名验证通过");
    } else {
      console.warn("⚠️ CREEM_WEBHOOK_SECRET 未配置，跳过签名验证");
    }

    // Parse JSON after signature verification
    const body = JSON.parse(rawBody);
    console.log("📦 Webhook Body:", JSON.stringify(body, null, 2));

    // Handle different event types
    const eventType = body.event;
    console.log("📌 事件类型:", eventType);
    console.log("收到webhook事件:", eventType, JSON.stringify(body));

    switch (eventType) {
      case "checkout.completed": {
        const userId = body.user_id || body.metadata?.userId;

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

      case "subscription.canceled": {
        const userId = body.user_id;

        if (userId) {
          await db
            .update(users)
            .set({ isPro: false, updatedAt: new Date() })
            .where(eq(users.id, userId));

          console.log(`✅ User ${userId} subscription canceled`);
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled Creem event: ${eventType}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
