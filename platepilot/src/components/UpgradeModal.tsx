"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to create checkout session");
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      alert("Failed to start upgrade");
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
            Monthly Limit Reached
          </h2>
          <p className="text-gray-600 mb-6">
            You&apos;ve used your 3 free analyses this month. Upgrade to Pro for
            unlimited analyses!
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-3xl font-bold text-gray-900 mb-1">$9.9</p>
          <p className="text-gray-500">per month</p>
          <ul className="mt-4 text-left text-sm text-gray-600 space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Unlimited analyses
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Priority support
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span> Cancel anytime
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
            Maybe Later
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            onClick={handleUpgrade}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Upgrade Now"}
          </Button>
        </div>
      </div>
    </div>
  );
}
