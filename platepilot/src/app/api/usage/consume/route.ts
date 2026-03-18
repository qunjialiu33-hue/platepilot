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

    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    // If user doesn't exist in database, create them
    if (!user) {
      await db.insert(users).values({
        id: userId,
        email: "",
        isPro: false,
        usageCount: 0,
        usageResetDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId));
    }

    const newUsageCount = (user?.usageCount || 0) + 1;

    await db
      .update(users)
      .set({ usageCount: newUsageCount })
      .where(eq(users.id, userId));

    return NextResponse.json({ usageCount: newUsageCount });
  } catch (error) {
    console.error("Usage consume error:", error);
    return NextResponse.json(
      { error: "Failed to consume usage" },
      { status: 500 }
    );
  }
}
