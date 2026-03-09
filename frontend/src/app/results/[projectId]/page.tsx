"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useSearchParams } from "next/navigation";
import { getJobStatus, getProjectResults } from "@/lib/api";
import { buildDetailedPrompt, copyToClipboard } from "@/lib/prompt";
import {
    Loader2, XCircle, ArrowLeft, Download, CheckCircle,
    AlertTriangle, Users, Tv, Zap, BarChart3, Shield, ClipboardCopy, Check
} from "lucide-react";

export default function ResultsPage({ params }: { params: Promise<{ projectId: string }> }) {
    const { projectId } = use(params);
    const searchParams = useSearchParams();
    const jobId = searchParams.get("job") || "";

    const [status, setStatus] = useState<any>(null);
    const [results, setResults] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

    const handleCopyPrompt = useCallback(async () => {
        if (!results?.variants?.[activeTab]) return;
        const prompt = buildDetailedPrompt({
            projectName: results?.story_facts?.product_name,
            storyFacts: results?.story_facts,
            variantPack: results.variants[activeTab],
        });
        const ok = await copyToClipboard(prompt);
        setCopyState(ok ? "copied" : "failed");
        setTimeout(() => setCopyState("idle"), 1500);
    }, [results, activeTab]);

    useEffect(() => {
        if (!jobId) return;
        let interval: NodeJS.Timeout;

        const poll = async () => {
            try {
                const data = await getJobStatus(jobId);
                setStatus(data);
                if (data.status === "done" || data.status === "error") {
                    clearInterval(interval);
                    if (data.status === "done") {
                        const res = await getProjectResults(projectId);
                        setResults(res);
                    }
                    setLoading(false);
                }
            } catch (err) { console.error(err); }
        };

        poll();
        interval = setInterval(poll, 2000);
        return () => clearInterval(interval);
    }, [jobId, projectId]);

    // ── Loading ──
    if (loading || (status?.status !== "done" && status?.status !== "error")) {
        return (
            <main className="min-h-[calc(100vh-64px)] flex items-center justify-center p-6 relative overflow-hidden">
                <div className="absolute top-[-20%] left-[30%] w-[400px] h-[400px] bg-accent-purple/5 rounded-full blur-[120px] pointer-events-none" />
                <div className="glass-card rounded-2xl p-10 max-w-sm w-full text-center space-y-6">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-accent-blue/10 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold gradient-text mb-1">Generating Variants</h2>
                        <p className="text-sm text-muted">5-agent pipeline running…</p>
                    </div>
                    <div className="space-y-2">
                        <div className="w-full bg-card rounded-full h-2 overflow-hidden border border-border/50">
                            <div className="progress-bar-fill h-full rounded-full transition-all duration-500"
                                style={{ width: `${status?.progress || 5}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-muted font-mono">
                            <span>{status?.message || "Starting…"}</span>
                            <span>{status?.progress || 0}%</span>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    // ── Error ──
    if (status?.status === "error") {
        return (
            <main className="min-h-[calc(100vh-64px)] flex items-center justify-center p-6">
                <div className="glass-card rounded-2xl p-10 max-w-md w-full text-center space-y-4">
                    <XCircle className="w-12 h-12 text-danger mx-auto" />
                    <h2 className="text-xl font-bold text-danger">Pipeline Failed</h2>
                    <p className="text-sm text-muted font-mono">{status.message}</p>
                    <a href="/" className="inline-flex items-center gap-2 text-sm text-accent-blue hover:text-accent-cyan transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Try Again
                    </a>
                </div>
            </main>
        );
    }

    // ── Dashboard ──
    const variants = results?.variants || [];
    const scorecards = results?.scorecards || [];
    const storyFacts = results?.story_facts;
    const v = variants[activeTab];
    const sc = scorecards[activeTab];

    return (
        <main className="min-h-[calc(100vh-64px)] p-6 pb-20 relative overflow-hidden">
            <div className="absolute top-[-15%] right-[10%] w-[500px] h-[500px] bg-accent-blue/3 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-7xl mx-auto space-y-8 relative z-10">
                {/* Header */}
                <div>
                    <a href="/" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent-blue transition-colors mb-3">
                        <ArrowLeft className="w-3 h-3" /> New project
                    </a>
                    <h1 className="text-3xl font-bold gradient-text">Variant Results</h1>
                    <p className="text-muted font-mono text-xs mt-1 tracking-wider">
                        PROJECT {projectId.slice(0, 8)}… · {variants.length} variants
                    </p>
                </div>

                {/* Story Facts */}
                {storyFacts && (
                    <div className="glass-card rounded-xl p-5">
                        <h3 className="text-xs font-mono text-accent-cyan uppercase tracking-widest mb-3">Extracted Story Facts</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div><div className="text-muted font-mono mb-1">Product</div><div className="font-semibold">{storyFacts.product_name || "—"}</div></div>
                            <div><div className="text-muted font-mono mb-1">Core Message</div><div className="font-semibold text-foreground/80">{storyFacts.core_message || "—"}</div></div>
                            <div><div className="text-muted font-mono mb-1">Key Claims</div><div>{storyFacts.key_claims?.length || 0} extracted</div></div>
                            <div><div className="text-muted font-mono mb-1">Required Terms</div><div>{storyFacts.required_terms?.length || 0} locked</div></div>
                        </div>
                    </div>
                )}

                {/* Variant Tabs */}
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {variants.map((variant: any, i: number) => {
                        const s = scorecards[i];
                        const pct = s ? (s.total_score / (s.max_total || 50)) * 100 : 0;
                        return (
                            <button key={i} onClick={() => setActiveTab(i)}
                                className={`flex-shrink-0 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border ${activeTab === i
                                        ? "glass-card border-accent-purple/50 glow-purple text-foreground"
                                        : "bg-card/30 border-border text-muted hover:border-accent-blue/30"
                                    }`}>
                                <div className="flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5" />
                                    <span className="font-mono text-xs">{variant.variant_id}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-[10px]">
                                    <span className="text-accent-cyan">{variant.platform}</span>
                                    <span>·</span>
                                    <span>{variant.duration_sec}s</span>
                                    <span>·</span>
                                    <span className={pct >= 70 ? "text-success" : pct >= 50 ? "text-warning" : "text-danger"}>{pct.toFixed(0)}%</span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Active Variant */}
                {v && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Script */}
                            <div className="glass-card rounded-xl p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-mono text-accent-blue uppercase tracking-widest">Script</h3>
                                    <div className="flex gap-1">
                                        {v.tone?.map((t: string, i: number) => (
                                            <span key={i} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-accent-purple/10 text-accent-purple border border-accent-purple/20">{t}</span>
                                        ))}
                                    </div>
                                </div>
                                <div className="bg-background/50 rounded-lg p-4 text-sm leading-relaxed">{v.script?.voiceover || "No voiceover."}</div>
                                {v.script?.captions?.length > 0 && (
                                    <div>
                                        <h4 className="text-[10px] text-muted font-mono uppercase mb-2">Captions</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {v.script.captions.map((c: string, i: number) => (
                                                <span key={i} className="px-2 py-1 rounded-lg bg-card text-xs font-medium border border-border">{c}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Scenes */}
                            <div className="glass-card rounded-xl p-5 space-y-3">
                                <h3 className="text-xs font-mono text-accent-cyan uppercase tracking-widest flex items-center gap-2">
                                    <Tv className="w-3.5 h-3.5" /> Shot Plan · {v.scenes?.length || 0} scenes
                                </h3>
                                <div className="space-y-2">
                                    {(v.scenes || []).map((scene: any, i: number) => (
                                        <div key={i} className="bg-background/40 rounded-lg p-4 border border-border/50 hover:border-accent-cyan/30 transition-all">
                                            <span className="text-[10px] font-mono text-accent-cyan bg-accent-cyan/10 px-2 py-0.5 rounded">{scene.start_sec}s — {scene.end_sec}s</span>
                                            <div className="grid grid-cols-2 gap-3 text-xs mt-2">
                                                <div><div className="text-muted font-mono text-[10px] mb-1">NARRATION</div><div className="text-foreground/80">{scene.narration || "—"}</div></div>
                                                <div><div className="text-muted font-mono text-[10px] mb-1">ON-SCREEN</div><div className="text-foreground/80 font-semibold">{scene.on_screen_text || "—"}</div></div>
                                                <div><div className="text-muted font-mono text-[10px] mb-1">VISUAL INTENT</div><div className="text-foreground/70">{scene.visual_intent || "—"}</div></div>
                                                <div><div className="text-muted font-mono text-[10px] mb-1">PROMPT</div><div className="text-foreground/70 font-mono text-[10px]">{scene.visual_prompt || "—"}</div></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Rationale */}
                            {v.personalization_rationale?.length > 0 && (
                                <div className="glass-card rounded-xl p-5 space-y-2">
                                    <h3 className="text-xs font-mono text-accent-purple uppercase tracking-widest">Why This Variant Is Different</h3>
                                    <ul className="space-y-1">
                                        {v.personalization_rationale.map((r: string, i: number) => (
                                            <li key={i} className="text-sm text-foreground/70 flex items-start gap-2">
                                                <Zap className="w-3 h-3 text-accent-purple mt-1 shrink-0" /> {r}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Right Sidebar */}
                        <div className="space-y-6">
                            {/* Scorecard */}
                            {sc && (
                                <div className="glass-card rounded-xl p-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-mono text-accent-blue uppercase tracking-widest flex items-center gap-2"><BarChart3 className="w-3.5 h-3.5" /> Scorecard</h3>
                                        <div className={`text-lg font-extrabold ${sc.pass_threshold ? "text-success" : "text-danger"}`}>{sc.total_score?.toFixed(0)}/{sc.max_total || 50}</div>
                                    </div>
                                    <div className="space-y-2">
                                        {(sc.entries || []).map((e: any, i: number) => {
                                            const p = (e.score / e.max_score) * 100;
                                            return (
                                                <div key={i}>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-foreground/70 capitalize">{e.criterion?.replace(/_/g, " ")}</span>
                                                        <span className={`font-mono font-bold ${p >= 70 ? "text-success" : p >= 50 ? "text-warning" : "text-danger"}`}>{e.score}/{e.max_score}</span>
                                                    </div>
                                                    <div className="w-full bg-background/50 rounded-full h-1.5 overflow-hidden">
                                                        <div className={`h-full rounded-full transition-all ${p >= 70 ? "bg-success" : p >= 50 ? "bg-warning" : "bg-danger"}`} style={{ width: `${p}%` }} />
                                                    </div>
                                                    {e.notes && <p className="text-[10px] text-muted mt-1">{e.notes}</p>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                                        {sc.pass_threshold
                                            ? <><CheckCircle className="w-4 h-4 text-success" /><span className="text-xs text-success font-semibold">PASS</span></>
                                            : <><AlertTriangle className="w-4 h-4 text-warning" /><span className="text-xs text-warning font-semibold">NEEDS REVIEW</span></>}
                                    </div>
                                </div>
                            )}

                            {/* Style Tokens */}
                            {v.style_tokens && (
                                <div className="glass-card rounded-xl p-5 space-y-3">
                                    <h3 className="text-xs font-mono text-accent-cyan uppercase tracking-widest">Style Tokens</h3>
                                    {Object.entries(v.style_tokens).map(([k, val]) => (
                                        <div key={k} className="flex justify-between text-xs">
                                            <span className="text-muted capitalize">{k.replace(/_/g, " ")}</span>
                                            <span className="text-foreground/80 font-medium max-w-[60%] text-right">{val as string}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Export + Copy + QA */}
                            <button onClick={() => {
                                const blob = new Blob([JSON.stringify(v, null, 2)], { type: "application/json" });
                                const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                                a.download = `${v.variant_id}.json`; a.click();
                            }}
                                className="w-full py-3 px-4 rounded-xl border border-accent-blue/30 text-accent-blue hover:bg-accent-blue/10 transition-all text-sm font-medium flex items-center justify-center gap-2">
                                <Download className="w-4 h-4" /> Export JSON
                            </button>

                            <button onClick={handleCopyPrompt}
                                className={`w-full py-3 px-4 rounded-xl border transition-all text-sm font-medium flex items-center justify-center gap-2 ${
                                    copyState === "copied"
                                        ? "border-success/50 text-success bg-success/10"
                                        : copyState === "failed"
                                        ? "border-danger/50 text-danger bg-danger/10"
                                        : "border-accent-purple/30 text-accent-purple hover:bg-accent-purple/10"
                                }`}>
                                {copyState === "copied"
                                    ? <><Check className="w-4 h-4" /> Copied!</>
                                    : copyState === "failed"
                                    ? <><XCircle className="w-4 h-4" /> Copy Failed</>
                                    : <><ClipboardCopy className="w-4 h-4" /> Copy Detailed Prompt</>}
                            </button>

                            <a href={`/qa/${projectId}/${v.variant_id}`}
                                className="w-full py-3 px-4 rounded-xl btn-gradient text-white text-sm font-bold flex items-center justify-center gap-2">
                                <Shield className="w-4 h-4" /> Run TextGuard QA
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
