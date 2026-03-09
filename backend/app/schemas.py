from pydantic import BaseModel
from typing import List, Optional, Dict, Any


# ══════════════════════════════════════════════
# Shared
# ══════════════════════════════════════════════
class JobResponse(BaseModel):
    job_id: str


class ProjectResponse(BaseModel):
    project_id: str
    job_id: str


# ══════════════════════════════════════════════
# PersonaCut Schemas
# ══════════════════════════════════════════════
class TargetSpec(BaseModel):
    id: str
    audience: str
    platform: str
    duration_sec: int
    tone: List[str]
    goal: str
    visual_style: str


class ProjectCreateRequest(BaseModel):
    source_script: str
    targets: List[TargetSpec]
    style_guide: Optional[str] = None


class StoryFacts(BaseModel):
    product_name: Optional[str] = None
    core_message: Optional[str] = None
    core_claims: List[str] = []
    key_claims: List[str] = []
    required_terms: List[str] = []
    banned_terms: List[str] = []
    numbers_and_metrics: List[str] = []
    assumptions: List[str] = []
    unknowns: List[str] = []
    constraints: List[str] = []


class VariantStrategy(BaseModel):
    target_id: str
    emphasis: List[str] = []
    suppress: List[str] = []
    compression_strategy: str = ""
    tone_direction: str = ""
    vocabulary_level: str = ""
    hook_type: str = ""


class Scene(BaseModel):
    start_sec: float
    end_sec: float
    narration: str = ""
    on_screen_text: str = ""
    visual_intent: str = ""
    visual_prompt: str = ""
    editing_notes: str = ""


class StyleTokens(BaseModel):
    pacing: str = ""
    caption_style: str = ""
    visual_style: str = ""
    music_mood: str = ""


class ConstraintsCheck(BaseModel):
    claims_preserved: bool = True
    banned_terms_used: List[str] = []
    required_terms_missing: List[str] = []
    approx_reading_level: str = ""


class VariantPack(BaseModel):
    variant_id: str
    audience: str
    platform: str
    duration_sec: int
    tone: List[str]
    script: Dict[str, Any] = {}
    scenes: List[Scene] = []
    style_tokens: StyleTokens = StyleTokens()
    personalization_rationale: List[str] = []
    constraints_check: ConstraintsCheck = ConstraintsCheck()


class ScoreEntry(BaseModel):
    criterion: str
    score: float = 0.0
    max_score: float = 10.0
    notes: str = ""


class Scorecard(BaseModel):
    variant_id: str
    total_score: float = 0.0
    max_total: float = 50.0
    entries: List[ScoreEntry] = []
    pass_threshold: bool = True
    revision_needed: bool = False


class ProjectResults(BaseModel):
    variants: List[VariantPack] = []
    scorecards: List[Scorecard] = []
    story_facts: Optional[StoryFacts] = None
    strategies: List[VariantStrategy] = []


# ══════════════════════════════════════════════
# TextGuard QA Schemas
# ══════════════════════════════════════════════
class QAFrameCheck(BaseModel):
    timestamp_sec: float
    frame_file: str = ""
    expected_text: str = ""
    detected_text: str = ""
    similarity_score: float = 0.0
    is_match: bool = True
    verdict: Optional[Dict[str, Any]] = None


class QAReport(BaseModel):
    variant_id: str = ""
    overall_score: float = 0.0
    frames_checked: int = 0
    issues_found: int = 0
    frames: List[QAFrameCheck] = []


# ══════════════════════════════════════════════
# Chatbot Schemas
# ══════════════════════════════════════════════
class ChatStatus(BaseModel):
    state: str = "idle"
    progress: int = 0
    message: str = ""

class ChatContext(BaseModel):
    app: str = "Opus.Prism"
    route: str
    project_id: Optional[str] = None
    job_id: Optional[str] = None
    variant_id: Optional[str] = None
    personacut_status: ChatStatus = ChatStatus()
    qa_status: ChatStatus = ChatStatus()
    has_results: bool = False
    has_qa_report: bool = False
    targets_count: int = 0
    recent_user_actions: List[str] = []
    recent_errors: List[str] = []
    available_routes: Dict[str, str] = {
        "home": "/",
        "results": "/results/{projectId}",
        "qa": "/qa/{projectId}/{variantId}"
    }

class ChatRequest(BaseModel):
    message: str
    context: ChatContext

class ChatQuickAction(BaseModel):
    label: str
    type: str
    value: str

class ChatLink(BaseModel):
    label: str
    url: str

class ChatResponse(BaseModel):
    message: str
    quick_actions: List[ChatQuickAction] = []
    links: List[ChatLink] = []
    tts_text: str = ""
    tone: str = "neutral"
    confidence: float = 1.0
