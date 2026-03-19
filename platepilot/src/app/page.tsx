"use client";

import dynamic from "next/dynamic";

const UserButtonWithNoSSR = dynamic(
  () => import("@/components/UserButton").then((mod) => mod.default),
  { ssr: false }
);

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUsageGuard } from "@/hooks/use-usage-guard";
import { LoginPromptModal, SubscribePromptModal } from "@/components/usage-limit-modal";

export default function Home() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const { status, consume, isPro, isSignedIn } = useUsageGuard();

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Unable to access camera. Please check your permission settings.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;

    // 防止重复点击
    if (isAnalyzing) {
      console.log("⚠️ 正在分析中，请勿重复点击");
      return;
    }

    // Check usage guard status
    if (status === 'loading') return;
    if (status === 'blocked_login') {
      setShowLoginModal(true);
      return;
    }
    if (status === 'blocked_subscribe') {
      setShowSubscribeModal(true);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    analyzeImage(imageData);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 防止重复点击
    if (isAnalyzing) {
      console.log("⚠️ 正在分析中，请勿重复上传");
      return;
    }

    // Check usage guard status
    if (status === 'loading') return;
    if (status === 'blocked_login') {
      setShowLoginModal(true);
      return;
    }
    if (status === 'blocked_subscribe') {
      setShowSubscribeModal(true);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      analyzeImage(imageData);
    };
    reader.readAsDataURL(file);
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

  const analyzeImage = async (imageData: string) => {
    setIsAnalyzing(true);
    setIsLoading(true);

    // Stop camera when analyzing
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      // Consume usage count before analysis
      await consume();

      // Store image in sessionStorage to avoid URL length limit
      sessionStorage.setItem("uploadedImage", imageData);
      router.push("/results");
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F8FAF0]">
      {/* Sticky Top Navigation */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-[#0F1115]/80">
        <div className="px-6 py-4 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center">
              <span className="text-lg">🐾</span>
            </div>
            <div>
              <p className="font-black text-lg leading-none">PlatePilot</p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest">AI Auditor</p>
            </div>
          </div>
          {/* Right: UserButton */}
          <UserButtonWithNoSSR />
        </div>
        {/* Progress Bar */}
        <div className="flex gap-2 px-6 pb-4">
          <div className="flex-1 h-1 rounded-full bg-emerald-400"></div>
          <div className="flex-1 h-1 rounded-full bg-white/10"></div>
          <div className="flex-1 h-1 rounded-full bg-white/10"></div>
          <div className="flex-1 h-1 rounded-full bg-white/10"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 mt-8">
        {/* Title */}
        <h2 className="text-4xl font-extrabold leading-tight mb-3">
          准备好<br />
          <span className="text-emerald-400">被评价</span>了吗？
        </h2>
        <p className="text-sm text-white/40 font-medium mb-8">
          上传你的盘子，让 AI 决定你今晚是否配得上那顿宵夜。
        </p>

        {/* Upload Card */}
        <label
          className="block rounded-[2.5rem] bg-[#1C1F26] border border-white/5 aspect-[4/5] flex flex-col items-center justify-center cursor-pointer overflow-hidden mb-6"
          onClick={handleFileUpload as any}
        >
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            disabled={isAnalyzing}
          />
          <div className="w-24 h-24 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center mb-4">
            <span className="text-emerald-400 text-4xl">📷</span>
          </div>
          <p className="font-extrabold text-lg text-white/80">点击拍摄</p>
        </label>

        {/* Bottom Button */}
        <button
          onClick={handleFileUpload as any}
          className="w-full py-5 rounded-3xl font-black text-lg bg-emerald-400 text-black active:scale-95 transition-all"
        >
          从相册选取
        </button>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-8 left-6 right-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-white text-sm text-center">
          {error}
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-[#0F1115]/90 flex items-center justify-center z-50">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
            <p className="text-lg font-medium">分析中...</p>
          </div>
        </div>
      )}

      {/* Usage Limit Modals */}
      <LoginPromptModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
      <SubscribePromptModal
        open={showSubscribeModal}
        onClose={() => setShowSubscribeModal(false)}
      />
    </div>
  );
}
