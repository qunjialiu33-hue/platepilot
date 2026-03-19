"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, RefreshCw, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import UpgradeModal from "@/components/UpgradeModal";

interface FoodItem {
  name: string;
  status: "good" | "warning" | "bad";
  instruction: string;
}

interface AnalysisResult {
  score: number;
  headline: string;
  items: FoodItem[];
  actionTokens: string;
  isPro?: boolean;
  reason?: string;
  annotations?: Array<{
    label: string;
    status: "warning" | "good" | "bad";
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
}

function ResultsContent() {
  const router = useRouter();
  const [imageData, setImageData] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Read image from sessionStorage instead of URL params
    const storedImage = sessionStorage.getItem("uploadedImage");
    if (storedImage) {
      setImageData(storedImage);
    }
  }, []);

  useEffect(() => {
    if (imageData) {
      // Call the real API
      const fetchAnalysis = async () => {
        try {
          const response = await fetch("/api/analyze", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ image: imageData }),
          });

          // Handle 403 - Upgrade required
          if (response.status === 403) {
            setIsAnalyzing(false);
            setShowUpgradeModal(true);
            return;
          }

          if (!response.ok) {
            throw new Error("Analysis failed");
          }

          const analysis = await response.json();
          setResult(analysis);
        } catch (error) {
          console.error("Analysis error:", error);
          setError("AI analysis failed. Please try again.");
        } finally {
          setIsAnalyzing(false);
        }
      };

      fetchAnalysis();
    }
  }, [imageData]);

  const getScoreLevel = (score: number) => {
    if (score >= 80) return "S级料理人";
    if (score >= 60) return "还需努力";
    return "垃圾食品";
  };

  if (!imageData) {
    return (
      <div className="min-h-screen bg-[#0F1115] flex items-center justify-center">
        <p className="text-white/40">请先拍摄照片</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F8FAF0]">
      {/* Sticky Top Navigation */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-[#0F1115]/80">
        <div className="px-6 py-4 flex items-center justify-between">
          {/* Back Button */}
          <button
            onClick={() => router.push("/")}
            className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          {/* Right: Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center">
              <span className="text-lg">🐾</span>
            </div>
          </div>
        </div>
        {/* Progress Bar - All Active */}
        <div className="flex gap-2 px-6 pb-4">
          <div className="flex-1 h-1 rounded-full bg-emerald-400"></div>
          <div className="flex-1 h-1 rounded-full bg-emerald-400"></div>
          <div className="flex-1 h-1 rounded-full bg-emerald-400"></div>
          <div className="flex-1 h-1 rounded-full bg-emerald-400"></div>
        </div>
      </div>

      {/* Loading State - Scanning */}
      {isAnalyzing && (
        <div className="px-6 py-8">
          <h2 className="text-2xl font-extrabold mb-2">正在视觉解析...</h2>
          <p className="text-sm text-white/40 mb-6">神经网络识别食材中</p>

          {/* Image with Scan Line */}
          <div className="relative rounded-[2.5rem] overflow-hidden bg-[#1C1F26] aspect-[4/3] mb-6">
            <img
              src={imageData}
              alt="Plate photo"
              className="w-full h-full object-cover"
            />
            {/* Green Scan Line */}
            <div
              className="absolute left-0 right-0 h-1 bg-[#37D192]"
              style={{
                boxShadow: "0 0 15px #37D192",
                animation: "scanLine 2s linear infinite",
              }}
            ></div>
            <style jsx>{`
              @keyframes scanLine {
                0% { top: 0; }
                100% { top: 100%; }
              }
            `}</style>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isAnalyzing && (
        <div className="px-6 py-8">
          <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-6 text-center">
            <p className="text-red-400 font-medium mb-4">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="px-6 py-3 bg-red-500 text-white rounded-xl font-medium"
            >
              重新拍摄
            </button>
          </div>
        </div>
      )}

      {/* Result State */}
      {result && !isAnalyzing && (
        <div className="px-6 py-8">
          {/* Score Card */}
          <div className="bg-[#1C1F26] rounded-[2.5rem] p-8 mb-6">
            <div className="flex flex-col items-center">
              {/* SVG Circle Progress */}
              <div className="relative w-40 h-40 mb-4">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="40"
                    stroke="white"
                    strokeWidth="8"
                    fill="none"
                    className="opacity-20"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="40"
                    stroke="#37D192"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 - (result.score / 100) * 251.2}
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-6xl font-black text-[#37D192]">{result.score}</span>
                </div>
              </div>
              {/* Level Text */}
              <p className="text-xl font-extrabold text-white">{getScoreLevel(result.score)}</p>
            </div>
          </div>

          {/* Image */}
          <div className="relative rounded-[2.5rem] overflow-hidden bg-[#1C1F26] mb-6">
            <img
              src={imageData}
              alt="Plate photo"
              className="w-full aspect-[4/3] object-cover"
            />
          </div>

          {/* Headline - Toxic Comment */}
          <div className="bg-emerald-400 text-black p-8 rounded-[2.5rem] mb-6">
            <p className="text-xl font-extrabold leading-relaxed">
              {result.headline}
            </p>
          </div>

          {/* Food Items */}
          {result.items && result.items.length > 0 && (
            <div className="space-y-3 mb-6">
              {result.items.map((item, index) => (
                <div key={index} className="flex items-start gap-3 bg-[#1C1F26] p-4 rounded-2xl">
                  <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    item.status === "good" ? "bg-emerald-400" :
                    item.status === "warning" ? "bg-amber-400" : "bg-red-400"
                  }`} />
                  <div className="flex-1">
                    <p className="font-bold text-white">
                      {item.name}
                      <span className={`ml-2 text-xs font-medium ${
                        item.status === "good" ? "text-emerald-400" :
                        item.status === "warning" ? "text-amber-400" : "text-red-400"
                      }`}>
                        {item.status === "good" ? "✓ 优秀" : item.status === "warning" ? "⚠ 注意" : "✗ 需改进"}
                      </span>
                    </p>
                    <p className="text-sm text-white/50 mt-1">
                      {item.instruction}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Tokens */}
          {result.actionTokens && (
            <div className="bg-[#1C1F26] p-6 rounded-[2.5rem] mb-6">
              <p className="text-xs text-white/40 uppercase tracking-widest mb-2">建议</p>
              <p className="text-lg font-bold text-white">{result.actionTokens}</p>
            </div>
          )}

          {/* Upgrade Button */}
          <button
            onClick={() => router.push("/sign-in?redirect_url=/dashboard")}
            className="w-full py-5 rounded-3xl bg-white text-black font-black text-lg mb-4"
          >
            ⚡ 升级 PRO 解锁完整方案
          </button>

          {/* Retry Button */}
          <button
            onClick={() => router.push("/")}
            className="w-full py-4 rounded-3xl bg-white/5 text-white/60 font-bold"
          >
            再次审计
          </button>

          {/* Disclaimer */}
          <p className="text-xs text-white/30 text-center mt-6 px-4">
            本评估仅供参考，不构成医学建议。请咨询医生获取个性化饮食建议。
          </p>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          router.push("/");
        }}
      />
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-4 border-zinc-300 border-t-zinc-900 rounded-full animate-spin"></div>
        <p className="text-zinc-500">Loading...</p>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ResultsContent />
    </Suspense>
  );
}
