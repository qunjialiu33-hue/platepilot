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

  const getScoreBg = (score: number) => {
    if (score < 60) return "bg-red-500";
    if (score < 80) return "bg-amber-500";
    return "bg-emerald-500";
  };

  if (!imageData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">No image data. Please take a photo first.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/")}
          className="rounded-full"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">Audit Results</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/")}
          className="rounded-full"
        >
          <Camera className="w-5 h-5" />
        </Button>
      </header>

      {error ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 max-w-sm w-full text-center">
            <p className="text-red-600 dark:text-red-400 font-medium mb-4">{error}</p>
            <Button onClick={() => router.push("/")} className="bg-red-600 hover:bg-red-700 text-white">
              Try Again
            </Button>
          </div>
        </div>
      ) : isAnalyzing ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative w-32 h-32">
            <div className={`absolute inset-0 rounded-full ${getScoreBg(50)} opacity-20 animate-pulse`}></div>
            <div className={`absolute inset-2 rounded-full ${getScoreBg(50)} opacity-40 animate-pulse delay-75`}></div>
            <div className={`absolute inset-4 rounded-full ${getScoreBg(50)} opacity-60 animate-pulse delay-150`}></div>
          </div>
          <p className="text-zinc-600 dark:text-zinc-400 font-medium">AI is analyzing your plate...</p>
        </div>
      ) : result ? (
        <div className="p-4 space-y-4">
          {/* Score Card */}
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className={`${getScoreBg(result.score)} p-8 text-white text-center`}>
                <p className="text-sm font-medium opacity-90 mb-2">Diet Health Score</p>
                <p className="text-8xl font-bold tracking-tight">{result.score}</p>
                <p className="text-3xl font-bold mt-4 opacity-95">
                  {result.headline}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Image */}
          <div className="relative rounded-xl overflow-hidden bg-zinc-900">
            <img
              src={imageData}
              alt="Plate photo"
              className="w-full aspect-[4/3] object-cover"
            />
          </div>

          {/* Food Items */}
          {result.items && result.items.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium text-zinc-500">Food Details</p>
                {result.items.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                      item.status === "good" ? "bg-emerald-500" :
                      item.status === "warning" ? "bg-amber-500" : "bg-red-500"
                    }`} />
                    <div className="flex-1">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {item.name}
                        <span className={`ml-2 text-xs ${
                          item.status === "good" ? "text-emerald-500" :
                          item.status === "warning" ? "text-amber-500" : "text-red-500"
                        }`}>
                          {item.status === "good" ? "✓ Good" : item.status === "warning" ? "⚠ Warning" : "✗ Needs More"}
                        </span>
                      </p>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        {item.instruction}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Action Tokens - Large & Bold */}
          <Card className="border-2 border-zinc-900 dark:border-zinc-100">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Info className="w-6 h-6 text-zinc-900 dark:text-zinc-100 flex-shrink-0 mt-1" />
                <div>
                  <p className="text-sm font-medium text-zinc-500 mb-1">Action Items</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                    {result.actionTokens}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Disclaimer */}
          <p className="text-xs text-zinc-400 text-center px-4">
            This assessment is for reference only and does not constitute medical advice. Please consult your doctor for personalized dietary recommendations.
          </p>

          {/* Retry Button */}
          <Button
            onClick={() => router.push("/")}
            className="w-full h-14 text-lg font-semibold bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Audit Another Plate
          </Button>
        </div>
      ) : null}

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
