import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    console.log("=== Checkout API 开始 ===");
    const { userId } = await auth();

    if (!userId) {
      console.log("❌ 未登录用户尝试创建订阅");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ 用户 ID:", userId);

    const creemApiKey = process.env.CREEM_API_KEY;
    if (!creemApiKey) {
      console.error("❌ CREEM_API_KEY 环境变量未配置");
      return NextResponse.json(
        { error: "Creem API not configured" },
        { status: 500 }
      );
    }

    console.log("✅ Creem API Key 已配置，长度:", creemApiKey.length);

    // Get user info for email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    const userEmail = user?.email;
    console.log("✅ 用户邮箱:", userEmail);

    // Create checkout session via Creem API
    console.log("📡 调用 Creem API, product_id:", process.env.CREEM_PRODUCT_ID);
    console.log("📡 请求数据:", JSON.stringify({
      product_id: process.env.CREEM_PRODUCT_ID,
      user_id: userId,
      email: userEmail,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://platepilot-sigma.vercel.app"}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://platepilot-sigma.vercel.app"}/dashboard?canceled=true`,
    }, null, 2));

    const response = await fetch("https://test-api.creem.io/v1/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": creemApiKey,
      },
      body: JSON.stringify({
        product_id: process.env.CREEM_PRODUCT_ID,
        user_id: userId,
        email: userEmail,
        success_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://platepilot-sigma.vercel.app"}/dashboard?success=true`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://platepilot-sigma.vercel.app"}/dashboard?canceled=true`,
      }),
    });

    console.log("📥 Creem 响应状态:", response.status);

    const data = await response.json();
    console.log("📥 Creem 响应内容:", JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error("❌ Creem checkout 失败:", data);
      return NextResponse.json(
        { error: "Failed to create checkout session", details: data },
        { status: 500 }
      );
    }

    console.log("✅ Checkout session 创建成功, URL:", data.checkout_url);
    return NextResponse.json({ url: data.checkout_url });
  } catch (error) {
    console.error("❌ Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
