"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";

type View = "hub" | "history" | "data" | "subscription";

interface ProfileData {
  age: number | null;
  gender: string | null;
  height: number | null;
  weight: number | null;
  targetWeight: number | null;
  activityLevel: string | null;
  dietaryRestrictions: string | null;
  fitnessGoal: string | null;
  isPro: boolean;
  usageCount: number;
}

interface Analysis {
  id: string;
  score: number | null;
  resultJson: any;
  createdAt: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [view, setView] = useState<View>("hub");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({
    age: "",
    gender: "",
    height: "",
    weight: "",
    targetWeight: "",
    activityLevel: "",
    dietaryRestrictions: "",
    fitnessGoal: "",
  });

  useEffect(() => {
    if (isLoaded && !user) router.push("/sign-in");
  }, [isLoaded, user, router]);

  useEffect(() => {
    if (isLoaded && user) {
      fetchData();
    }
  }, [isLoaded, user]);

  const fetchData = async () => {
    try {
      const [profileRes, analysesRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/analyses"),
      ]);
      const profileData = await profileRes.json();
      const analysesData = await analysesRes.json();
      setProfile(profileData);
      setAnalyses(analysesData || []);
      setForm({
        age: profileData.age?.toString() || "",
        gender: profileData.gender || "",
        height: profileData.height?.toString() || "",
        weight: profileData.weight?.toString() || "",
        targetWeight: profileData.targetWeight?.toString() || "",
        activityLevel: profileData.activityLevel || "",
        dietaryRestrictions: profileData.dietaryRestrictions || "",
        fitnessGoal: profileData.fitnessGoal || "",
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: form.age ? parseInt(form.age) : null,
          gender: form.gender || null,
          height: form.height ? parseInt(form.height) : null,
          weight: form.weight ? parseInt(form.weight) : null,
          targetWeight: form.targetWeight ? parseInt(form.targetWeight) : null,
          activityLevel: form.activityLevel || null,
          dietaryRestrictions: form.dietaryRestrictions || null,
          fitnessGoal: form.fitnessGoal || null,
        }),
      });
      showToast("已保存并同步到云端 ✓");
      setTimeout(() => setView("hub"), 800);
    } catch (e) {
      showToast("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsManaging(true);
    try {
      const res = await fetch("/api/payment/manage");
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else showToast("无法获取管理链接");
    } catch {
      showToast("获取失败，请重试");
    } finally {
      setIsManaging(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  const inputClass = "w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-2xl outline-none focus:border-emerald-400 transition-colors";
  const selectClass = "w-full bg-white/5 border border-white/10 text-white px-4 py-3 rounded-2xl outline-none focus:border-emerald-400 transition-colors appearance-none";

  return (
    <div className="min-h-screen bg-[#0A0C10] text-[#F8FAF0] flex flex-col items-center"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* 顶部导航 */}
      <nav className="w-full max-w-md px-6 pt-6 pb-4 flex items-center justify-between sticky top-0 bg-[#0A0C10]/90 backdrop-blur-xl z-50">
        <button onClick={() => view === "hub" ? router.push("/") : setView("hub")}
          className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center border border-white/10">
            <span className="text-sm">💎</span>
          </div>
          <span className="font-black text-base">
            PlatePilot <span style={{ background: 'linear-gradient(135deg, #37D192, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>PRO</span>
          </span>
        </div>
        <div className="w-10 h-10" />
      </nav>

      <main className="w-full max-w-md flex-1 px-6 pb-12">

        {/* Hub 主页 */}
        {view === "hub" && (
          <div className="mt-4">
            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 rounded-full p-[3px] mb-4"
                style={{ background: 'linear-gradient(135deg, #37D192, #22d3ee)' }}>
                <img src={user?.imageUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                  className="w-full h-full rounded-full object-cover bg-slate-900 border-4 border-[#0A0C10]" />
              </div>
              <h2 className="text-2xl font-black mb-1">{user?.fullName || user?.firstName || "用户"}</h2>
              <p className="text-[10px] font-black uppercase tracking-widest"
                style={{ background: 'linear-gradient(135deg, #37D192, #22d3ee)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {profile?.isPro ? "Pro Member" : "Free Member"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-[#161920] rounded-[1.5rem] p-4 text-center border border-white/5">
                <p className="text-2xl font-black text-emerald-400">{analyses.length}</p>
                <p className="text-[10px] font-bold text-white/40">累计审计</p>
              </div>
              <div className="bg-[#161920] rounded-[1.5rem] p-4 text-center border border-white/5">
                <p className="text-2xl font-black text-cyan-400">
                  {analyses.length > 0
                    ? Math.round(analyses.reduce((sum, a) => sum + (a.score || 0), 0) / analyses.length)
                    : "--"}
                </p>
                <p className="text-[10px] font-bold text-white/40">平均得分</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { icon: "🕐", label: "历史数据", view: "history" as View },
                { icon: "⚙️", label: "个性化健康数据", view: "data" as View },
                { icon: "💳", label: "订阅管理", view: "subscription" as View },
              ].map(({ icon, label, view: v }) => (
                <button key={v} onClick={() => setView(v)}
                  className="w-full bg-[#161920] rounded-[1.5rem] p-5 flex items-center justify-between border border-white/5 active:scale-98 transition-all">
                  <div className="flex items-center gap-4">
                    <span className="text-lg">{icon}</span>
                    <span className="font-bold">{label}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/20" />
                </button>
              ))}

              <button onClick={() => signOut(() => router.push("/"))}
                className="w-full py-5 flex items-center justify-center gap-2 text-red-400 font-bold text-sm opacity-70 hover:opacity-100 transition-opacity">
                退出登录
              </button>
            </div>
          </div>
        )}

        {/* 历史数据 */}
        {view === "history" && (
          <div className="mt-4">
            <h2 className="text-2xl font-black mb-6">历史数据</h2>
            {analyses.length === 0 ? (
              <div className="text-center py-12 text-white/30">
                <p className="text-4xl mb-4">🍽️</p>
                <p className="font-bold">暂无分析记录</p>
                <p className="text-sm mt-2">去拍一张你的餐盘吧</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analyses.map((a) => (
                  <div key={a.id} className="bg-[#161920] rounded-[1.5rem] p-4 flex items-center justify-between border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-xl">🥗</div>
                      <div>
                        <p className="font-bold text-sm">
                          {(a.resultJson as any)?.headline?.slice(0, 20) || "餐盘分析"}...
                        </p>
                        <p className="text-[10px] text-white/30">
                          {new Date(a.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                    <span className={`text-lg font-black ${
                      (a.score || 0) >= 80 ? "text-emerald-400"
                      : (a.score || 0) >= 60 ? "text-amber-400"
                      : "text-red-400"
                    }`}>{a.score ?? "--"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 个性化数据 */}
        {view === "data" && (
          <div className="mt-4">
            <h2 className="text-2xl font-black mb-6">个性化数据</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-white/40 mb-2 ml-1">年龄</label>
                  <input type="number" placeholder="28" value={form.age}
                    onChange={e => setForm({...form, age: e.target.value})}
                    className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-white/40 mb-2 ml-1">性别</label>
                  <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})} className={selectClass}>
                    <option value="">选择</option>
                    <option value="male">男</option>
                    <option value="female">女</option>
                    <option value="other">其他</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-white/40 mb-2 ml-1">身高 (cm)</label>
                  <input type="number" placeholder="170" value={form.height}
                    onChange={e => setForm({...form, height: e.target.value})}
                    className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-white/40 mb-2 ml-1">体重 (kg)</label>
                  <input type="number" placeholder="65" value={form.weight}
                    onChange={e => setForm({...form, weight: e.target.value})}
                    className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-white/40 mb-2 ml-1">目标体重 (kg)</label>
                <input type="number" placeholder="60" value={form.targetWeight}
                  onChange={e => setForm({...form, targetWeight: e.target.value})}
                  className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-white/40 mb-2 ml-1">活动水平</label>
                <select value={form.activityLevel} onChange={e => setForm({...form, activityLevel: e.target.value})} className={selectClass}>
                  <option value="">选择</option>
                  <option value="sedentary">久坐为主</option>
                  <option value="light">轻度运动（每周1-2次）</option>
                  <option value="moderate">中度运动（每周3-4次）</option>
                  <option value="active">高强度训练（每周5+次）</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-white/40 mb-2 ml-1">主要目标</label>
                <select value={form.fitnessGoal} onChange={e => setForm({...form, fitnessGoal: e.target.value})} className={selectClass}>
                  <option value="">选择</option>
                  <option value="lose_fat">极致减脂</option>
                  <option value="build_muscle">科学增肌</option>
                  <option value="maintain">维持健康</option>
                  <option value="just_roast">随便骂骂</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-white/40 mb-2 ml-1">饮食限制</label>
                <input type="text" placeholder="素食、乳糖不耐受、不吃海鲜..." value={form.dietaryRestrictions}
                  onChange={e => setForm({...form, dietaryRestrictions: e.target.value})}
                  className={inputClass} />
              </div>
              <button onClick={saveProfile} disabled={isSaving}
                className="w-full py-5 rounded-3xl bg-emerald-400 text-black font-black text-lg mt-4 active:scale-95 transition-all disabled:opacity-60">
                {isSaving ? "保存中..." : "保存所有更改"}
              </button>
            </div>
          </div>
        )}

        {/* 订阅管理 */}
        {view === "subscription" && (
          <div className="mt-4">
            <h2 className="text-2xl font-black mb-6">订阅管理</h2>
            {profile?.isPro ? (
              <div>
                <div className="rounded-[2rem] p-8 mb-6 border border-white/10"
                  style={{ background: 'linear-gradient(135deg, rgba(55,209,146,0.15), rgba(34,211,238,0.15))' }}>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="block text-3xl font-black">PRO</span>
                      <span className="text-[10px] font-bold text-white/40">月度会员计划</span>
                    </div>
                    <span className="text-2xl">💎</span>
                  </div>
                  <div className="space-y-2 mb-6">
                    {["无限次深度视觉审计", "个性化营养分析", "专业级审计报告"].map(f => (
                      <div key={f} className="flex items-center gap-2 text-sm">
                        <span className="text-emerald-400">✓</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-white/40">当前计划</p>
                      <p className="font-bold">$9.9 / 月</p>
                    </div>
                  </div>
                </div>
                <button onClick={handleManageSubscription} disabled={isManaging}
                  className="w-full py-5 rounded-3xl bg-white/5 border border-white/10 font-bold text-sm mb-4 active:scale-95 transition-all disabled:opacity-60">
                  {isManaging ? "加载中..." : "管理订阅 / 取消续费"}
                </button>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-4xl mb-4">⭐</p>
                <p className="font-bold mb-2">你还不是 PRO 会员</p>
                <p className="text-sm text-white/40 mb-6">升级后享受无限次分析</p>
                <button onClick={() => router.push("/")}
                  className="w-full py-5 rounded-3xl bg-emerald-400 text-black font-black text-lg">
                  去首页升级
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 px-6 py-3 bg-white text-black rounded-full font-bold shadow-2xl z-50 text-sm">
          {toast}
        </div>
      )}
    </div>
  );
}
