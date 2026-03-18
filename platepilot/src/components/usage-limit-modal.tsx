"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface LoginPromptModalProps {
  open: boolean;
  onClose: () => void;
}

export function LoginPromptModal({ open, onClose }: LoginPromptModalProps) {
  const router = useRouter();

  if (!open) return null;

  const handleLogin = () => {
    router.push("/sign-in");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl">
        <div className="mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            免费次数已用完
          </h2>
          <p className="text-gray-600 mb-6">
            您已使用完 3 次免费分析次数。登录后可继续使用更多功能！
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <ul className="text-left text-sm text-gray-600 space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> 登录后额外 3 次免费分析
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> 保存历史记录
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> 升级会员享受无限次数
            </li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            稍后再说
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
            onClick={handleLogin}
          >
            登录 / 注册
          </Button>
        </div>
      </div>
    </div>
  );
}

interface SubscribePromptModalProps {
  open: boolean;
  onClose: () => void;
}

export function SubscribePromptModal({ open, onClose }: SubscribePromptModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  if (!open) return null;

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("创建订阅会话失败");
      }
    } catch (error) {
      console.error("Subscribe error:", error);
      alert("订阅失败，请稍后重试");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center shadow-2xl">
        <div className="mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⭐</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            升级到会员版
          </h2>
          <p className="text-gray-600 mb-6">
            您已使用完免费次数。订阅会员后享受无限次分析！
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-3xl font-bold text-gray-900 mb-1">$9.9</p>
          <p className="text-gray-500">每月</p>
          <ul className="mt-4 text-left text-sm text-gray-600 space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> 无限次分析
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> 优先支持
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> 随时取消
            </li>
          </ul>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isLoading}
          >
            稍后再说
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            onClick={handleSubscribe}
            disabled={isLoading}
          >
            {isLoading ? "加载中..." : "立即订阅"}
          </Button>
        </div>
      </div>
    </div>
  );
}
