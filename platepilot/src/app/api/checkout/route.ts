import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const creemApiKey = process.env.CREEM_API_KEY;
    if (!creemApiKey) {
      return NextResponse.json(
        { error: "Creem API not configured" },
        { status: 500 }
      );
    }

    // Get user info for email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    const userEmail = user?.email;

    // Create checkout session via Creem API
    const response = await fetch("https://api.creem.io/v1/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: creemApiKey,
      },
      body: JSON.stringify({
        price_id: process.env.CREEM_PRICE_ID,
        user_id: userId,
        email: userEmail,
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?canceled=true`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Creem checkout error:", data);
      return NextResponse.json(
        { error: "Failed to create checkout session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: data.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
