from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import User, IPProfile, Column, TopicRecommendation
from schemas import TopicRecommendationOut
from auth import get_current_user
from services.ai_engine import generate_topic_recommendations

router = APIRouter(prefix="/topics", tags=["topics"])


def _week_start() -> str:
    today = date.today()
    monday = today - timedelta(days=today.weekday())
    return monday.isoformat()


async def _get_active_profile(user_id: str, db: AsyncSession) -> IPProfile | None:
    result = await db.execute(
        select(IPProfile).where(IPProfile.user_id == user_id, IPProfile.is_active == True)
    )
    return result.scalar_one_or_none()


@router.get("/weekly", response_model=list[TopicRecommendationOut])
async def get_weekly_topics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    week_of = _week_start()

    # 先查缓存（本周已生成）
    existing = await db.execute(
        select(TopicRecommendation)
        .where(TopicRecommendation.user_id == current_user.id, TopicRecommendation.week_of == week_of)
        .order_by(TopicRecommendation.created_at)
    )
    recs = existing.scalars().all()
    if recs:
        return recs

    # 没有则生成
    profile = await _get_active_profile(current_user.id, db)
    if not profile:
        raise HTTPException(status_code=404, detail="请先完成IP画像")

    cols_result = await db.execute(
        select(Column).where(Column.user_id == current_user.id, Column.is_active == True).order_by(Column.sort_order)
    )
    columns = [{"id": c.id, "name": c.name, "goal": c.goal, "content_type": c.content_type} for c in cols_result.scalars().all()]

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

    recommendations = await generate_topic_recommendations(profile_data, columns)

    created = []
    for rec in recommendations:
        # 找匹配的栏目 id
        col_id = None
        if rec.get("column_name") and columns:
            for c in columns:
                if c["name"] == rec["column_name"]:
                    col_id = c["id"]
                    break

        obj = TopicRecommendation(
            user_id=current_user.id,
            profile_id=profile.id,
            column_id=col_id,
            customized_title=rec["customized_title"],
            reason=rec["reason"],
            audience_tier=rec.get("audience_tier", "core"),
            content_type=rec.get("content_type", "awareness"),
            platform=rec.get("platform", "universal"),
            week_of=week_of,
        )
        db.add(obj)
        created.append(obj)

    await db.flush()
    return created


@router.post("/{topic_id}/adopt", response_model=TopicRecommendationOut)
async def adopt_topic(
    topic_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TopicRecommendation).where(
            TopicRecommendation.id == topic_id, TopicRecommendation.user_id == current_user.id
        )
    )
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="选题不存在")
    rec.status = "adopted"
    return rec


@router.post("/{topic_id}/skip", response_model=TopicRecommendationOut)
async def skip_topic(
    topic_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(TopicRecommendation).where(
            TopicRecommendation.id == topic_id, TopicRecommendation.user_id == current_user.id
        )
    )
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="选题不存在")
    rec.status = "skipped"
    return rec


@router.post("/refresh", response_model=list[TopicRecommendationOut])
async def refresh_topics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """强制刷新本周选题（删除旧的，重新生成）"""
    week_of = _week_start()

    # 删除本周旧推荐
    old = await db.execute(
        select(TopicRecommendation).where(
            TopicRecommendation.user_id == current_user.id,
            TopicRecommendation.week_of == week_of,
        )
    )
    for r in old.scalars().all():
        await db.delete(r)
    await db.flush()

    # 重新路由到 get_weekly_topics
    return await get_weekly_topics(current_user, db)
