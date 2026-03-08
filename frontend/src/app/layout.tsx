import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import { ChatWidget } from "@/components/ChatWidget";
import SpaceBackgroundV3 from "@/components/SpaceBackgroundV3";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "PersonaCut — Agentic Video Personalization",
  description: "A compiler from story → audience-specific video plans. Multimodal, agentic, instant.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${jetbrains.variable} antialiased bg-background text-foreground`}>
        <SpaceBackgroundV3 />
        <nav className="navbar-blur sticky top-0 z-50 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <a href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <Image src="/logo_3d.png" alt="PersonaCut Logo" width={400} height={400} className="w-full h-full object-cover scale-[1.1]" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-500 bg-clip-text text-transparent tracking-tight">PersonaCut</span>
            </a>
            <div className="flex items-center gap-4 text-sm text-muted">
              <span className="hidden sm:inline font-mono text-xs text-accent-cyan/60">v1.0</span>
            </div>
          </div>
        </nav>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
