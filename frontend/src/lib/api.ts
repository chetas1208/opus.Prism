const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface TargetSpec {
    id: string;
    audience: string;
    platform: string;
    duration_sec: number;
    tone: string[];
    goal: string;
    visual_style: string;
}

// ── PersonaCut ──

export const createProject = async (
    sourceScript: string,
    targets: TargetSpec[],
    styleGuide?: string
) => {
    const body: any = { source_script: sourceScript, targets };
    if (styleGuide) body.style_guide = styleGuide;

    const res = await fetch(`${API}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Failed");
    return res.json() as Promise<{ project_id: string; job_id: string }>;
};

export const getJobStatus = async (jobId: string) => {
    const res = await fetch(`${API}/api/jobs/${jobId}/status`);
    if (!res.ok) throw new Error("Failed to get status");
    return res.json();
};

export const getProjectResults = async (projectId: string) => {
    const res = await fetch(`${API}/api/projects/${projectId}/results`);
    if (!res.ok) throw new Error("Results not ready");
    return res.json();
};

// ── TextGuard QA ──

export const runQA = async (
    projectId: string,
    variantId: string,
    videoFile: File,
    fps: number = 1,
    patch: boolean = true,
    expectedTextSource: string = "captions",
    expectedTextJson?: string,
) => {
    const form = new FormData();
    form.append("video", videoFile);
    form.append("variant_id", variantId);
    form.append("fps", String(fps));
    form.append("patch", String(patch));
    form.append("expected_text_source", expectedTextSource);
    if (expectedTextJson) form.append("expected_text_json", expectedTextJson);

    const res = await fetch(`${API}/api/projects/${projectId}/qa`, {
        method: "POST",
        body: form,
    });
    if (!res.ok) throw new Error("Failed to start QA");
    return res.json() as Promise<{ qa_job_id: string }>;
};

export const getQAReport = async (projectId: string, variantId: string) => {
    const res = await fetch(`${API}/api/projects/${projectId}/qa/${variantId}/report`);
    if (!res.ok) throw new Error("QA report not ready");
    return res.json();
};

export const getOriginalVideoUrl = (projectId: string, variantId: string) =>
    `${API}/api/projects/${projectId}/qa/${variantId}/original`;

export const getPatchedVideoUrl = (projectId: string, variantId: string) =>
    `${API}/api/projects/${projectId}/qa/${variantId}/patched`;

// ── Wan2.1 Video Generation ──

export const getVideoGenStatus = async (projectId: string) => {
    const res = await fetch(`${API}/api/projects/${projectId}/videogen/status`);
    if (!res.ok) return { enabled: false, generated_variants: [] };
    return res.json() as Promise<{ enabled: boolean; generated_variants: string[] }>;
};

export const triggerVideoGen = async (
    projectId: string,
    variantId: string,
    mode: "full_variant" | "first_scene_only" = "full_variant"
) => {
    const res = await fetch(`${API}/api/projects/${projectId}/videogen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant_id: variantId, mode }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to start video generation");
    }
    return res.json() as Promise<{ job_id: string; variant_id: string; mode: string }>;
};

export const getGeneratedVideoUrl = (projectId: string, variantId: string) =>
    `${API}/api/projects/${projectId}/videogen/${variantId}/video`;
