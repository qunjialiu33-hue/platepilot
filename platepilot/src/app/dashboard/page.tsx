import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { mealAudits } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get user's analysis history using Clerk userId
  const analyses = await db
    .select()
    .from(mealAudits)
    .where(eq(mealAudits.userId, userId))
    .orderBy(desc(mealAudits.createdAt))
    .limit(50);

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Your Meal History</h1>
          <Link
            href="/"
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Back to Home
          </Link>
        </div>

        {analyses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No analyses yet</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800"
            >
              Analyze Your First Meal
            </Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {analyses.map((analysis) => (
              <div
                key={analysis.id}
                className="p-6 bg-white rounded-lg shadow-sm border"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`text-2xl font-bold ${
                          analysis.score !== null
                            ? analysis.score >= 80
                              ? "text-green-600"
                              : analysis.score >= 60
                              ? "text-yellow-600"
                              : "text-red-600"
                            : "text-gray-600"
                        }`}
                      >
                        {analysis.score ?? "N/A"}
                      </span>
                      <span className="text-gray-500">
                        {new Date(analysis.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </span>
                    </div>
                    <h3 className="text-lg font-medium">
                      {typeof analysis.resultJson === "object" &&
                      analysis.resultJson !== null &&
                      "headline" in analysis.resultJson
                        ? (analysis.resultJson as { headline: string }).headline
                        : "Analysis"}
                    </h3>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
