import json
import os
from typing import List, Optional

from ..schemas import (
    TargetSpec, StoryFacts, VariantStrategy, VariantPack, Scorecard
)
from ..llm.router import generate_variant_json


# ─────────────────────────────────────────────
# Agent 1: Core Story Extractor
# ─────────────────────────────────────────────
async def agent_extract_story(source_script: str, style_guide: Optional[str]) -> dict:
    """Extract immutable facts from the source script."""
    user_prompt = f"""MODE: STORY_FACTS
Carefully analyze the following source script and extract ALL story facts.
Be thorough — every claim, number, URL, product name, and metric matters.

SOURCE SCRIPT:
\"\"\"
{source_script}
\"\"\"

{f"STYLE GUIDE: {style_guide}" if style_guide else ""}

Return JSON with EXACTLY this structure:
{{
  "mode": "STORY_FACTS",
  "product_name": "<main product or subject name, or null>",
  "core_message": "<one clear sentence summarizing the product's core value proposition>",
  "core_claims": ["<every factual claim from the script — be exhaustive>"],
  "key_claims": ["<the 3-5 MOST important claims that must appear in every variant>"],
  "required_terms": ["<exact brand names, product names, URLs, codes, certifications that must appear verbatim in all variants>"],
  "banned_terms": [],
  "numbers_and_metrics": ["<every specific number, stat, price, percentage, date mentioned>"],
  "assumptions": ["<anything implied but not stated>"],
  "unknowns": ["<anything missing or unclear>"],
  "constraints": ["<elements that must NOT be changed across variants>"]
}}

IMPORTANT:
- core_message must be a single, compelling sentence (not a list).
- key_claims should be the top 3-5 most critical claims from core_claims.
- required_terms: include ALL brand names, product names, URLs, promo codes, certifications.
- numbers_and_metrics: include ALL prices, percentages, counts, durations, dates.
- Be exhaustive in core_claims — do not skip any factual statement from the script.

Return JSON only."""

    return await generate_variant_json(user_prompt)


# ─────────────────────────────────────────────
# Agent 2: Variant Pack Generator
# ─────────────────────────────────────────────
async def agent_variant_pack(story_facts: dict, target: dict, style_guide: Optional[str] = None) -> dict:
    """Generate the full variant pack (strategy, script, scenes) for a target."""
    user_prompt = f"""MODE: VARIANT_PACK
Generate a complete Variant Pack for the following target audience, based on the extracted story facts.

STORY FACTS:
{json.dumps(story_facts, indent=2)}

TARGET:
{json.dumps(target, indent=2)}

{f"STYLE GUIDE: {style_guide}" if style_guide else ""}

Ensure the output exactly matches the VARIANT_PACK JSON schema defined in your system prompt."""

    return await generate_variant_json(user_prompt)


# ─────────────────────────────────────────────
# Agent 3: Critic / Evaluator
# ─────────────────────────────────────────────
async def agent_evaluate(variant_pack: dict, story_facts: dict, target: dict) -> dict:
    """Score a variant on faithfulness, tone, duration, platform fit, clarity."""
    user_prompt = f"""MODE: SCORECARD
You are a strict quality critic. Evaluate this video variant.

VARIANT PACK:
{json.dumps(variant_pack, indent=2)}

ORIGINAL STORY FACTS:
{json.dumps(story_facts, indent=2)}

TARGET SPEC:
{json.dumps(target, indent=2)}

Score on these 5 criteria (0-10 each):
1. faithfulness: Are all key claims preserved? Required terms present?
2. tone_match: Does the script match the requested tone/vocabulary?
3. duration_fit: Does the content approximately fit the target duration?
4. platform_fit: Is the style appropriate for the target platform?
5. clarity: Is the message clear and the reading level appropriate?

Return JSON with EXACTLY this structure:
{{
  "mode": "SCORECARD",
  "variant_id": "{variant_pack.get('variant_id', '')}",
  "total_score": <sum of all 5 scores>,
  "max_total": 50.0,
  "entries": [
    {{"criterion": "faithfulness", "score": <0-10>, "max_score": 10.0, "notes": "..."}},
    {{"criterion": "tone_match", "score": <0-10>, "max_score": 10.0, "notes": "..."}},
    {{"criterion": "duration_fit", "score": <0-10>, "max_score": 10.0, "notes": "..."}},
    {{"criterion": "platform_fit", "score": <0-10>, "max_score": 10.0, "notes": "..."}},
    {{"criterion": "clarity", "score": <0-10>, "max_score": 10.0, "notes": "..."}}
  ],
  "pass_threshold": <true if total_score >= 35>,
  "revision_needed": <true if any single score < 6>
}}"""

    return await generate_variant_json(user_prompt)


# ─────────────────────────────────────────────
# Pipeline orchestrator
# ─────────────────────────────────────────────
def update_status(job_path: str, status: str, progress: int, message: str):
    with open(os.path.join(job_path, "status.json"), "w") as f:
        json.dump({"status": status, "progress": progress, "message": message}, f)


async def run_pipeline(job_id: str, job_path: str, source_script: str,
                       targets: List[dict], style_guide: Optional[str] = None,
                       project_id: Optional[str] = None):
    """Run the full 5-agent pipeline for all targets."""
    use_crewai = os.getenv("USE_CREWAI", "false").lower() == "true"
    if use_crewai:
        try:
            from .crew.crew import run_crewai_pipeline
            update_status(job_path, "running", 10, "CrewAI: Booting multi-agent crew...")
            story_facts, strategies, variants, scorecards = run_crewai_pipeline(source_script, targets, style_guide)

            update_status(job_path, "running", 90, "Saving CrewAI results...")
            results = {
                "variants": variants,
                "scorecards": scorecards,
                "story_facts": story_facts,
                "strategies": strategies,
            }
            with open(os.path.join(job_path, "results.json"), "w") as f:
                json.dump(results, f, indent=2)
            with open(os.path.join(job_path, "story_facts.json"), "w") as f:
                json.dump(story_facts, f, indent=2)
            with open(os.path.join(job_path, "strategies.json"), "w") as f:
                json.dump(strategies, f, indent=2)

            update_status(job_path, "done", 100, "All variants generated successfully via CrewAI")
            return
        except Exception as e:
            print(f"[CrewAI Pipeline] Job {job_id} failed: {e}")
            import traceback
            traceback.print_exc()
            update_status(job_path, "error", 0, str(e))
            return

    try:
        update_status(job_path, "running", 5, "Agent 1: Extracting story facts...")

        story_facts = await agent_extract_story(source_script, style_guide)
        with open(os.path.join(job_path, "story_facts.json"), "w") as f:
            json.dump(story_facts, f, indent=2)

        update_status(job_path, "running", 20, "Agent 2: Generating Variant Packs...")

        variants = []
        scorecards = []

        for i, target in enumerate(targets):
            pct_base = 20 + int(70 * (i / len(targets)))
            target_label = target.get("id", f"target_{i}")

            update_status(job_path, "running", pct_base + 5,
                          f"Agent 2: Generating Variant Pack for {target_label}...")

            variant_pack = await agent_variant_pack(story_facts, target, style_guide)

            if "variant_id" not in variant_pack:
                variant_pack["variant_id"] = target.get("id", f"variant_{i}")

            variants.append(variant_pack)

            update_status(job_path, "running", pct_base + 15,
                          f"Agent 3: Evaluating {target_label}...")
            scorecard = await agent_evaluate(variant_pack, story_facts, target)

            if scorecard.get("revision_needed", False):
                update_status(job_path, "running", pct_base + 20,
                              f"Retrying {target_label} (score too low)...")
                variant_pack = await agent_variant_pack(story_facts, target, style_guide)
                if "variant_id" not in variant_pack:
                    variant_pack["variant_id"] = target.get("id", f"variant_{i}")
                variants[-1] = variant_pack
                scorecard = await agent_evaluate(variant_pack, story_facts, target)

            scorecards.append(scorecard)

        update_status(job_path, "running", 95, "Saving results...")

        results = {
            "variants": variants,
            "scorecards": scorecards,
            "story_facts": story_facts,
            "strategies": [],
        }

        with open(os.path.join(job_path, "results.json"), "w") as f:
            json.dump(results, f, indent=2)

        update_status(job_path, "done", 100, "All variants generated successfully")

    except Exception as e:
        print(f"[Pipeline] Job {job_id} failed: {e}")
        import traceback
        traceback.print_exc()
        update_status(job_path, "error", 0, str(e))
