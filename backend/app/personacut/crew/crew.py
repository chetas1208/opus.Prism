import os
import json
from crewai import Agent, Task, Crew, Process

def run_crewai_pipeline(source_script: str, targets: list, style_guide: str = None) -> tuple:
    """
    Runs a CrewAI process to generate video variants for targets.
    Returns (story_facts, strategies, variants, scorecards)
    """
    os.environ["OPENAI_API_BASE"] = os.getenv("LLM_VARIANT_BASE_URL", "http://localhost:8001/v1")
    os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_COMPAT_API_KEY", "dummy")
    
    config_kwargs = {}
    config_kwargs["llm"] = f"openai/{os.getenv('LLM_VARIANT_MODEL_ID', 'Qwen/Qwen2.5-14B-Instruct')}"
    
    # AGENT A: StoryFactsExtractor
    extractor = Agent(
        role='Source Script Analyst',
        goal='Extract immutable facts, constraints, and requirements from the original video script.',
        backstory='An expert content analyst who identifies core facts, requirements, and tone guidelines from raw transcripts.',
        verbose=True,
        allow_delegation=False,
        **config_kwargs
    )
    
    # Define extraction task once for the whole job
    json_instruction = "IMPORTANT: You MUST return ONLY valid JSON. No markdown formatting, no explanation."
    
    t_extract = Task(
        description=f"Analyze this script: {source_script}. Style Guide: {style_guide or 'None'}. Extract core facts into this JSON structure: \n{{\"product_name\": \"...\", \"key_claims\": [], \"constraints\": [], \"required_terms\": [], \"banned_terms\": [], \"numbers_and_stats\": [], \"core_message\": \"...\"}}\n{json_instruction}",
        expected_output="Valid JSON string with story facts.",
        agent=extractor
    )

    crew_extract = Crew(agents=[extractor], tasks=[t_extract], verbose=True)
    crew_extract.kickoff()
    
    def extract_json(task_output):
        text = str(task_output).strip()
        if text.startswith("```json"): text = text[7:]
        elif text.startswith("```"): text = text[3:]
        if text.endswith("```"): text = text[:-3]
        try:
            return json.loads(text.strip())
        except:
            return {}

    story_facts = extract_json(t_extract.output)
    
    # For each target, run the rest of the agents
    strategies = []
    variants = []
    scorecards = []
    
    for target in targets:
        # AGENT B: VariantStrategist
        strategist = Agent(
            role='Audience Strategist',
            goal='Formulate a precise content strategy matching the target audience parameters.',
            backstory='A veteran marketing director adapting a story to hook a specific demographic.',
            verbose=True,
            allow_delegation=False,
            **config_kwargs
        )

        # AGENT C: ScriptWriter
        writer = Agent(
            role='Video Script Writer',
            goal='Write a highly polished voiceover script and short captions based on the story facts and audience strategy.',
            backstory='A professional short-form video copywriter.',
            verbose=True,
            allow_delegation=False,
            **config_kwargs
        )
        
        # AGENT D: ShotPlanner
        planner = Agent(
            role='Visual Storyboarder',
            goal='Translate the script into a scene-by-scene visual plan with precise image prompts and durations.',
            backstory='Creative director visualizing compelling B-roll and narrative flow.',
            verbose=True,
            allow_delegation=False,
            **config_kwargs
        )

        # AGENT E: Critic
        critic = Agent(
            role='Quality Critic',
            goal='Evaluate the final script and visual plan against the original story facts and target audience parameters.',
            backstory='A ruthless quality assurance lead ensuring no factual inaccuracies or tone inconsistencies.',
            verbose=True,
            allow_delegation=False,
            **config_kwargs
        )
        
        t_strat = Task(
            description=f"Given facts: {json.dumps(story_facts)} and target: {json.dumps(target)}, create a strategy JSON: \n{{\"target_id\": \"{target.get('id', '')}\", \"emphasis\": [], \"suppress\": [], \"compression_strategy\": \"...\", \"tone_direction\": \"...\", \"vocabulary_level\": \"...\", \"hook_type\": \"...\"}}\n{json_instruction}",
            expected_output="Valid JSON string with variant strategy.",
            agent=strategist
        )

        t_write = Task(
            description=f"Using the story facts and strategy, write the script JSON for target {target.get('id', '')}: \n{{\"variant_id\": \"{target.get('id', '')}\", \"audience\": \"...\", \"platform\": \"...\", \"duration_sec\": 30, \"tone\": [], \"script\": {{\"voiceover\": \"...\", \"captions\": [\"...\"]}}, \"personalization_rationale\": [], \"constraints_check\": {{\"claims_preserved\": true, \"banned_terms_used\": [], \"required_terms_missing\": [], \"approx_reading_level\": \"...\"}}}}\n{json_instruction}",
            expected_output="Valid JSON string with video script.",
            agent=writer
        )
        
        t_plan = Task(
            description=f"Convert the script into a visual storyboard JSON array of scenes. Each scene format: \n{{\"start_sec\": 0.0, \"end_sec\": 5.0, \"narration\": \"...\", \"on_screen_text\": \"...\", \"visual_intent\": \"...\", \"visual_prompt\": \"...\", \"editing_notes\": \"...\"}}\nReturn the JSON array ONLY. {json_instruction}",
            expected_output="Valid JSON array string with scenes.",
            agent=planner
        )

        t_crit = Task(
            description=f"Evaluate the generated variant against the original story facts and target. Return evaluation JSON: \n{{\"variant_id\": \"{target.get('id', '')}\", \"total_score\": 45.0, \"max_total\": 50.0, \"entries\": [{{\"criterion\": \"...\", \"score\": 9.0, \"max_score\": 10.0, \"notes\": \"...\"}}], \"pass_threshold\": true, \"revision_needed\": false}}\n{json_instruction}",
            expected_output="Valid JSON string with critic evaluation.",
            agent=critic
        )

        crew_variant = Crew(
            agents=[strategist, writer, planner, critic],
            tasks=[t_strat, t_write, t_plan, t_crit],
            process=Process.sequential,
            verbose=True
        )
        
        crew_variant.kickoff()
        
        strategy = extract_json(t_strat.output)
        script = extract_json(t_write.output)
        scenes = extract_json(t_plan.output)
        scorecard = extract_json(t_crit.output)
        
        strategies.append(strategy)
        variants.append({
            "variant_id": target.get("id", ""),
            "audience": script.get("audience", ""),
            "platform": script.get("platform", ""),
            "duration_sec": script.get("duration_sec", 0),
            "tone": script.get("tone", []),
            "script": script.get("script", {}),
            "scenes": scenes if isinstance(scenes, list) else [],
            "personalization_rationale": script.get("personalization_rationale", []),
            "constraints_check": script.get("constraints_check", {})
        })
        scorecards.append(scorecard)
        
    return story_facts, strategies, variants, scorecards
