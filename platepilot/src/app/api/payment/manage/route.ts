import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user info from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has an active subscription
    if (!user.isPro) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 404 }
      );
    }

    const creemApiKey = process.env.CREEM_API_KEY;
    if (!creemApiKey) {
      return NextResponse.json(
        { error: "Creem API not configured" },
        { status: 500 }
      );
    }

    // Call Creem API to create customer portal session
    // According to Creem docs: POST https://api.creem.io/v1/customers/billing
    const isTestMode = creemApiKey.includes("test");
    const baseUrl = isTestMode ? "https://test-api.creem.io" : "https://api.creem.io";

    const response = await fetch(
      `${baseUrl}/v1/customers/billing`,
      {
        method: "POST",
        headers: {
          "x-api-key": creemApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_id: userId,
          // Optional: Add return_url if you want to redirect back to your app
          return_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard`,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Creem portal error:", data);
      return NextResponse.json(
        { error: "Failed to get portal URL", details: data },
        { status: response.status }
      );
    }

    // Creem returns { url: "https://..." }
    return NextResponse.json({ url: data.url });
  } catch (error) {
    console.error("Payment manage error:", error);
    return NextResponse.json(
      { error: "Failed to get management URL" },
      { status: 500 }
    );
  }
}
