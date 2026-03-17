import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, mealAudits } from "@/db/schema";
import { eq } from "drizzle-orm";

const FREE_MONTHLY_LIMIT = 3;

// ✅ 修正：使用 OpenRouter 识别的真实模型 ID
const MODEL = "claude-3.5-sonnet";

function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
    defaultHeaders: {
      // ✅ 修正：线上环境使用真实域名
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "PlatePilot",
    },
  });
}

interface FoodItem {
  name: string;
  status: "good" | "warning" | "bad";
  instruction: string;
}

interface AnalysisResponse {
  score: number;
  headline: string;
  items: FoodItem[];
  actionTokens: string[];
}

const SYSTEM_PROMPT = `You are PlatePilot, a sharp and direct meal auditor. Analyze this plate photo.

CRITICAL RULES:
- NO grams (g), NO calories (kcal), NO "moderate amounts"
- ONLY use visual measurements: "one fist", "one palm", "thumb-sized"
- Output ONLY English
- Be sharp and witty like a fitness-obsessed friend

Output strict JSON:
{
  "score": 0-100,
  "headline": "Sharp one-liner in English",
  "items": [{"name": "Rice", "status": "warning/bad/good", "instruction": "Remove 1/3 (about 3 spoonfuls)"}],
  "actionTokens": ["Remove 1/3 rice", "Add fist-sized broccoli"]
}

Based on 2026 Dietary Guidelines. No medical advice.`;

export async function POST(req: NextRequest) {
  console.log("✅ API /api/analyze 开始处理请求");

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("❌ OPENROUTER_API_KEY 缺失!");
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const { userId } = await auth();

    // 1. 处理用户额度和数据库逻辑（暂时跳过订阅检查）
    // if (userId) {
    //   try {
    //     const [user] = await db.select().from(users).where(eq(users.id, userId));
    //     if (user) {
    //       const now = new Date();
    //       const resetDate = new Date(user.usageResetDate || now);
    //       if (now.getTime() - resetDate.getTime() > 30 * 24 * 60 * 60 * 1000) {
    //         await db.update(users).set({ usageCount: 0, usageResetDate: now }).where(eq(users.id, userId));
    //       }
    //       if (!user.isPro && (user.usageCount || 0) >= FREE_MONTHLY_LIMIT) {
    //         return NextResponse.json({ error: "Monthly limit reached", upgradeRequired: true }, { status: 403 });
    //       }
    //     }
    //   } catch (err) {
    //     console.error("User query error:", err);
    //   }
    // }

    const body = await req.json();
    const { image } = body;
    if (!image) return NextResponse.json({ error: "Image data is required" }, { status: 400 });

    const imageData = image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`;

    // 2. 调用 AI
    console.log("📡 正在调用 OpenRouter, 模型:", MODEL);
    const client = getOpenRouterClient();
    
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: [{ type: "image_url", image_url: { url: imageData } }] },
      ],
      max_tokens: 1024,
      temperature: 0.7,
      response_format: { type: "json_object" } // 强制要求 JSON
    });

    const content = response.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI returned empty content");

    const analysisResult = JSON.parse(content) as AnalysisResponse;

    // 3. 保存记录并增加使用次数
    console.log("🔍 DEBUG - userId:", userId);
    console.log("🔍 DEBUG - insert data:", {
      userId,
      imageUrl: imageData,
      score: analysisResult.score,
      resultJson: analysisResult,
    });

    if (userId) {
      try {
        await db.insert(mealAudits).values({
          userId,
          imageUrl: imageData,
          score: analysisResult.score,
          resultJson: analysisResult,
        });
        console.log("✅ meal_audits insert success");
      } catch (err) {
        console.error("❌ meal_audits insert error:", err);
      }

      try {
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (user && !user.isPro) {
          await db.update(users).set({ usageCount: (user.usageCount || 0) + 1 }).where(eq(users.id, userId));
        }
      } catch (err) {
        console.error("Usage count update error:", err);
      }
    }

    return NextResponse.json(analysisResult);

  } catch (error: any) {
    console.error("❌ 分析流程出错:", error.message || error);
    return NextResponse.json(
      { error: "Analysis failed", details: error.message || String(error) },
      { status: 500 }
    );
  }
}