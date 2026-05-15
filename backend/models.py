import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Boolean, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[Optional[str]] = mapped_column(String(100))
    plan: Mapped[str] = mapped_column(String(20), default="free")  # free|basic|advanced|pro
    plan_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    profiles: Mapped[list["IPProfile"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    materials: Mapped[list["Material"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    contents: Mapped[list["Content"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    recommendations: Mapped[list["TopicRecommendation"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class IPProfile(Base):
    __tablename__ = "ip_profiles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)

    # 基础定义
    domain: Mapped[Optional[str]] = mapped_column(Text)           # 领域（1-2句）
    identity: Mapped[Optional[str]] = mapped_column(Text)         # 身份标签
    tagline: Mapped[Optional[str]] = mapped_column(Text)          # 一句话被记住
    solve_problem: Mapped[Optional[str]] = mapped_column(Text)    # 解决什么问题
    unique_opinion: Mapped[Optional[str]] = mapped_column(Text)   # 独特观点

    # 受众（JSON）
    core_audience: Mapped[Optional[dict]] = mapped_column(JSON)
    expanded_audience: Mapped[Optional[dict]] = mapped_column(JSON)
    broad_audience: Mapped[Optional[dict]] = mapped_column(JSON)

    # 风格
    tone_tags: Mapped[Optional[list]] = mapped_column(JSON)       # ['知识干货', '轻松对话']
    monetization_goal: Mapped[Optional[str]] = mapped_column(Text)

    # AI风格记忆
    style_memory: Mapped[Optional[dict]] = mapped_column(JSON)
    forbidden_words: Mapped[Optional[list]] = mapped_column(JSON)

    # IP定位卡（AI生成的摘要）
    summary_card: Mapped[Optional[str]] = mapped_column(Text)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="profiles")
    columns: Mapped[list["Column"]] = relationship(back_populates="profile", cascade="all, delete-orphan")
    recommendations: Mapped[list["TopicRecommendation"]] = relationship(back_populates="profile")


class Material(Base):
    __tablename__ = "materials"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(30))   # experience|method|opinion|data|feedback
    title: Mapped[Optional[str]] = mapped_column(Text)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    tags: Mapped[Optional[list]] = mapped_column(JSON)
    used_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="materials")


class Column(Base):
    __tablename__ = "columns"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    profile_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("ip_profiles.id"))
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    goal: Mapped[Optional[str]] = mapped_column(Text)
    frequency: Mapped[Optional[str]] = mapped_column(String(50))
    content_type: Mapped[Optional[str]] = mapped_column(String(20))   # awareness|trust|conversion
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    profile: Mapped[Optional["IPProfile"]] = relationship(back_populates="columns")
    recommendations: Mapped[list["TopicRecommendation"]] = relationship(back_populates="column")


class TopicRecommendation(Base):
    __tablename__ = "topic_recommendations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    profile_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("ip_profiles.id"))
    column_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("columns.id"))

    customized_title: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    audience_tier: Mapped[Optional[str]] = mapped_column(String(20))   # core|expanded|broad
    content_type: Mapped[Optional[str]] = mapped_column(String(20))
    platform: Mapped[str] = mapped_column(String(20), default="universal")
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending|adopted|skipped
    week_of: Mapped[str] = mapped_column(String(10))   # YYYY-MM-DD (周一日期)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="recommendations")
    profile: Mapped[Optional["IPProfile"]] = relationship(back_populates="recommendations")
    column: Mapped[Optional["Column"]] = relationship(back_populates="recommendations")
    contents: Mapped[list["Content"]] = relationship(back_populates="recommendation")


class Content(Base):
    __tablename__ = "contents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    recommendation_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("topic_recommendations.id"))
    column_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("columns.id"))

    title: Mapped[Optional[str]] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    title_variants: Mapped[Optional[list]] = mapped_column(JSON)
    cover_copy: Mapped[Optional[str]] = mapped_column(Text)
    hashtags: Mapped[Optional[list]] = mapped_column(JSON)
    comment_hook: Mapped[Optional[str]] = mapped_column(Text)
    video_script: Mapped[Optional[str]] = mapped_column(Text)
    platform: Mapped[str] = mapped_column(String(20), default="universal")

    status: Mapped[str] = mapped_column(String(20), default="draft")  # draft|published|archived
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    material_ids: Mapped[Optional[list]] = mapped_column(JSON)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="contents")
    recommendation: Mapped[Optional["TopicRecommendation"]] = relationship(back_populates="contents")
    review: Mapped[Optional["ContentReview"]] = relationship(back_populates="content", uselist=False)


class ContentReview(Base):
    __tablename__ = "content_reviews"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=gen_uuid)
    content_id: Mapped[str] = mapped_column(String(36), ForeignKey("contents.id"), nullable=False, unique=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)

    views: Mapped[Optional[int]] = mapped_column(Integer)
    likes: Mapped[Optional[int]] = mapped_column(Integer)
    saves: Mapped[Optional[int]] = mapped_column(Integer)
    comments: Mapped[Optional[int]] = mapped_column(Integer)
    new_followers: Mapped[Optional[int]] = mapped_column(Integer)
    dm_count: Mapped[Optional[int]] = mapped_column(Integer)
    led_to_inquiry: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    ai_analysis: Mapped[Optional[dict]] = mapped_column(JSON)

    recorded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    content: Mapped["Content"] = relationship(back_populates="review")
