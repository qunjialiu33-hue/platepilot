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

    const body = await req.json();
    const localCount = body.localCount || 0;

    let [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    // If user doesn't exist, create them with the local count
    if (!user) {
      await db.insert(users).values({
        id: userId,
        email: "",
        isPro: false,
        usageCount: localCount,
        usageResetDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json({ usageCount: localCount });
    }

    const serverCount = user.usageCount || 0;
    const finalCount = Math.max(localCount, serverCount);

    await db
      .update(users)
      .set({ usageCount: finalCount })
      .where(eq(users.id, userId));

    return NextResponse.json({ usageCount: finalCount });
  } catch (error) {
    console.error("Usage sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync usage" },
      { status: 500 }
    );
  }
}
