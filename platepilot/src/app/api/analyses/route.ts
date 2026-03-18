import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { mealAudits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's analysis history
    const analyses = await db
      .select()
      .from(mealAudits)
      .where(eq(mealAudits.userId, userId))
      .orderBy(desc(mealAudits.createdAt))
      .limit(50);

    return NextResponse.json(analyses);
  } catch (error) {
    console.error("Analyses fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analyses" },
      { status: 500 }
    );
  }
}
