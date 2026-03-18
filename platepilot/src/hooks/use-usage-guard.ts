"use client";

import { useUser } from "@clerk/nextjs";
import { useState, useEffect, useCallback } from "react";

type UsageStatus = 'allowed' | 'blocked_login' | 'blocked_subscribe' | 'loading';

interface UseUsageGuardReturn {
  status: UsageStatus;
  usedCount: number;
  consume: () => Promise<void>;
}

export function useUsageGuard(): UseUsageGuardReturn {
  const { isSignedIn, isLoaded } = useUser();
  const [status, setStatus] = useState<UsageStatus>('loading');
  const [usedCount, setUsedCount] = useState(0);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    if (!isLoaded) {
      setStatus('loading');
      return;
    }

    const checkUsage = async () => {
      if (!isSignedIn) {
        // 未登录逻辑
        const localCountStr = localStorage.getItem("free_uses_count");
        const localCount = localCountStr ? parseInt(localCountStr, 10) : 0;
        setUsedCount(localCount);
        setIsPro(false);

        if (localCount >= 3) {
          setStatus('blocked_login');
        } else {
          setStatus('allowed');
        }
      } else {
        // 已登录逻辑
        try {
          const response = await fetch("/api/usage");
          const data = await response.json();

          setUsedCount(data.usageCount || 0);
          setIsPro(data.isPro || false);

          if (data.isPro) {
            setStatus('allowed');
          } else if (data.usageCount >= 3) {
            setStatus('blocked_subscribe');
          } else {
            setStatus('allowed');
          }
        } catch (error) {
          console.error("Failed to fetch usage:", error);
          setStatus('allowed');
        }
      }
    };

    checkUsage();
  }, [isSignedIn, isLoaded]);

  const consume = useCallback(async () => {
    if (!isSignedIn) {
      // 未登录：更新 localStorage
      const localCountStr = localStorage.getItem("free_uses_count");
      const localCount = localCountStr ? parseInt(localCountStr, 10) : 0;
      const newCount = localCount + 1;
      localStorage.setItem("free_uses_count", newCount.toString());
      setUsedCount(newCount);

      if (newCount >= 3) {
        setStatus('blocked_login');
      }
    } else {
      // 已登录：调用 API
      try {
        const response = await fetch("/api/usage/consume", {
          method: "POST",
        });
        const data = await response.json();
        const newCount = data.usageCount;
        setUsedCount(newCount);

        // 更新状态
        if (isPro) {
          setStatus('allowed');
        } else if (newCount >= 3) {
          setStatus('blocked_subscribe');
        } else {
          setStatus('allowed');
        }
      } catch (error) {
        console.error("Failed to consume usage:", error);
      }
    }
  }, [isSignedIn, isPro]);

  return {
    status,
    usedCount,
    consume,
  };
}
