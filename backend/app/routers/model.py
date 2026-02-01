"""模型管理 API"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..crud import model as model_crud
from ..services import hf_client
from ..schemas import (
    ModelCreate,
    ModelUpdate,
    ModelResponse,
    HuggingFacePreviewResponse,
    MessageResponse,
    PaginatedResponse,
)


router = APIRouter(prefix="/api/v1/models", tags=["Model"])


@router.get("", response_model=list[ModelResponse])
def list_models(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """获取模型列表"""
    return model_crud.get_all_models(db, skip=skip, limit=limit)


@router.get("/paginated", response_model=PaginatedResponse)
def list_models_paginated(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    """获取分页模型列表"""
    items, total = model_crud.get_models_paginated(db, page=page, page_size=page_size)
    total_pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=[ModelResponse.model_validate(m) for m in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_previous=page > 1,
    )


@router.get("/{model_id}", response_model=ModelResponse)
def get_model(model_id: int, db: Session = Depends(get_db)):
    """获取单个模型信息"""
    db_model = model_crud.get_model(db, model_id)
    if not db_model:
        raise HTTPException(status_code=404, detail="Model not found")
    return db_model


@router.post("", response_model=ModelResponse, status_code=201)
def create_model(model: ModelCreate, db: Session = Depends(get_db)):
    """创建新模型"""
    # 检查 Hugging Face ID 是否已存在
    existing = model_crud.get_model_by_hf_id(db, model.huggingface_id)
    if existing:
        raise HTTPException(status_code=400, detail="Model with this Hugging Face ID already exists")

    return model_crud.create_model(db, model)


@router.post("/from-hf", response_model=ModelResponse, status_code=201)
def create_model_from_huggingface(
    hf_id: str,
    db: Session = Depends(get_db)
):
    """从 Hugging Face 创建模型

    Args:
        hf_id: Hugging Face 模型 ID (例如: "meta-llama/Llama-2-7b-hf")
    """
    # 检查是否已存在
    existing = model_crud.get_model_by_hf_id(db, hf_id)
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Model with this Hugging Face ID already exists"
        )

    # 从 Hugging Face 获取信息
    model_info = hf_client.get_model_info(hf_id)
    if not model_info:
        raise HTTPException(
            status_code=404,
            detail=f"Failed to fetch model info from Hugging Face: {hf_id}"
        )

    # 创建模型
    model_create = ModelCreate(
        name=model_info["name"],
        huggingface_id=model_info["huggingface_id"],
        params_billions=model_info["params_billions"],
        num_layers=model_info["num_layers"],
        hidden_size=model_info["hidden_size"],
        num_attention_heads=model_info["num_attention_heads"],
        num_key_value_heads=model_info["num_key_value_heads"],
        vocab_size=model_info["vocab_size"],
        intermediate_size=model_info["intermediate_size"],
        head_dim=model_info["head_dim"],
        max_position_embeddings=model_info["max_position_embeddings"],
        model_type=model_info["model_type"],
        description=f"Imported from Hugging Face: {hf_id}",
    )

    return model_crud.create_model(db, model_create)


@router.get("/hf/{hf_id}", response_model=HuggingFacePreviewResponse)
def preview_huggingface_model(hf_id: str):
    """预览 Hugging Face 模型信息

    Args:
        hf_id: Hugging Face 模型 ID

    Returns:
        模型预览信息（不保存到数据库）
    """
    model_info = hf_client.get_model_info(hf_id)
    if not model_info:
        raise HTTPException(
            status_code=404,
            detail=f"Failed to fetch model info from Hugging Face: {hf_id}"
        )

    return HuggingFacePreviewResponse(**model_info)


@router.put("/{model_id}", response_model=ModelResponse)
def update_model(
    model_id: int,
    model: ModelUpdate,
    db: Session = Depends(get_db)
):
    """更新模型信息"""
    db_model = model_crud.update_model(db, model_id, model)
    if not db_model:
        raise HTTPException(status_code=404, detail="Model not found")
    return db_model


@router.delete("/{model_id}", response_model=MessageResponse)
def delete_model(model_id: int, db: Session = Depends(get_db)):
    """删除模型"""
    if not model_crud.delete_model(db, model_id):
        raise HTTPException(status_code=404, detail="Model not found")
    return MessageResponse(message="Model deleted successfully")
