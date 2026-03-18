"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Loader2, Settings, CheckCircle, Sparkles } from "lucide-react";
import Link from "next/link";

interface Analysis {
  id: string;
  userId: string;
  imageUrl: string | null;
  score: number | null;
  resultJson: unknown;
  createdAt: Date;
}

interface UserData {
  isPro: boolean;
  usageCount: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useUser();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isManaging, setIsManaging] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchDashboardData();
    }
  }, [isLoaded, isSignedIn]);

  // 检测支付成功并刷新状态
  useEffect(() => {
    const success = searchParams.get("success");
    if (success === "true") {
      console.log("✅ 支付成功，刷新页面数据");
      setShowSuccessMessage(true);

      // 立即使用 router.refresh() 刷新页面数据
      router.refresh();

      // 同时也调用 API 刷新客户端状态
      setTimeout(() => {
        fetchDashboardData();
      }, 1000);

      // 清除 URL 参数
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      window.history.replaceState({}, "", url.toString());

      // 3秒后隐藏成功消息
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    }

    const canceled = searchParams.get("canceled");
    if (canceled === "true") {
      console.log("⚠️ 支付已取消");
      // 清除 URL 参数
      const url = new URL(window.location.href);
      url.searchParams.delete("canceled");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams, router]);

  const fetchDashboardData = async () => {
    try {
      // Fetch user data
      const userResponse = await fetch("/api/usage");
      const userData = await userResponse.json();
      setUserData(userData);

      // Fetch analyses (you'll need to create this API endpoint)
      const analysesResponse = await fetch("/api/analyses");
      if (analysesResponse.ok) {
        const analysesData = await analysesResponse.json();
        setAnalyses(analysesData);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsManaging(true);
    try {
      const response = await fetch("/api/payment/manage");
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("无法获取管理链接，请稍后重试");
      }
    } catch (error) {
      console.error("Manage subscription error:", error);
      alert("获取管理链接失败");
    } finally {
      setIsManaging(false);
    }
  };

  const handleUpgrade = async () => {
    // 未登录：跳转到登录页
    if (!isSignedIn) {
      router.push("/sign-in?redirect_url=/dashboard");
      return;
    }

    // 已登录：调用 API 创建订阅
    setIsUpgrading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
      });
      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("无法创建订阅，请稍后重试");
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      alert("创建订阅失败");
    } finally {
      setIsUpgrading(false);
    }
  };

  if (!isLoaded || isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        {/* 支付成功提示 */}
        {showSuccessMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-green-800 font-medium">订阅成功！</p>
              <p className="text-green-600 text-sm">您现在可以享受无限次分析</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your Meal History</h1>
            {userData && (
              <p className="text-sm text-gray-600 mt-1">
                {userData.isPro ? (
                  <span className="text-amber-600 font-medium">⭐ Pro 会员</span>
                ) : (
                  <span>已使用 {userData.usageCount}/3 次免费分析</span>
                )}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {userData?.isPro ? (
              <Button
                variant="outline"
                onClick={handleManageSubscription}
                disabled={isManaging}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                {isManaging ? "加载中..." : "管理订阅"}
              </Button>
            ) : (
              <Button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold shadow-lg border-0"
              >
                <Sparkles className="w-4 h-4" />
                {isUpgrading ? "加载中..." : "升级会员 $9.9/月"}
              </Button>
            )}
            <Link href="/">
              <Button variant="outline">返回首页</Button>
            </Link>
          </div>
        </div>

        {analyses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">暂无分析记录</p>
            <Link href="/">
              <Button className="bg-black text-white hover:bg-gray-800">
                开始第一次分析
              </Button>
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
                          "zh-CN",
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
                        : "分析报告"}
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
