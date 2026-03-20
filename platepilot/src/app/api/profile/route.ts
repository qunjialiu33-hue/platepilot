import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// GET - 获取用户个人数据
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    return NextResponse.json({
      age: user.age,
      gender: user.gender,
      height: user.height,
      weight: user.weight,
      targetWeight: user.targetWeight,
      activityLevel: user.activityLevel,
      dietaryRestrictions: user.dietaryRestrictions,
      fitnessGoal: user.fitnessGoal,
      isPro: user.isPro,
      usageCount: user.usageCount,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

// POST - 保存用户个人数据
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { age, gender, height, weight, targetWeight, activityLevel, dietaryRestrictions, fitnessGoal } = body;

    await db.update(users).set({
      age: age || null,
      gender: gender || null,
      height: height || null,
      weight: weight || null,
      targetWeight: targetWeight || null,
      activityLevel: activityLevel || null,
      dietaryRestrictions: dietaryRestrictions || null,
      fitnessGoal: fitnessGoal || null,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
