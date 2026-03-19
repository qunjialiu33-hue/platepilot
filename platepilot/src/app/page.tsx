"use client";

import dynamic from "next/dynamic";
const UserButtonWithNoSSR = dynamic(
  () => import("@/components/UserButton").then((mod) => mod.default),
  { ssr: false }
);

import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useUsageGuard } from "@/hooks/use-usage-guard";
import { LoginPromptModal, SubscribePromptModal } from "@/components/usage-limit-modal";
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
}

type Step = 1 | 2 | 3 | 4;

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>(1);
  const [imageData, setImageData] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string>("增肌");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { status, consume, isPro, isSignedIn } = useUsageGuard();

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const maxSize = 1024;
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = (h / w) * maxSize; w = maxSize; }
          else { w = (w / h) * maxSize; h = maxSize; }
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")?.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = url;
    });
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (isAnalyzing) return;
    if (status === "loading") return;
    if (status === "blocked_login") { setShowLoginModal(true); return; }
    if (status === "blocked_subscribe") { setShowSubscribeModal(true); return; }

    const data = await compressImage(file);
    setImageData(data);
    setStep(2);
    analyzeImage(data);
  };

  const analyzeImage = async (data: string) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      await consume();
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: data }),
      });
      if (response.status === 403) {
        setShowUpgradeModal(true);
        setStep(1);
        return;
      }
      if (!response.ok) throw new Error("Analysis failed");
      const analysis = await response.json();
      setResult(analysis);
      setStep(3);
    } catch (err) {
      console.error(err);
      setError("分析失败，请重试");
      setStep(1);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpgrade = async () => {
    if (!isSignedIn) {
      window.location.href = "/sign-in?redirect_url=/";
      return;
    }
    setIsUpgrading(true);
    try {
      const response = await fetch("/api/checkout", { method: "POST" });
      const data = await response.json();
      if (data.url) window.location.href = data.url;
      else alert("无法创建订阅，请稍后重试");
    } catch {
      alert("创建订阅失败");
    } finally {
      setIsUpgrading(false);
    }
  };

  const resetAll = () => {
    setStep(1);
    setResult(null);
    setImageData(null);
    setError(null);
    setSelectedGoal("增肌");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getScoreLevel = (score: number) => {
    if (score >= 80) return "S级料理人";
    if (score >= 60) return "还需努力";
    return "垃圾食品";
  };

  return (
    <div
      className="min-h-screen bg-[#0F1115] text-[#F8FAF0] flex flex-col items-center"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* ── 顶部导航 ── */}
      <nav className="w-full max-w-md px-6 pt-6 pb-4 flex flex-col gap-4 sticky top-0 bg-[#0F1115]/80 backdrop-blur-xl z-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-black text-lg">🐾</span>
            </div>
            <div>
              <span className="block font-black text-lg leading-none">PlatePilot</span>
              <span className="block text-[10px] uppercase tracking-widest text-white/30 font-bold">AI Auditor</span>
            </div>
          </div>
          <UserButtonWithNoSSR />
        </div>
        <div className="flex gap-2">
          {([1, 2, 3, 4] as Step[]).map((i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-all duration-500 ${
                step >= i ? "bg-emerald-400" : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </nav>

      <main className="w-full max-w-md flex-1 px-6 pb-12">

        {/* ── Step 1：上传 ── */}
        {step === 1 && (
          <div className="mt-8">
            <h2 className="text-4xl font-extrabold leading-tight mb-3">
              准备好<br />
              <span className="text-emerald-400">被评价</span>了吗？
            </h2>
            <p className="text-sm text-white/40 font-medium mb-8">
              上传你的盘子，让 AI 决定你今晚是否配得上那顿宵夜。
            </p>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-[4/5] rounded-[2.5rem] bg-[#1C1F26] border border-white/5 flex flex-col items-center justify-center cursor-pointer mb-6 overflow-hidden group transition-all hover:border-emerald-500/20"
            >
              <div className="w-24 h-24 rounded-[2rem] bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-4xl">📷</span>
              </div>
              <p className="font-extrabold text-lg">点击拍摄</p>
              <p className="text-[10px] text-white/20 mt-2 uppercase tracking-widest">tap to capture</p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-5 rounded-3xl bg-emerald-400 text-black font-black text-lg active:scale-95 transition-all shadow-lg shadow-emerald-500/10"
            >
              从相册选取
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelected}
              className="hidden"
            />
            {isSignedIn && !isPro && (
              <button
                onClick={handleUpgrade}
                disabled={isUpgrading}
                className="w-full mt-4 py-4 rounded-3xl border border-emerald-500/30 text-emerald-400 font-bold text-sm active:scale-95 transition-all"
              >
                {isUpgrading ? "处理中..." : "⚡ 升级 PRO · 无限次分析"}
              </button>
            )}
          </div>
        )}

        {/* ── Step 2：AI 扫描中 ── */}
        {step === 2 && (
          <div className="mt-8">
            <h2 className="text-2xl font-extrabold mb-2">正在视觉解析...</h2>
            <p className="text-sm text-white/40 mb-6">神经网络正在识别食材密度与热量</p>
            {imageData && (
              <div className="relative rounded-[2.5rem] overflow-hidden aspect-[4/3] mb-6 border border-white/5">
                <img src={imageData} alt="Plate" className="w-full h-full object-cover" />
                <div
                  className="absolute left-0 right-0 h-1 z-10"
                  style={{
                    background: "#37D192",
                    boxShadow: "0 0 15px #37D192",
                    animation: "scanLine 2s linear infinite",
                  }}
                />
                <div className="absolute inset-0 bg-black/20" />
              </div>
            )}
            <div className="bg-[#1C1F26] rounded-[2rem] p-6 flex items-center gap-4 border-l-4 border-l-emerald-500">
              <Loader2 className="w-6 h-6 text-emerald-400 animate-spin flex-shrink-0" />
              <div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase">AI 分析中</p>
                <p className="font-extrabold">正在识别食材与营养密度...</p>
              </div>
            </div>
            <style>{`
              @keyframes scanLine {
                0%   { top: 0%;   opacity: 0; }
                10%  { opacity: 1; }
                90%  { opacity: 1; }
                100% { top: 100%; opacity: 0; }
              }
            `}</style>
          </div>
        )}

        {/* ── Step 3：确认食材 + 目标选择 ── */}
        {step === 3 && result && (
          <div className="mt-8">
            <h2 className="text-2xl font-extrabold mb-2">确认识别结果</h2>
            <p className="text-sm text-white/40 mb-6">如果你觉得 AI 瞎了，请放心，它没瞎</p>
            <div className="flex flex-wrap gap-2 mb-8">
              {result.items.map((item, idx) => (
                <div
                  key={idx}
                  className={`px-4 py-2 rounded-2xl border-2 text-xs font-bold flex items-center gap-2 ${
                    item.status === "good"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : item.status === "warning"
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    item.status === "good" ? "bg-emerald-500"
                    : item.status === "warning" ? "bg-amber-500"
                    : "bg-red-500"
                  }`} />
                  {item.name}
                </div>
              ))}
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-white/30 mb-4 px-1">你的修行目标</p>
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { emoji: "🥗", label: "减脂" },
                { emoji: "💪", label: "增肌" },
                { emoji: "🍕", label: "躺平" },
              ].map(({ emoji, label }) => (
                <button
                  key={label}
                  onClick={() => setSelectedGoal(label)}
                  className={`py-5 rounded-[1.8rem] border text-sm font-extrabold transition-all active:scale-95 ${
                    selectedGoal === label
                      ? "bg-white/10 border-emerald-500/50 text-emerald-400"
                      : "bg-white/5 border-white/5 text-white"
                  }`}
                >
                  <span className="block text-2xl mb-2">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep(4)}
              className="w-full py-5 rounded-3xl bg-emerald-400 text-black font-black text-lg active:scale-95 transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-500/10"
            >
              开始毒舌审计 ⚡
            </button>
          </div>
        )}

        {/* ── Step 4：结果（普通版）── */}
        {step === 4 && result && !isPro && (
          <div className="mt-8">
            <div className="bg-[#1C1F26] rounded-[2.5rem] p-8 mb-6 flex flex-col items-center border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
              <div className="relative w-40 h-40 mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                  <circle cx="80" cy="80" r="60" stroke="white" strokeWidth="10" fill="none" className="opacity-10" />
                  <circle
                    cx="80" cy="80" r="60"
                    stroke="#37D192" strokeWidth="10" fill="none"
                    strokeLinecap="round"
                    strokeDasharray={376.8}
                    strokeDashoffset={376.8 - (result.score / 100) * 376.8}
                    style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-[#37D192]">{result.score}</span>
                  <span className="text-[10px] uppercase font-black text-white/30 tracking-widest mt-1">Score</span>
                </div>
              </div>
              <h3 className="text-xl font-extrabold mb-1">{getScoreLevel(result.score)}</h3>
              <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Audited by Raccoon AI</p>
            </div>

            <div className="mb-2">
              <div className="bg-emerald-400 text-black p-8 rounded-[2.5rem] relative shadow-2xl">
                <p className="font-extrabold text-lg leading-relaxed">{result.headline}</p>
                <div className="absolute -bottom-3 right-12 w-6 h-6 bg-emerald-400 rotate-45" />
              </div>
            </div>
            <div className="flex items-center gap-4 mb-6 px-4 mt-5">
              <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">🦝</div>
              <div>
                <span className="block text-xs font-black uppercase tracking-widest opacity-40">PlatePilot Bot</span>
                <span className="text-[10px] text-emerald-400 font-bold">● 嘲讽引擎在线</span>
              </div>
            </div>

            {result.actionTokens && (
              <div className="bg-[#1C1F26] p-6 rounded-[2.5rem] mb-6 border border-white/5">
                <p className="text-xs text-white/40 uppercase tracking-widest mb-2">建议</p>
                <p className="font-bold text-white">{result.actionTokens}</p>
              </div>
            )}

            <button
              onClick={handleUpgrade}
              disabled={isUpgrading}
              className="w-full py-5 rounded-3xl bg-white text-black font-black text-lg mb-4 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-2xl disabled:opacity-60"
            >
              {isUpgrading ? "处理中..." : "⚡ 升级 PRO 解锁完整方案"}
            </button>
            <button
              onClick={resetAll}
              className="w-full py-4 rounded-3xl bg-white/5 text-white/60 font-bold hover:bg-white/10 transition-all"
            >
              再次审计
            </button>
            <p className="text-xs text-white/20 text-center mt-6 px-4">本评估仅供参考，不构成医学建议。</p>
          </div>
        )}

        {/* ── Step 4：结果（PRO 版）── */}
        {step === 4 && result && isPro && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-extrabold">专业审计报告</h2>
              <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">PRO</span>
              </div>
            </div>

            <div className="bg-[#1C1F26] rounded-[2.5rem] p-8 mb-6 border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Dietary Score</p>
                  <div className="text-6xl font-black text-[#37D192] mb-2">{result.score}</div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500 text-black text-[10px] font-black uppercase">
                    {getScoreLevel(result.score)}
                  </span>
                </div>
                <div className="relative w-24 h-24">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                    <circle cx="48" cy="48" r="40" stroke="white" strokeWidth="8" fill="none" className="opacity-10" />
                    <circle
                      cx="48" cy="48" r="40"
                      stroke="#37D192" strokeWidth="8" fill="none"
                      strokeLinecap="round"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (result.score / 100) * 251.2}
                      style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-emerald-400 text-xl">⚡</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "碳水", color: "text-cyan-400", bar: "bg-cyan-400", val: 52 },
                { label: "蛋白", color: "text-emerald-400", bar: "bg-emerald-400", val: 28 },
                { label: "脂肪", color: "text-orange-400", bar: "bg-orange-400", val: 20 },
              ].map(({ label, color, bar, val }) => (
                <div key={label} className="bg-[#1C1F26] rounded-[1.5rem] p-4 text-center border border-white/5">
                  <p className="text-[10px] font-bold text-white/30 uppercase mb-2">{label}</p>
                  <p className={`text-lg font-black ${color}`}>{val}%</p>
                  <div className="w-full h-1 bg-white/5 rounded-full mt-2">
                    <div className={`h-full ${bar} rounded-full`} style={{ width: `${val}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-emerald-400 text-black p-6 rounded-[2rem] mb-6 relative">
              <h4 className="font-black text-xs uppercase tracking-widest mb-2 opacity-60">小浣熊专业点评</h4>
              <p className="font-bold leading-relaxed">{result.headline}</p>
            </div>

            {result.items && result.items.length > 0 && (
              <div className="bg-[#1C1F26] rounded-[2rem] p-6 mb-6 border border-white/5">
                <h4 className="font-bold text-sm mb-4 flex items-center gap-2">
                  <span className="text-cyan-400">💡</span> PRO 食材分析
                </h4>
                <div className="space-y-3">
                  {result.items.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                        item.status === "good" ? "bg-emerald-400"
                        : item.status === "warning" ? "bg-amber-400"
                        : "bg-red-400"
                      }`} />
                      <div>
                        <p className="font-bold text-sm text-white">
                          {item.name}
                          <span className={`ml-2 text-xs ${
                            item.status === "good" ? "text-emerald-400"
                            : item.status === "warning" ? "text-amber-400"
                            : "text-red-400"
                          }`}>
                            {item.status === "good" ? "✓ 优秀" : item.status === "warning" ? "⚠ 注意" : "✗ 需改进"}
                          </span>
                        </p>
                        <p className="text-xs text-white/40 mt-0.5">{item.instruction}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.actionTokens && (
              <div className="bg-[#1C1F26] p-6 rounded-[2rem] mb-6 border-l-4 border-l-cyan-400 border border-white/5">
                <p className="text-xs text-white/40 uppercase tracking-widest mb-2">PRO 建议</p>
                <p className="font-bold text-white">{result.actionTokens}</p>
              </div>
            )}

            <button
              onClick={resetAll}
              className="w-full py-5 rounded-3xl bg-white/5 border border-white/10 font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all"
            >
              开启下一轮深度审计
            </button>
            <p className="text-xs text-white/20 text-center mt-6 px-4">本评估仅供参考，不构成医学建议。</p>
          </div>
        )}

        {error && (
          <div className="fixed bottom-8 left-6 right-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-white text-sm text-center z-50">
            {error}
            <button onClick={() => setError(null)} className="ml-3 underline opacity-60">关闭</button>
          </div>
        )}
      </main>

      <LoginPromptModal open={showLoginModal} onClose={() => setShowLoginModal(false)} />
      <SubscribePromptModal open={showSubscribeModal} onClose={() => setShowSubscribeModal(false)} />
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => { setShowUpgradeModal(false); setStep(1); }}
      />
    </div>
  );
}
