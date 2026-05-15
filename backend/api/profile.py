from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import User, IPProfile, Column
from schemas import IPProfileCreate, IPProfileUpdate, IPProfileOut, StyleExtractRequest, ColumnOut, ColumnCreate
from auth import get_current_user
from services.ai_engine import generate_profile_summary, generate_columns, extract_style_memory
from datetime import datetime

router = APIRouter(prefix="/profile", tags=["profile"])


async def _get_active_profile(user: User, db: AsyncSession) -> IPProfile | None:
    result = await db.execute(
        select(IPProfile).where(IPProfile.user_id == user.id, IPProfile.is_active == True)
        .order_by(IPProfile.created_at.desc())
    )
    return result.scalar_one_or_none()


@router.get("", response_model=IPProfileOut)
async def get_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    profile = await _get_active_profile(current_user, db)
    if not profile:
        raise HTTPException(status_code=404, detail="尚未创建IP画像")
    return profile


@router.post("", response_model=IPProfileOut, status_code=201)
async def create_profile(
    body: IPProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 停用旧画像
    existing = await _get_active_profile(current_user, db)
    if existing:
        existing.is_active = False

    profile = IPProfile(user_id=current_user.id, **body.model_dump(exclude_none=True))
    db.add(profile)
    await db.flush()

    # 异步生成 IP 定位卡（同步等待以返回结果）
    summary = await generate_profile_summary(body.model_dump())
    profile.summary_card = summary

    return profile


@router.put("/{profile_id}", response_model=IPProfileOut)
async def update_profile(
    profile_id: str,
    body: IPProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(IPProfile).where(IPProfile.id == profile_id, IPProfile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="画像不存在")

    for k, v in body.model_dump(exclude_none=True).items():
        setattr(profile, k, v)
    profile.version += 1
    profile.updated_at = datetime.utcnow()

    # 重新生成定位卡
    summary = await generate_profile_summary(body.model_dump())
    profile.summary_card = summary

    return profile


@router.post("/extract-style", status_code=202)
async def extract_style(
    body: StyleExtractRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.contents:
        raise HTTPException(status_code=400, detail="请提供至少一条历史内容")

    profile = await _get_active_profile(current_user, db)
    if not profile:
        raise HTTPException(status_code=404, detail="请先创建IP画像")

    style = await extract_style_memory(body.contents)
    profile.style_memory = style
    profile.updated_at = datetime.utcnow()

    return {"message": "风格特征提取成功", "style_memory": style}


# ── Columns ──────────────────────────────────────────────────────────────────
@router.get("/columns", response_model=list[ColumnOut])
async def get_columns(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Column).where(Column.user_id == current_user.id, Column.is_active == True)
        .order_by(Column.sort_order)
    )
    return result.scalars().all()


@router.post("/columns/generate", response_model=list[ColumnOut], status_code=201)
async def generate_columns_api(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await _get_active_profile(current_user, db)
    if not profile:
        raise HTTPException(status_code=404, detail="请先创建IP画像")

    cols_data = await generate_columns(profile.__dict__)

    # 保存到数据库
    created = []
    for i, col in enumerate(cols_data):
        column = Column(
            user_id=current_user.id,
            profile_id=profile.id,
            name=col.get("name", ""),
            description=col.get("description"),
            goal=col.get("goal"),
            frequency=col.get("frequency"),
            content_type=col.get("content_type"),
            sort_order=i,
        )
        db.add(column)
        created.append(column)

    await db.flush()
    return created


@router.post("/columns", response_model=ColumnOut, status_code=201)
async def create_column(
    body: ColumnCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await _get_active_profile(current_user, db)
    column = Column(user_id=current_user.id, profile_id=profile.id if profile else None, **body.model_dump())
    db.add(column)
    await db.flush()
    return column


@router.delete("/columns/{column_id}", status_code=204)
async def delete_column(
    column_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Column).where(Column.id == column_id, Column.user_id == current_user.id))
    column = result.scalar_one_or_none()
    if not column:
        raise HTTPException(status_code=404, detail="栏目不存在")
    column.is_active = False
