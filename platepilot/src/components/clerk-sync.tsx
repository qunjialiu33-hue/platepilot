"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

export function ClerkSync() {
  const { isSignedIn, isLoaded } = useUser();
  const prevSignedInRef = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;

    const prevSignedIn = prevSignedInRef.current;

    // Detect when user just signed in (transition from false to true)
    if (prevSignedIn === false && isSignedIn === true) {
      syncLocalUsageToServer();
    }

    prevSignedInRef.current = isSignedIn;
  }, [isSignedIn, isLoaded]);

  const syncLocalUsageToServer = async () => {
    try {
      const localCountStr = localStorage.getItem("free_uses_count");
      const localCount = localCountStr ? parseInt(localCountStr, 10) : 0;

      if (localCount > 0) {
        const response = await fetch("/api/usage/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ localCount }),
        });

        if (response.ok) {
          localStorage.removeItem("free_uses_count");
          console.log("Local usage synced to server");
        }
      }
    } catch (error) {
      console.error("Failed to sync local usage:", error);
    }
  };

  return null;
}
