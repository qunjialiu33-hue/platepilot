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
import UserButton from "@/components/UserButton";

const GUEST_DAILY_LIMIT = 3;

function getGuestUsage() {
  if (typeof window === "undefined") return { count: 0, date: "" };

  const today = new Date().toDateString();
  const stored = localStorage.getItem("platepilot_guest_usage");

  if (!stored) return { count: 0, date: today };

  const { count, date } = JSON.parse(stored);

  // Reset if new day
  if (date !== today) {
    return { count: 0, date: today };
  }

  return { count, date };
}

function incrementGuestUsage() {
  const today = new Date().toDateString();
  const current = getGuestUsage();
  const newCount = current.count + 1;

  localStorage.setItem(
    "platepilot_guest_usage",
    JSON.stringify({ count: newCount, date: today })
  );

  return newCount;
}

export default function Home() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [guestUsage, setGuestUsage] = useState({ count: 0, date: "" });
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    setGuestUsage(getGuestUsage());
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

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0);
    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageData);
    analyzeImage(imageData);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      setCapturedImage(imageData);
      analyzeImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (imageData: string) => {
    // Check guest usage limit (allow if under limit, but don't enforce for now - let server decide)
    const usage = getGuestUsage();
    if (usage.count >= GUEST_DAILY_LIMIT) {
      setShowLimitModal(true);
      return;
    }

    setIsLoading(true);

    // Increment guest usage
    incrementGuestUsage();

    // Stop camera when analyzing
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      // Store image in sessionStorage to avoid URL length limit
      sessionStorage.setItem("uploadedImage", imageData);
      router.push("/results");
    } catch (err) {
      console.error("Analysis error:", err);
      setError("Analysis failed. Please try again.");
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

      {/* Guest Limit Modal */}
      {showLimitModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full text-center">
            <h2 className="text-xl font-bold mb-2">Daily Limit Reached</h2>
            <p className="text-gray-600 mb-4">
              Guests can analyze {GUEST_DAILY_LIMIT} meals per day. Sign in for unlimited analyses.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setShowLimitModal(false)}>
                Close
              </Button>
              <Button onClick={() => router.push("/sign-in")}>
                Sign In
              </Button>
            </div>
          </div>
        </div>
      )}

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
              disabled={!stream}
            >
              <Camera className="w-12 h-12 text-black" />
            </Button>

            {/* Upload Button */}
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
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
