import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, mealAudits } from "@/db/schema";
import { eq } from "drizzle-orm";

const FREE_MONTHLY_LIMIT = 3;

const MODEL = "claude-sonnet-4-20250514";

function getOpenRouterClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
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
  actionTokens: string;
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
  console.log("✅ API /api/analyze 被调用了");

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      console.error("❌ OPENROUTER_API_KEY 不存在或为空!");
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    console.log("✅ OPENROUTER_API_KEY 存在:", apiKey.substring(0, 20) + "...");

    // Get user authentication using Clerk
    const { userId } = await auth();

    // Check usage limits for non-Pro users
    if (userId) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (user) {
        const now = new Date();
        const resetDate = new Date(user.usageResetDate);

        // Reset usage if more than 1 month has passed
        if (now.getTime() - resetDate.getTime() > 30 * 24 * 60 * 60 * 1000) {
          await db
            .update(users)
            .set({
              usageCount: 0,
              usageResetDate: now,
            })
            .where(eq(users.id, userId));
          user.usageCount = 0;
        }

        // Check if Pro user
        if (!user.isPro) {
          // Check usage limit
          if ((user.usageCount || 0) >= FREE_MONTHLY_LIMIT) {
            return NextResponse.json(
              {
                error: "Monthly limit reached",
                upgradeRequired: true,
                remaining: 0,
              },
              { status: 403 }
            );
          }
        }
      }
    }

    const body = await req.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 }
      );
    }

    // Ensure image has proper data URL prefix
    const imageData = image.startsWith("data:")
      ? image
      : `data:image/jpeg;base64,${image}`;

    console.log("📡 正在调用 OpenRouter API...");
    console.log("📡 使用模型:", MODEL);

    const client = getOpenRouterClient();
    let response;

    try {
      response = await client.chat.completions.create({
        model: MODEL,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: imageData,
                },
              },
            ],
          },
        ],
        max_tokens: 1024,
        temperature: 0.7,
      });

      console.log("✅ OpenRouter API 调用成功!");
      console.log("📦 原始响应:", JSON.stringify(response));

    } catch (apiError: any) {
      console.error("❌ OpenRouter API 调用失败:", apiError?.message || apiError);
      console.error("❌ 错误详情:", JSON.stringify(apiError?.response?.data || apiError));
      return NextResponse.json(
        { error: "OpenRouter API failed", details: apiError?.message || String(apiError) },
        { status: 500 }
      );
    }

    const content = response.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No analysis result returned" },
        { status: 500 }
      );
    }

    // Parse JSON from the response
    let analysisResult: AnalysisResponse;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        analysisResult = JSON.parse(content);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return NextResponse.json(
        { error: "Failed to parse analysis result" },
        { status: 500 }
      );
    }

    // Validate the response structure
    if (
      typeof analysisResult.score !== "number" ||
      !analysisResult.headline ||
      !Array.isArray(analysisResult.items) ||
      !analysisResult.actionTokens
    ) {
      console.error("Invalid response structure:", analysisResult);
      return NextResponse.json(
        { error: "Invalid response structure from AI" },
        { status: 500 }
      );
    }

    // Save to database if user is logged in (Clerk userId)
    if (userId) {
      await db.insert(mealAudits).values({
        userId: userId,
        score: analysisResult.score,
        resultJson: {
          headline: analysisResult.headline,
          items: analysisResult.items,
          actionTokens: analysisResult.actionTokens,
        },
      });

      // Increment usage count for non-Pro users
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));

      if (user && !user.isPro) {
        await db
          .update(users)
          .set({
            usageCount: (user.usageCount || 0) + 1,
          })
          .where(eq(users.id, userId));
      }
    }

    return NextResponse.json(analysisResult);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
