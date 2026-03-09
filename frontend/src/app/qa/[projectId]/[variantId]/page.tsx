"use client";

import { useEffect, useState, use, useRef } from "react";
import { runQA, getJobStatus, getQAReport, getOriginalVideoUrl, getPatchedVideoUrl, getQAFrameUrl } from "@/lib/api";
import {
    Upload, Loader2, ArrowLeft, Download, CheckCircle, XCircle,
    AlertTriangle, Shield, Play, Eye
} from "lucide-react";

export default function QAPage({ params }: { params: Promise<{ projectId: string; variantId: string }> }) {
    const { projectId, variantId } = use(params);

    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [fps, setFps] = useState(1);
    const [doPatch, setDoPatch] = useState(true);
    const [expectedSource, setExpectedSource] = useState("captions");
    const [customExpected, setCustomExpected] = useState("");

    const [qaJobId, setQaJobId] = useState("");
    const [status, setStatus] = useState<any>(null);
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const fileInput = useRef<HTMLInputElement>(null);

    const handleSubmit = async () => {
        if (!videoFile) return setError("Upload a video first.");
        setLoading(true);
        setError("");
        try {
            const res = await runQA(
                projectId, variantId, videoFile, fps, doPatch, expectedSource,
                expectedSource === "custom" ? customExpected : undefined
            );
            setQaJobId(res.qa_job_id);
        } catch (e: any) {
            setError(e.message);
            setLoading(false);
        }
    };

    // Poll QA job
    useEffect(() => {
        if (!qaJobId) return;
        let interval: NodeJS.Timeout;
        const poll = async () => {
            try {
                const s = await getJobStatus(qaJobId);
                setStatus(s);
                if (s.status === "done" || s.status === "error") {
                    clearInterval(interval);
                    if (s.status === "done") {
                        const r = await getQAReport(projectId, variantId);
                        setReport(r);
                    }
                    setLoading(false);
                }
            } catch { /* */ }
        };
        poll();
        interval = setInterval(poll, 2000);
        return () => clearInterval(interval);
    }, [qaJobId, projectId, variantId]);

    return (
        <main className="min-h-[calc(100vh-64px)] p-6 pb-20 relative overflow-hidden">
            <div className="absolute top-[-15%] left-[20%] w-[500px] h-[500px] bg-accent-cyan/5 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-5xl mx-auto space-y-8 relative z-10 py-4">
                {/* Header */}
                <div>
                    <a href={`/results/${projectId}?job=`} className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-accent-blue transition-colors mb-3">
                        <ArrowLeft className="w-3 h-3" /> Back to variants
                    </a>
                    <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
                        <Shield className="w-8 h-8" /> TextGuard QA
                    </h1>
                    <p className="text-muted font-mono text-xs mt-1 tracking-wider">
                        VARIANT {variantId} · PROJECT {projectId.slice(0, 8)}…
                    </p>
                </div>

                {/* Upload + Config */}
                {!qaJobId && (
                    <div className="glass-card rounded-2xl p-6 gradient-border space-y-5">
                        <h2 className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                            <Upload className="w-4 h-4 text-accent-cyan" /> Upload Rendered Video
                        </h2>

                        {/* File upload */}
                        <div
                            onClick={() => fileInput.current?.click()}
                            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-accent-cyan/50 transition-all"
                        >
                            <input ref={fileInput} type="file" accept="video/mp4" className="hidden"
                                onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
                            {videoFile ? (
                                <div className="flex items-center justify-center gap-2 text-sm text-accent-cyan">
                                    <Play className="w-4 h-4" /> {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)
                                </div>
                            ) : (
                                <div className="text-muted text-sm">Click to upload .mp4 · Max 50MB</div>
                            )}
                        </div>

                        {/* Config */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-[10px] text-muted font-mono uppercase" htmlFor="fps-input">FPS</label>
                                <input id="fps-input" type="number" value={fps} onChange={(e) => setFps(parseInt(e.target.value) || 1)} min={1} max={5}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-accent-blue/50" />
                            </div>
                            <div>
                                <label className="text-[10px] text-muted font-mono uppercase" htmlFor="patch-toggle">Patch Video</label>
                                <button id="patch-toggle" type="button" onClick={() => setDoPatch(!doPatch)}
                                    className={`w-full py-2 px-3 rounded-lg text-xs font-medium border transition-all ${doPatch ? "bg-accent-cyan/10 border-accent-cyan/40 text-accent-cyan" : "bg-card border-border text-muted"}`}>
                                    {doPatch ? "ON" : "OFF"}
                                </button>
                            </div>
                            <div>
                                <label className="text-[10px] text-muted font-mono uppercase" htmlFor="source-select">Expected Text</label>
                                <select id="source-select" value={expectedSource} onChange={(e) => setExpectedSource(e.target.value)}
                                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-accent-blue/50">
                                    <option value="captions">From Captions</option>
                                    <option value="custom">Custom JSON</option>
                                </select>
                            </div>
                        </div>

                        {expectedSource === "custom" && (
                            <textarea value={customExpected} onChange={(e) => setCustomExpected(e.target.value)}
                                rows={4} placeholder='[{"t_start":0,"t_end":5,"text":"Hello World"}]'
                                className="w-full bg-card/50 border border-border rounded-xl p-3 text-xs font-mono focus:outline-none focus:border-accent-cyan/50 resize-none placeholder:text-muted/40" />
                        )}

                        {error && (
                            <div className="flex items-center gap-2 text-danger bg-danger/10 p-3 rounded-xl border border-danger/20 text-sm">
                                <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
                            </div>
                        )}

                        <button onClick={handleSubmit} disabled={loading || !videoFile}
                            className="w-full py-4 px-6 btn-gradient text-white font-bold rounded-xl flex items-center justify-center gap-3">
                            <Shield className="w-5 h-5" /> Run QA Analysis
                        </button>
                    </div>
                )}

                {/* Running / Loading */}
                {qaJobId && !report && (
                    <div className="glass-card rounded-2xl p-10 max-w-sm mx-auto text-center space-y-6">
                        <Loader2 className="w-10 h-10 text-accent-cyan animate-spin mx-auto" />
                        <h2 className="text-xl font-bold gradient-text">TextGuard Running</h2>
                        <div className="space-y-2">
                            <div className="w-full bg-card rounded-full h-2 overflow-hidden border border-border/50">
                                <div className="progress-bar-fill h-full rounded-full transition-all" style={{ width: `${status?.progress || 5}%` }} />
                            </div>
                            <div className="flex justify-between text-xs text-muted font-mono">
                                <span>{status?.message || "Starting…"}</span>
                                <span>{status?.progress || 0}%</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* QA Report */}
                {report && (
                    <div className="space-y-6">
                        {/* Summary */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="glass-card rounded-xl p-5 text-center">
                                <div className={`text-3xl font-extrabold ${report.overall_score >= 75 ? "text-success" : report.overall_score >= 50 ? "text-warning" : "text-danger"}`}>
                                    {report.overall_score.toFixed(0)}%
                                </div>
                                <div className="text-xs text-muted mt-1 font-mono">Overall Score</div>
                            </div>
                            <div className="glass-card rounded-xl p-5 text-center">
                                <div className="text-3xl font-extrabold text-foreground">{report.frames_checked}</div>
                                <div className="text-xs text-muted mt-1 font-mono">Frames Checked</div>
                            </div>
                            <div className="glass-card rounded-xl p-5 text-center">
                                <div className={`text-3xl font-extrabold ${report.issues_found === 0 ? "text-success" : "text-danger"}`}>{report.issues_found}</div>
                                <div className="text-xs text-muted mt-1 font-mono">Issues Found</div>
                            </div>
                        </div>

                        {/* Videos */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="glass-card rounded-xl p-4">
                                <h3 className="text-xs font-mono text-muted uppercase tracking-wider mb-2 flex items-center gap-2"><Eye className="w-3 h-3" /> Original</h3>
                                <video controls className="w-full rounded-lg border border-border" src={getOriginalVideoUrl(projectId, variantId)} />
                            </div>
                            <div className="glass-card rounded-xl p-4 glow-cyan">
                                <h3 className="text-xs font-mono text-accent-cyan uppercase tracking-wider mb-2 flex items-center gap-2"><Shield className="w-3 h-3" /> Patched</h3>
                                <video controls className="w-full rounded-lg border border-accent-cyan/30" src={getPatchedVideoUrl(projectId, variantId)} />
                            </div>
                        </div>

                        {/* Frame Results */}
                        <div className="glass-card rounded-xl p-5 space-y-3">
                            <h3 className="text-xs font-mono text-accent-blue uppercase tracking-widest">Frame-by-Frame Results</h3>
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                {(report.frames || []).map((fr: any, i: number) => (
                                    <div key={i} className={`bg-background/40 rounded-xl p-4 border ${fr.is_match ? "border-success/20" : "border-danger/30"} shadow-sm flex flex-col sm:flex-row gap-4`}>
                                        {/* Frame Image */}
                                        {fr.frame_file && (
                                            <div className="shrink-0 w-full sm:w-48 pt-1">
                                                <img
                                                    src={getQAFrameUrl(projectId, variantId, fr.frame_file)}
                                                    alt={`Frame at ${fr.timestamp_sec}s`}
                                                    className="w-full h-auto rounded-lg border border-border bg-black object-cover"
                                                />
                                                <div className="text-center mt-1 text-[10px] items-center text-muted font-mono flex justify-center gap-1">
                                                    <span>{fr.timestamp_sec}s</span>
                                                    <span>•</span>
                                                    <span className={`font-bold ${fr.is_match ? "text-success" : "text-danger"}`}>
                                                        {fr.is_match ? "PASS" : "FAIL"} ({fr.similarity_score.toFixed(0)}%)
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Frame Data */}
                                        <div className="flex-1 text-xs">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="bg-card/30 p-3 rounded-lg border border-border/50">
                                                    <span className="text-muted font-mono uppercase tracking-widest text-[10px]">Expected Text</span>
                                                    <p className="mt-1 text-foreground/90 font-medium leading-relaxed">{fr.expected_text || "—"}</p>
                                                </div>
                                                <div className="bg-card/30 p-3 rounded-lg border border-border/50">
                                                    <span className="text-muted font-mono uppercase tracking-widest text-[10px]">Detected OCR Text</span>
                                                    <p className="mt-1 font-mono text-foreground/80 leading-relaxed bg-foreground/5 py-0.5 px-1 rounded break-words">{fr.detected_text || "—"}</p>
                                                </div>
                                            </div>
                                            {fr.verdict && !fr.is_match && (
                                                <div className="mt-3 bg-danger/5 rounded-lg p-3 border border-danger/20">
                                                    <div className="flex items-center gap-2 text-xs font-bold">
                                                        <AlertTriangle className="w-3 h-3 text-danger" />
                                                        <span className="text-danger">{fr.verdict.issue_type}</span>
                                                        <span className="text-muted font-normal mx-1">→</span>
                                                        <span className="text-foreground/90">{fr.verdict.recommended_action}</span>
                                                    </div>
                                                    <p className="text-muted/80 text-xs mt-1 leading-relaxed border-l-2 border-danger/30 pl-2 ml-1.5">{fr.verdict.reason}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Download Report */}
                        <button onClick={() => {
                            const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
                            const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
                            a.download = `qa_report_${variantId}.json`; a.click();
                        }}
                            className="w-full max-w-sm mx-auto py-3 px-4 rounded-xl border border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/10 transition-all text-sm font-medium flex items-center justify-center gap-2">
                            <Download className="w-4 h-4" /> Download QA Report
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
