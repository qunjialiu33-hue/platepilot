import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function POST(req: NextRequest) {
  try {
    console.log("=== Checkout API 开始 ===");
    const { userId } = await auth();

    if (!userId) {
      console.log("❌ 未登录用户尝试创建订阅");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("✅ 用户 ID:", userId);

    // 从 Clerk 获取用户邮箱
    const clerkUser = await currentUser();
    const userEmail = clerkUser?.emailAddresses?.[0]?.emailAddress;

    if (!userEmail) {
      console.error("❌ 用户邮箱未找到");
      return NextResponse.json(
        { error: "用户邮箱未找到，请检查 Clerk 账户信息" },
        { status: 400 }
      );
    }

    console.log("✅ 用户邮箱 (from Clerk):", userEmail);

    const creemApiKey = process.env.CREEM_API_KEY;
    if (!creemApiKey) {
      console.error("❌ CREEM_API_KEY 环境变量未配置");
      return NextResponse.json(
        { error: "Creem API not configured" },
        { status: 500 }
      );
    }

    console.log("✅ Creem API Key 已配置");

    // 构建请求体
    const requestBody = {
      product_id: process.env.CREEM_PRODUCT_ID,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      customer: {
        email: userEmail,
      },
      metadata: {
        userId: userId,
      },
    };

    // Create checkout session via Creem API
    console.log("📡 调用 Creem API, product_id:", process.env.CREEM_PRODUCT_ID);
    console.log("📡 请求数据:", JSON.stringify(requestBody, null, 2));

    const response = await fetch("https://test-api.creem.io/v1/checkouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": creemApiKey,
      },
      body: JSON.stringify(requestBody),
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
