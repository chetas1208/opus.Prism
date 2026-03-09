"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject, TargetSpec } from "@/lib/api";
import { Plus, Trash2, Zap, AlertCircle, Users, Tv, Clock } from "lucide-react";

const DEFAULT_TARGET: TargetSpec = {
  id: "",
  audience: "",
  platform: "",
  duration_sec: 30,
  tone: [],
  goal: "",
  visual_style: "",
};

const PRESETS = [
  {
    label: "TikTok 15s",
    target: {
      id: "tiktok_casual_15",
      audience: "casual viewer",
      platform: "TikTok",
      duration_sec: 15,
      tone: ["energetic", "friendly", "simple"],
      goal: "hook + curiosity",
      visual_style: "bold captions, quick cuts, meme-ish",
    },
  },
  {
    label: "YouTube 45s Engineer",
    target: {
      id: "engineer_explainer_45",
      audience: "technical",
      platform: "YouTube Shorts",
      duration_sec: 45,
      tone: ["clear", "precise", "no fluff"],
      goal: "understand how it works",
      visual_style: "diagram overlays, labeled components",
    },
  },
  {
    label: "LinkedIn 30s Buyer",
    target: {
      id: "buyer_product_30",
      audience: "busy buyer",
      platform: "LinkedIn",
      duration_sec: 30,
      tone: ["confident", "trustworthy", "benefit-led"],
      goal: "conversion",
      visual_style: "clean product shots, credibility stats",
    },
  },
];

export default function Home() {
  const router = useRouter();
  const [script, setScript] = useState("");
  const [styleGuide, setStyleGuide] = useState("");
  const [targets, setTargets] = useState<TargetSpec[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const addTarget = (preset?: TargetSpec) => {
    const t = preset
      ? { ...preset }
      : { ...DEFAULT_TARGET, id: `target_${targets.length + 1}` };
    setTargets([...targets, t]);
  };

  const removeTarget = (idx: number) => {
    setTargets(targets.filter((_, i) => i !== idx));
  };

  const updateTarget = (idx: number, field: keyof TargetSpec, value: any) => {
    const updated = [...targets];
    (updated[idx] as any)[field] = value;
    setTargets(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!script.trim()) return setError("Paste or write your source script.");
    if (targets.length < 2) return setError("Add at least 2 target audiences.");

    try {
      setLoading(true);
      setError("");
      const res = await createProject(script, targets, styleGuide || undefined);
      router.push(`/results/${res.project_id}?job=${res.job_id}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-64px)] p-6 relative overflow-hidden">
      <div className="absolute top-[-15%] left-[20%] w-[500px] h-[500px] bg-accent-blue/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[400px] h-[400px] bg-accent-purple/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-10 relative z-10 py-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card/50 text-xs text-muted font-mono">
            <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse" />
            Opus.Prism
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight gradient-text">
            PersonaCut
          </h1>
          <p className="text-muted text-lg max-w-lg mx-auto">
            One script. Multiple audiences. Instantly tailored video plans.
            <span className="block text-sm mt-1 text-muted/60">PersonaCut · OPBot · TextGuard QA</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Script Input */}
          <div className="glass-card rounded-2xl p-6 gradient-border space-y-3">
            <label className="text-sm font-semibold text-foreground/80 tracking-wide flex items-center gap-2">
              <Tv className="w-4 h-4 text-accent-blue" />
              SOURCE SCRIPT / IDEA
            </label>
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={6}
              placeholder="Paste your video script, product description, or story idea here..."
              className="w-full bg-card/50 border border-border rounded-xl p-4 text-sm text-foreground/90 focus:outline-none focus:border-accent-blue/50 focus:ring-1 focus:ring-accent-blue/20 font-sans resize-none transition-all placeholder:text-muted/40"
            />
            <details className="text-xs text-muted">
              <summary className="cursor-pointer hover:text-accent-cyan transition-colors">
                + Optional: Style guide / brand rules
              </summary>
              <textarea
                value={styleGuide}
                onChange={(e) => setStyleGuide(e.target.value)}
                rows={3}
                placeholder="Brand colors, typography rules, do/don't guidelines..."
                className="w-full mt-2 bg-card/50 border border-border rounded-xl p-3 text-sm text-foreground/80 focus:outline-none focus:border-accent-cyan/50 font-sans resize-none transition-all placeholder:text-muted/40"
              />
            </details>
          </div>

          {/* Target Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-accent-purple" />
                Target Audiences
                <span className="text-xs font-mono text-muted ml-2">({targets.length} added)</span>
              </h2>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => addTarget(p.target)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card/50 text-muted hover:text-accent-cyan hover:border-accent-cyan/40 transition-all duration-200"
                >
                  + {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => addTarget()}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-dashed border-border bg-transparent text-muted hover:text-accent-blue hover:border-accent-blue/40 transition-all duration-200 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Custom
              </button>
            </div>

            {/* Target Cards */}
            <div className="space-y-3">
              {targets.map((t, idx) => (
                <div key={idx} className="glass-card rounded-xl p-5 space-y-3 hover:translate-y-[-1px] transition-all duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-accent-purple uppercase tracking-wider">
                      Variant {idx + 1}
                    </span>
                    <button type="button" onClick={() => removeTarget(idx)}
                      className="text-muted hover:text-danger transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] text-muted font-mono uppercase">ID</label>
                      <input value={t.id} onChange={(e) => updateTarget(idx, "id", e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-accent-blue/50 transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted font-mono uppercase">Audience</label>
                      <input value={t.audience} onChange={(e) => updateTarget(idx, "audience", e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-accent-blue/50 transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted font-mono uppercase">Platform</label>
                      <input value={t.platform} onChange={(e) => updateTarget(idx, "platform", e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-accent-blue/50 transition-all" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted font-mono uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> Duration</label>
                      <input type="number" value={t.duration_sec} onChange={(e) => updateTarget(idx, "duration_sec", parseInt(e.target.value) || 0)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-accent-blue/50 transition-all" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-muted font-mono uppercase">Tone (comma-separated)</label>
                      <input value={t.tone.join(", ")} onChange={(e) => updateTarget(idx, "tone", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-accent-blue/50 transition-all" placeholder="energetic, friendly" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted font-mono uppercase">Goal</label>
                      <input value={t.goal} onChange={(e) => updateTarget(idx, "goal", e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-accent-blue/50 transition-all" placeholder="hook + curiosity" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted font-mono uppercase">Visual Style</label>
                      <input value={t.visual_style} onChange={(e) => updateTarget(idx, "visual_style", e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-accent-blue/50 transition-all" placeholder="bold captions, quick cuts" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-danger bg-danger/10 p-3 rounded-xl border border-danger/20 text-sm font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            </div>
          )}

          {/* Submit */}
          <button type="submit" disabled={loading}
            className="w-full py-4 px-6 btn-gradient text-white font-bold rounded-xl flex items-center justify-center gap-3 text-base tracking-wide">
            {loading ? (
              <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating Variants…</>
            ) : (
              <><Zap className="w-5 h-5" /> Generate {targets.length} Variant{targets.length !== 1 ? "s" : ""}</>
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
