import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";

export const dynamic = "force-dynamic";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import { ClerkSync } from "@/components/clerk-sync";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-plus-jakarta",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "PlatePilot - Your Meal Audit Companion",
  description: "AI-powered meal audit assistant",
  verification: {
    google: "MjSe93YhxaWdsFGs7h4l8nEJK2AUEWMFN8VivWPM4NM",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
        </head>
        <body
          className={`${plusJakarta.variable} font-sans antialiased`}
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          <ClerkSync />
          <Providers>{children}</Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
