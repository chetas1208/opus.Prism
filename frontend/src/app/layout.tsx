import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Image from "next/image";
import "./globals.css";
import { ChatWidget } from "@/components/ChatWidget";
import SpaceBackgroundV3 from "@/components/SpaceBackgroundV3";
import NavBrand from "@/components/NavBrand";
import { Github } from "lucide-react";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Opus.Prism — Agentic Video Personalization",
  description: "PersonaCut · OPBot · TextGuard QA — One script, multiple audiences, instantly tailored video plans.",
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
                <Image src="/logo_3d.png" alt="Opus.Prism Logo" width={400} height={400} className="w-full h-full object-cover scale-[1.1]" />
              </div>
              <NavBrand />
            </a>
            <div className="flex items-center gap-6 text-sm text-muted">
              <span className="hidden sm:inline font-mono text-xs text-accent-cyan/60">v1.0</span>
              <a
                href="https://github.com/chetas1208/opus.Prism"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-foreground/80 hover:text-white transition-colors"
                title="View on GitHub"
              >
                <Github className="w-5 h-5 animate-pulse text-accent-cyan" />
                <span className="font-mono text-xs hidden sm:inline-block">GitHub</span>
              </a>
            </div>
          </div>
        </nav>
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
