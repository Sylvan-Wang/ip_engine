from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import User, IPProfile, Content, TopicRecommendation, Column, Material, ContentReview
from schemas import ContentGenerateRequest, ContentUpdate, ContentOut, ReviewCreate, ReviewOut
from auth import get_current_user
from services.ai_engine import generate_content, analyze_review
from datetime import datetime

router = APIRouter(prefix="/contents", tags=["contents"])


async def _get_active_profile(user_id: str, db: AsyncSession) -> IPProfile | None:
    result = await db.execute(
        select(IPProfile).where(IPProfile.user_id == user_id, IPProfile.is_active == True)
    )
    return result.scalar_one_or_none()


@router.post("/generate", response_model=ContentOut, status_code=201)
async def generate(
    body: ContentGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 取 IP 画像
    profile = await _get_active_profile(current_user.id, db)
    if not profile:
        raise HTTPException(status_code=404, detail="请先创建IP画像")

    # 取选题
    rec_result = await db.execute(
        select(TopicRecommendation).where(
            TopicRecommendation.id == body.recommendation_id,
            TopicRecommendation.user_id == current_user.id,
        )
    )
    rec = rec_result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="选题不存在")

    # 取栏目
    column = None
    if rec.column_id:
        col_result = await db.execute(select(Column).where(Column.id == rec.column_id))
        column = col_result.scalar_one_or_none()

    # 取素材
    materials = []
    if body.material_ids:
        mat_result = await db.execute(
            select(Material).where(
                Material.id.in_(body.material_ids),
                Material.user_id == current_user.id,
            )
        )
        materials = [{"type": m.type, "title": m.title, "content": m.content} for m in mat_result.scalars().all()]

    profile_data = {
        "domain": profile.domain,
        "identity": profile.identity,
        "tagline": profile.tagline,
        "solve_problem": profile.solve_problem,
        "unique_opinion": profile.unique_opinion,
        "core_audience": profile.core_audience or {},
        "tone_tags": profile.tone_tags or [],
        "style_memory": profile.style_memory,
    }
    col_data = {"name": column.name, "goal": column.goal} if column else None

    result = await generate_content(profile_data, rec.customized_title, col_data, materials, body.platform)

    content = Content(
        user_id=current_user.id,
        recommendation_id=rec.id,
        column_id=rec.column_id,
        title=result["title_variants"][0] if result.get("title_variants") else None,
        body=result.get("body", ""),
        title_variants=result.get("title_variants"),
        cover_copy=result.get("cover_copy"),
        hashtags=result.get("hashtags"),
        comment_hook=result.get("comment_hook"),
        platform=body.platform,
        material_ids=body.material_ids,
    )
    db.add(content)
    rec.status = "adopted"
    await db.flush()
    return content


@router.get("", response_model=list[ContentOut])
async def list_contents(
    status: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Content).where(Content.user_id == current_user.id)
    if status:
        q = q.where(Content.status == status)
    result = await db.execute(q.order_by(Content.created_at.desc()))
    return result.scalars().all()


@router.get("/{content_id}", response_model=ContentOut)
async def get_content(
    content_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Content).where(Content.id == content_id, Content.user_id == current_user.id))
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=404, detail="内容不存在")
    return content


@router.put("/{content_id}", response_model=ContentOut)
async def update_content(
    content_id: str,
    body: ContentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Content).where(Content.id == content_id, Content.user_id == current_user.id))
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=404, detail="内容不存在")

    for k, v in body.model_dump(exclude_none=True).items():
        setattr(content, k, v)
    content.updated_at = datetime.utcnow()

    if body.status == "published" and not content.published_at:
        content.published_at = datetime.utcnow()

    return content


@router.post("/{content_id}/publish", response_model=ContentOut)
async def publish_content(
    content_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Content).where(Content.id == content_id, Content.user_id == current_user.id))
    content = result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=404, detail="内容不存在")
    content.status = "published"
    content.published_at = datetime.utcnow()
    return content


# ── Reviews ───────────────────────────────────────────────────────────────────
@router.post("/reviews", response_model=ReviewOut, status_code=201)
async def create_review(
    body: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 确认内容属于当前用户
    content_result = await db.execute(
        select(Content).where(Content.id == body.content_id, Content.user_id == current_user.id)
    )
    content = content_result.scalar_one_or_none()
    if not content:
        raise HTTPException(status_code=404, detail="内容不存在")

    # 获取 IP 画像
    profile = await _get_active_profile(current_user.id, db)
    profile_data = {"tagline": profile.tagline if profile else ""}

    review = ContentReview(
        content_id=body.content_id,
        user_id=current_user.id,
        **body.model_dump(exclude={"content_id"}),
    )
    db.add(review)
    await db.flush()

    # 生成 AI 分析
    content_summary = (content.title or "") + " " + content.body[:200]
    analysis = await analyze_review(profile_data, content_summary, body.model_dump())
    review.ai_analysis = analysis

    return review


@router.get("/{content_id}/review", response_model=ReviewOut)
async def get_review(
    content_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ContentReview).where(
            ContentReview.content_id == content_id,
            ContentReview.user_id == current_user.id,
        )
    )
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="暂无复盘数据")
    return review
