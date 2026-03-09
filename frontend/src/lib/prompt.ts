interface BuildDetailedPromptInput {
    projectName?: string;
    storyFacts?: Record<string, any>;
    variantPack: Record<string, any>;
}

function bulletList(items: any[] | undefined, indent = "  "): string {
    if (!items || items.length === 0) return `${indent}- (none)\n`;
    return items.map((item) => `${indent}- ${item}`).join("\n") + "\n";
}

export function buildDetailedPrompt({ projectName, storyFacts, variantPack }: BuildDetailedPromptInput): string {
    const v = variantPack;
    const scenes = [...(v.scenes || [])].sort(
        (a: any, b: any) => (a.start_sec ?? 0) - (b.start_sec ?? 0)
    );

    const lines: string[] = [];

    lines.push("TITLE: PersonaCut Variant Prompt");
    lines.push("");

    // ── Project ──
    lines.push("PROJECT:");
    lines.push(`- Name: ${projectName || "Untitled"}`);
    lines.push(`- Variant ID: ${v.variant_id || "—"}`);
    lines.push(`- Audience: ${v.audience || "—"}`);
    lines.push(`- Platform: ${v.platform || "—"}`);
    lines.push(`- Target Duration (sec): ${v.duration_sec ?? "—"}`);
    lines.push(`- Tone: ${(v.tone || []).join(", ") || "—"}`);
    lines.push("");

    // ── Story Facts ──
    if (storyFacts) {
        lines.push("STORY FACTS (IMMUTABLE):");
        lines.push("- Core claims:");
        lines.push(bulletList(storyFacts.core_claims, "    ").trimEnd());
        lines.push("- Required terms:");
        lines.push(bulletList(storyFacts.required_terms, "    ").trimEnd());
        lines.push("- Banned terms:");
        lines.push(bulletList(storyFacts.banned_terms, "    ").trimEnd());
        lines.push("- Numbers/metrics:");
        lines.push(bulletList(storyFacts.numbers_and_metrics, "    ").trimEnd());
        lines.push("");
    }

    // ── Output Requirements ──
    lines.push("OUTPUT REQUIREMENTS:");
    lines.push("- Generate a video plan and/or assets strictly matching the script and scene timing below.");
    lines.push("- All on-screen text must be readable, correctly spelled, and in the correct language.");
    lines.push("- Captions must match exactly (or be semantically identical if system supports minor rephrasing).");
    lines.push("- Preserve all immutable facts; do not invent new claims.");
    lines.push("");

    // ── Script ──
    lines.push("SCRIPT:");
    lines.push("VOICEOVER:");
    lines.push(v.script?.voiceover || "(no voiceover)");
    lines.push("");

    const captions: string[] = v.script?.captions || [];
    lines.push("CAPTIONS (ORDERED):");
    if (captions.length === 0) {
        lines.push("(none)");
    } else {
        captions.forEach((c: string, i: number) => {
            lines.push(`${i + 1}) ${c}`);
        });
    }
    lines.push("");

    // ── Shot Plan ──
    lines.push("SHOT PLAN (SCENES):");
    if (scenes.length === 0) {
        lines.push("(no scenes)");
    } else {
        scenes.forEach((s: any, i: number) => {
            lines.push(`Scene ${i + 1}`);
            lines.push(`- Time: ${s.start_sec ?? "?"}–${s.end_sec ?? "?"}s`);
            lines.push(`- Narration: ${s.narration || "—"}`);
            lines.push(`- On-screen text: ${s.on_screen_text || "—"}`);
            lines.push(`- Visual intent: ${s.visual_intent || "—"}`);
            lines.push(`- Visual prompt: ${s.visual_prompt || "—"}`);
            lines.push(`- Editing notes: ${s.editing_notes || "—"}`);
            if (i < scenes.length - 1) lines.push("");
        });
    }
    lines.push("");

    // ── Style Tokens ──
    const st = v.style_tokens || {};
    lines.push("STYLE TOKENS:");
    lines.push(`- Pacing: ${st.pacing || "—"}`);
    lines.push(`- Caption style: ${st.caption_style || "—"}`);
    lines.push(`- Visual style: ${st.visual_style || "—"}`);
    lines.push(`- Music mood: ${st.music_mood || "—"}`);
    lines.push("");

    // ── Quality Checklist ──
    const cc = v.constraints_check || {};
    lines.push("QUALITY CHECKLIST:");
    lines.push(`- claims_preserved: ${cc.claims_preserved ?? "—"}`);
    lines.push(`- required_terms_missing: ${JSON.stringify(cc.required_terms_missing ?? [])}`);
    lines.push(`- banned_terms_used: ${JSON.stringify(cc.banned_terms_used ?? [])}`);
    lines.push(`- approx_reading_level: ${cc.approx_reading_level || "—"}`);
    lines.push("");

    // ── Personalization Rationale ──
    const rationale: string[] = v.personalization_rationale || [];
    lines.push("PERSONALIZATION RATIONALE:");
    if (rationale.length === 0) {
        lines.push("(none)");
    } else {
        rationale.forEach((r: string) => lines.push(`- ${r}`));
    }
    lines.push("");
    lines.push("END");

    return lines.join("\n");
}

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        try {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand("copy");
            document.body.removeChild(ta);
            return ok;
        } catch {
            return false;
        }
    }
}
