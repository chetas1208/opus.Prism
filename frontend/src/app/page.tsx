"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, Zap, Shield, MessageCircle } from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();

  return (
    <main className="min-h-[calc(100vh-64px)] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-[-20%] left-[15%] w-[600px] h-[600px] bg-accent-blue/8 rounded-full blur-[140px] pointer-events-none animate-pulse [animation-duration:4s]" />
      <div className="absolute bottom-[-15%] right-[10%] w-[500px] h-[500px] bg-accent-purple/8 rounded-full blur-[120px] pointer-events-none animate-pulse [animation-duration:6s]" />
      <div className="absolute top-[30%] right-[25%] w-[300px] h-[300px] bg-accent-cyan/5 rounded-full blur-[100px] pointer-events-none animate-pulse [animation-duration:5s]" />

      <div className="max-w-3xl mx-auto text-center space-y-10 relative z-10">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center border-2 border-blue-500/40 shadow-[0_0_40px_rgba(59,130,246,0.4)] transition-transform hover:scale-110 duration-500">
            <Image
              src="/logo_3d.png"
              alt="Opus.Prism Logo"
              width={400}
              height={400}
              className="w-full h-full object-cover scale-[1.1]"
            />
          </div>
        </div>

        {/* Welcome Text */}
        <div className="space-y-4">
          <p className="text-muted text-sm font-mono tracking-widest uppercase">
            Welcome to
          </p>
          <h1 className="text-6xl sm:text-7xl lg:text-8xl font-extrabold tracking-tight gradient-text leading-none">
            Opus.Prism
          </h1>
          <p className="text-muted/80 text-lg sm:text-xl max-w-xl mx-auto leading-relaxed">
            Agentic multimodal video personalization.
            <span className="block text-base mt-1 text-muted/50">
              One script → multiple audiences → instant video plans.
            </span>
          </p>
        </div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div className="glass-card rounded-xl p-5 space-y-2 hover:translate-y-[-2px] transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center mx-auto group-hover:bg-accent-blue/20 transition-colors">
              <Zap className="w-5 h-5 text-accent-blue" />
            </div>
            <h3 className="text-sm font-bold text-foreground/90">PersonaCut</h3>
            <p className="text-[11px] text-muted/70 leading-relaxed">
              Generate audience-tailored variant packs from a single script.
            </p>
          </div>

          <div className="glass-card rounded-xl p-5 space-y-2 hover:translate-y-[-2px] transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-accent-purple/10 border border-accent-purple/20 flex items-center justify-center mx-auto group-hover:bg-accent-purple/20 transition-colors">
              <MessageCircle className="w-5 h-5 text-accent-purple" />
            </div>
            <h3 className="text-sm font-bold text-foreground/90">OPBot</h3>
            <p className="text-[11px] text-muted/70 leading-relaxed">
              Context-aware AI assistant guiding you through every step.
            </p>
          </div>

          <div className="glass-card rounded-xl p-5 space-y-2 hover:translate-y-[-2px] transition-all duration-300 group">
            <div className="w-10 h-10 rounded-lg bg-accent-cyan/10 border border-accent-cyan/20 flex items-center justify-center mx-auto group-hover:bg-accent-cyan/20 transition-colors">
              <Shield className="w-5 h-5 text-accent-cyan" />
            </div>
            <h3 className="text-sm font-bold text-foreground/90">TextGuard QA</h3>
            <p className="text-[11px] text-muted/70 leading-relaxed">
              OCR-based quality assurance for rendered video text overlays.
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div>
          <button
            onClick={() => router.push("/personacut")}
            className="group btn-gradient text-white font-bold py-4 px-10 rounded-xl text-base tracking-wide inline-flex items-center gap-3 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-300 hover:gap-4"
          >
            Continue
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
          </button>
          <p className="text-[11px] text-muted/40 mt-4 font-mono">
            Start building your first variant pack →
          </p>
        </div>
      </div>
    </main>
  );
}
