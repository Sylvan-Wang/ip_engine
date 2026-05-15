from pydantic import BaseModel, EmailStr
from typing import Optional, Any
from datetime import datetime


# ── Auth ─────────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: str
    email: str
    name: Optional[str]
    plan: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── IP Profile ────────────────────────────────────────────────────────────────
class IPProfileCreate(BaseModel):
    domain: Optional[str] = None
    identity: Optional[str] = None
    tagline: Optional[str] = None
    solve_problem: Optional[str] = None
    unique_opinion: Optional[str] = None
    core_audience: Optional[dict] = None
    expanded_audience: Optional[dict] = None
    broad_audience: Optional[dict] = None
    tone_tags: Optional[list[str]] = None
    monetization_goal: Optional[str] = None


class IPProfileUpdate(IPProfileCreate):
    pass


class StyleExtractRequest(BaseModel):
    contents: list[str]   # 1-5条历史内容文本


class IPProfileOut(BaseModel):
    id: str
    domain: Optional[str]
    identity: Optional[str]
    tagline: Optional[str]
    solve_problem: Optional[str]
    unique_opinion: Optional[str]
    core_audience: Optional[dict]
    expanded_audience: Optional[dict]
    broad_audience: Optional[dict]
    tone_tags: Optional[list]
    monetization_goal: Optional[str]
    style_memory: Optional[dict]
    summary_card: Optional[str]
    version: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Material ──────────────────────────────────────────────────────────────────
class MaterialCreate(BaseModel):
    type: str   # experience|method|opinion|data|feedback
    title: Optional[str] = None
    content: str
    tags: Optional[list[str]] = None


class MaterialOut(BaseModel):
    id: str
    type: str
    title: Optional[str]
    content: str
    tags: Optional[list]
    used_count: int
    created_at: datetime

    class Config:
        from_attributes = True


# ── Column ────────────────────────────────────────────────────────────────────
class ColumnCreate(BaseModel):
    name: str
    description: Optional[str] = None
    goal: Optional[str] = None
    frequency: Optional[str] = None
    content_type: Optional[str] = None  # awareness|trust|conversion


class ColumnOut(BaseModel):
    id: str
    name: str
    description: Optional[str]
    goal: Optional[str]
    frequency: Optional[str]
    content_type: Optional[str]
    is_active: bool
    sort_order: int

    class Config:
        from_attributes = True


# ── Topic Recommendation ──────────────────────────────────────────────────────
class TopicRecommendationOut(BaseModel):
    id: str
    customized_title: str
    reason: str
    audience_tier: Optional[str]
    content_type: Optional[str]
    platform: str
    status: str
    week_of: str
    column_id: Optional[str]
    column: Optional[ColumnOut]
    created_at: datetime

    class Config:
        from_attributes = True


# ── Content Generation ────────────────────────────────────────────────────────
class ContentGenerateRequest(BaseModel):
    recommendation_id: str
    platform: str = "universal"
    material_ids: Optional[list[str]] = None


class ContentUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    title_variants: Optional[list[str]] = None
    cover_copy: Optional[str] = None
    hashtags: Optional[list[str]] = None
    comment_hook: Optional[str] = None
    status: Optional[str] = None


class ContentOut(BaseModel):
    id: str
    recommendation_id: Optional[str]
    column_id: Optional[str]
    title: Optional[str]
    body: str
    title_variants: Optional[list]
    cover_copy: Optional[str]
    hashtags: Optional[list]
    comment_hook: Optional[str]
    video_script: Optional[str]
    platform: str
    status: str
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ── Review ────────────────────────────────────────────────────────────────────
class ReviewCreate(BaseModel):
    content_id: str
    views: Optional[int] = None
    likes: Optional[int] = None
    saves: Optional[int] = None
    comments: Optional[int] = None
    new_followers: Optional[int] = None
    dm_count: Optional[int] = None
    led_to_inquiry: bool = False
    notes: Optional[str] = None


class ReviewOut(BaseModel):
    id: str
    content_id: str
    views: Optional[int]
    likes: Optional[int]
    saves: Optional[int]
    comments: Optional[int]
    new_followers: Optional[int]
    dm_count: Optional[int]
    led_to_inquiry: bool
    notes: Optional[str]
    ai_analysis: Optional[dict]
    recorded_at: datetime

    class Config:
        from_attributes = True


# ── Generic ───────────────────────────────────────────────────────────────────
class TaskStatusOut(BaseModel):
    task_id: str
    status: str   # pending|processing|done|failed
    result: Optional[Any] = None
    error: Optional[str] = None


TokenResponse.model_rebuild()
