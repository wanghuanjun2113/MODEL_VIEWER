"""硬件管理 API"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import io

from ..database import get_db
from ..crud import hardware as hardware_crud
from ..schemas import (
    HardwareCreate,
    HardwareUpdate,
    HardwareResponse,
    HardwareImportResponse,
    MessageResponse,
    PaginatedResponse,
)


router = APIRouter(prefix="/api/v1/hardware", tags=["Hardware"])


@router.get("", response_model=List[HardwareResponse])
def list_hardware(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """获取硬件列表"""
    return hardware_crud.get_all_hardware(db, skip=skip, limit=limit)


@router.get("/paginated", response_model=PaginatedResponse)
def list_hardware_paginated(
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db)
):
    """获取分页硬件列表"""
    items, total = hardware_crud.get_hardware_paginated(db, page=page, page_size=page_size)
    total_pages = (total + page_size - 1) // page_size

    return PaginatedResponse(
        items=[HardwareResponse.model_validate(h) for h in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_previous=page > 1,
    )


@router.get("/{hardware_id}", response_model=HardwareResponse)
def get_hardware(hardware_id: int, db: Session = Depends(get_db)):
    """获取单个硬件信息"""
    db_hardware = hardware_crud.get_hardware(db, hardware_id)
    if not db_hardware:
        raise HTTPException(status_code=404, detail="Hardware not found")
    return db_hardware


@router.post("", response_model=HardwareResponse, status_code=201)
def create_hardware(
    hardware: HardwareCreate,
    db: Session = Depends(get_db)
):
    """创建新硬件"""
    # 检查是否已存在
    existing = hardware_crud.get_hardware_by_name(db, hardware.name)
    if existing:
        raise HTTPException(status_code=400, detail="Hardware with this name already exists")

    return hardware_crud.create_hardware(db, hardware)


@router.put("/{hardware_id}", response_model=HardwareResponse)
def update_hardware(
    hardware_id: int,
    hardware: HardwareUpdate,
    db: Session = Depends(get_db)
):
    """更新硬件信息"""
    db_hardware = hardware_crud.update_hardware(db, hardware_id, hardware)
    if not db_hardware:
        raise HTTPException(status_code=404, detail="Hardware not found")
    return db_hardware


@router.delete("/{hardware_id}", response_model=MessageResponse)
def delete_hardware(hardware_id: int, db: Session = Depends(get_db)):
    """删除硬件"""
    if not hardware_crud.delete_hardware(db, hardware_id):
        raise HTTPException(status_code=404, detail="Hardware not found")
    return MessageResponse(message="Hardware deleted successfully")


@router.get("/template/download", response_class=StreamingResponse)
def download_template():
    """下载硬件导入模板"""
    # 创建模板数据
    template_data = {
        "name": ["NVIDIA A100 80GB", "NVIDIA H100 80GB"],
        "vendor": ["NVIDIA", "NVIDIA"],
        "fp16_peak_tflops": [1248.0, 4000.0],
        "bf32_peak_tflops": [624.0, 2000.0],
        "fp32_peak_tflops": [312.0, 1000.0],
        "memory_size_gb": [80.0, 80.0],
        "memory_bandwidth_tbps": [2.039, 3.35],
        "description": ["Data center GPU", "Next generation GPU"],
    }
    df = pd.DataFrame(template_data)

    # 保存到内存
    buffer = io.BytesIO()
    df.to_excel(buffer, index=False, engine="openpyxl")
    buffer.seek(0)

    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=hardware_template.xlsx"}
    )


@router.post("/import", response_model=HardwareImportResponse)
async def import_hardware(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """从 Excel 导入硬件列表"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are supported")

    # 读取 Excel
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents), engine="openpyxl")

        # 验证列名
        required_columns = [
            "name", "fp16_peak_tflops", "bf32_peak_tflops",
            "fp32_peak_tflops", "memory_size_gb", "memory_bandwidth_tbps"
        ]
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )

        # 创建硬件列表
        hardware_list = []
        for _, row in df.iterrows():
            try:
                hw = HardwareCreate(
                    name=str(row["name"]),
                    vendor=str(row.get("vendor", "")),
                    fp16_peak_tflops=float(row["fp16_peak_tflops"]),
                    bf32_peak_tflops=float(row["bf32_peak_tflops"]),
                    fp32_peak_tflops=float(row["fp32_peak_tflops"]),
                    memory_size_gb=float(row["memory_size_gb"]),
                    memory_bandwidth_tbps=float(row["memory_bandwidth_tbps"]),
                    description=str(row.get("description", "")),
                )
                hardware_list.append(hw)
            except Exception as e:
                continue  # 跳过无效行

        # 批量创建
        created = hardware_crud.bulk_create_hardware(db, hardware_list)

        return HardwareImportResponse(
            imported_count=len(created),
            hardware_list=[HardwareResponse.model_validate(h) for h in created]
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
