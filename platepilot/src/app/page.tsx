"use client";

import dynamic from "next/dynamic";

const UserButtonWithNoSSR = dynamic(
  () => import("@/components/UserButton").then((mod) => mod.default),
  { ssr: false }
);

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Camera, Upload, Loader2 } from "lucide-react";
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
  const { status, consume } = useUsageGuard();

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
    <div className="relative min-h-screen w-full bg-black overflow-hidden">
      {/* Camera Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Top Overlay - Brand */}
      <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent z-10 flex justify-between items-start">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">PlatePilot</h1>
          <p className="text-white/70 text-sm">Your Meal Audit Companion</p>
        </div>
        <UserButtonWithNoSSR />
      </div>

      {/* Usage Limit Modals */}
      <LoginPromptModal
        open={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
      <SubscribePromptModal
        open={showSubscribeModal}
        onClose={() => setShowSubscribeModal(false)}
      />

      {/* Bottom Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent z-10">
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-white text-sm text-center">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-white animate-spin" />
            <p className="text-white text-lg font-medium">Analyzing...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6">
            {/* Capture Button - Larger for mobile */}
            <Button
              onClick={capturePhoto}
              className="w-28 h-28 rounded-full bg-white hover:bg-white/90 border-4 border-white/30 shadow-lg transition-all hover:scale-105 active:scale-95"
              disabled={!stream || status === 'loading' || isAnalyzing}
            >
              <Camera className="w-12 h-12 text-black" />
            </Button>

            {/* Upload Button */}
            <label className={`${isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isAnalyzing}
              />
              <div className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white font-medium transition-colors">
                <Upload className="w-5 h-5" />
                <span>Choose from Album</span>
              </div>
            </label>

            <p className="text-white/60 text-xs text-center">
              Aim at your plate, tap to capture or choose an image
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
