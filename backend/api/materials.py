from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import User, Material
from schemas import MaterialCreate, MaterialOut
from auth import get_current_user

router = APIRouter(prefix="/materials", tags=["materials"])


@router.get("", response_model=list[MaterialOut])
async def list_materials(
    type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Material).where(Material.user_id == current_user.id)
    if type:
        q = q.where(Material.type == type)
    result = await db.execute(q.order_by(Material.created_at.desc()))
    return result.scalars().all()


@router.post("", response_model=MaterialOut, status_code=201)
async def create_material(
    body: MaterialCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    material = Material(user_id=current_user.id, **body.model_dump())
    db.add(material)
    await db.flush()
    return material


@router.put("/{material_id}", response_model=MaterialOut)
async def update_material(
    material_id: str,
    body: MaterialCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Material).where(Material.id == material_id, Material.user_id == current_user.id))
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=404, detail="素材不存在")
    for k, v in body.model_dump().items():
        setattr(material, k, v)
    return material


@router.delete("/{material_id}", status_code=204)
async def delete_material(
    material_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Material).where(Material.id == material_id, Material.user_id == current_user.id))
    material = result.scalar_one_or_none()
    if not material:
        raise HTTPException(status_code=404, detail="素材不存在")
    await db.delete(material)
