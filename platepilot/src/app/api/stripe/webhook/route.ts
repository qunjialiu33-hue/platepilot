import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_dummy");

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "whsec_dummy";

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature")!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (userId) {
          await db
            .update(users)
            .set({
              isPro: true,
              stripeSubscriptionId: session.subscription as string,
            })
            .where(eq(users.id, userId));

          console.log(`User ${userId} upgraded to Pro`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by stripe customer ID
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.stripeCustomerId, customerId));

        if (user) {
          await db
            .update(users)
            .set({
              isPro: false,
              stripeSubscriptionId: null,
            })
            .where(eq(users.id, user.id));

          console.log(`User ${user.id} subscription canceled`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Find user by stripe customer ID
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.stripeCustomerId, customerId));

        if (user) {
          const isActive = subscription.status === "active";
          await db
            .update(users)
            .set({
              isPro: isActive,
            })
            .where(eq(users.id, user.id));

          console.log(`User ${user.id} subscription updated: ${subscription.status}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
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
