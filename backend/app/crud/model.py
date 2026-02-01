"""模型 CRUD 操作"""

from sqlalchemy.orm import Session
from sqlalchemy import select, func
from typing import List, Optional, Tuple

from ..models import Model
from ..schemas import ModelCreate, ModelUpdate


def get_model(db: Session, model_id: int) -> Optional[Model]:
    """获取单个模型"""

    stmt = select(Model).where(Model.id == model_id)
    result = db.execute(stmt)
    return result.scalar_one_or_none()


def get_all_models(db: Session, skip: int = 0, limit: int = 100) -> List[Model]:
    """获取所有模型列表"""

    stmt = select(Model).offset(skip).limit(limit).order_by(Model.id)
    result = db.execute(stmt)
    return result.scalars().all()


def count_models(db: Session) -> int:
    """统计模型总数"""

    stmt = select(func.count()).select_from(Model)
    return db.execute(stmt).scalar_one()


def get_models_paginated(
    db: Session, page: int = 1, page_size: int = 20
) -> Tuple[List[Model], int]:
    """获取分页模型列表

    Returns:
        (模型列表, 总数)
    """
    skip = (page - 1) * page_size
    total = count_models(db)
    items = get_all_models(db, skip=skip, limit=page_size)
    return items, total


def get_model_by_hf_id(db: Session, hf_id: str) -> Optional[Model]:
    """根据 Hugging Face ID 查找模型"""

    stmt = select(Model).where(Model.huggingface_id == hf_id)
    result = db.execute(stmt)
    return result.scalar_one_or_none()


def create_model(db: Session, model: ModelCreate) -> Model:
    """创建模型"""

    db_model = Model(
        name=model.name,
        huggingface_id=model.huggingface_id,
        params_billions=model.params_billions,
        num_layers=model.num_layers,
        hidden_size=model.hidden_size,
        num_attention_heads=model.num_attention_heads,
        num_key_value_heads=model.num_key_value_heads,
        vocab_size=model.vocab_size,
        intermediate_size=model.intermediate_size,
        head_dim=model.head_dim,
        max_position_embeddings=model.max_position_embeddings,
        model_type=model.model_type,
        description=model.description,
    )
    db.add(db_model)
    db.commit()
    db.refresh(db_model)
    return db_model


def update_model(db: Session, model_id: int, model: ModelUpdate) -> Optional[Model]:
    """更新模型"""

    db_model = get_model(db, model_id)
    if not db_model:
        return None

    update_data = model.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_model, field, value)

    db.commit()
    db.refresh(db_model)
    return db_model


def delete_model(db: Session, model_id: int) -> bool:
    """删除模型"""

    db_model = get_model(db, model_id)
    if not db_model:
        return False

    db.delete(db_model)
    db.commit()
    return True
