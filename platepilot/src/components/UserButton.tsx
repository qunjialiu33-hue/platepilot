"use client";

import { useEffect, useState } from "react";
import { SignedIn, SignedOut, UserButton as ClerkUserButton } from "@clerk/nextjs";
import Link from "next/link";

export default function UserMenu() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
      </div>
    );
  }

  return (
    <>
      <SignedIn>
        <div className="flex items-center gap-4">
          <Link
            href="/profile"
            className="px-4 py-2 text-sm text-white/60 hover:text-white font-medium"
          >
            Profile
          </Link>
          <ClerkUserButton />
        </div>
      </SignedIn>
      <SignedOut>
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800"
          >
            Sign Up
          </Link>
        </div>
      </SignedOut>
    </>
  );
}
