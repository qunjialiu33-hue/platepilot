import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { mealAudits } from "@/db/schema";

const MODEL = "anthropic/claude-sonnet-4.5";

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

    const client = getOpenRouterClient();
    const response = await client.chat.completions.create({
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
