"""硬件 CRUD 操作"""

from sqlalchemy.orm import Session
from sqlalchemy import select, func
from typing import List, Optional, Tuple

from ..models import Hardware
from ..schemas import HardwareCreate, HardwareUpdate


def get_hardware(db: Session, hardware_id: int) -> Optional[Hardware]:
    """获取单个硬件"""

    stmt = select(Hardware).where(Hardware.id == hardware_id)
    result = db.execute(stmt)
    return result.scalar_one_or_none()


def get_all_hardware(db: Session, skip: int = 0, limit: int = 100) -> List[Hardware]:
    """获取所有硬件列表"""

    stmt = select(Hardware).offset(skip).limit(limit).order_by(Hardware.id)
    result = db.execute(stmt)
    return result.scalars().all()


def count_hardware(db: Session) -> int:
    """统计硬件总数"""

    stmt = select(func.count()).select_from(Hardware)
    return db.execute(stmt).scalar_one()


def get_hardware_paginated(
    db: Session, page: int = 1, page_size: int = 20
) -> Tuple[List[Hardware], int]:
    """获取分页硬件列表

    Returns:
        (硬件列表, 总数)
    """
    skip = (page - 1) * page_size
    total = count_hardware(db)
    items = get_all_hardware(db, skip=skip, limit=page_size)
    return items, total


def get_hardware_by_name(db: Session, name: str) -> Optional[Hardware]:
    """根据名称查找硬件"""

    stmt = select(Hardware).where(Hardware.name == name)
    result = db.execute(stmt)
    return result.scalar_one_or_none()


def create_hardware(db: Session, hardware: HardwareCreate) -> Hardware:
    """创建硬件"""

    db_hardware = Hardware(
        name=hardware.name,
        vendor=hardware.vendor,
        fp16_peak_tflops=hardware.fp16_peak_tflops,
        bf32_peak_tflops=hardware.bf32_peak_tflops,
        fp32_peak_tflops=hardware.fp32_peak_tflops,
        memory_size_gb=hardware.memory_size_gb,
        memory_bandwidth_tbps=hardware.memory_bandwidth_tbps,
        description=hardware.description,
    )
    db.add(db_hardware)
    db.commit()
    db.refresh(db_hardware)
    return db_hardware


def update_hardware(db: Session, hardware_id: int, hardware: HardwareUpdate) -> Optional[Hardware]:
    """更新硬件"""

    db_hardware = get_hardware(db, hardware_id)
    if not db_hardware:
        return None

    update_data = hardware.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_hardware, field, value)

    db.commit()
    db.refresh(db_hardware)
    return db_hardware


def delete_hardware(db: Session, hardware_id: int) -> bool:
    """删除硬件"""

    db_hardware = get_hardware(db, hardware_id)
    if not db_hardware:
        return False

    db.delete(db_hardware)
    db.commit()
    return True


def bulk_create_hardware(db: Session, hardware_list: List[HardwareCreate]) -> List[Hardware]:
    """批量创建硬件"""

    db_hardware_list = []
    for hardware in hardware_list:
        # 检查是否已存在
        existing = get_hardware_by_name(db, hardware.name)
        if existing:
            continue  # 跳过已存在的

        db_hardware = Hardware(
            name=hardware.name,
            vendor=hardware.vendor,
            fp16_peak_tflops=hardware.fp16_peak_tflops,
            bf32_peak_tflops=hardware.bf32_peak_tflops,
            fp32_peak_tflops=hardware.fp32_peak_tflops,
            memory_size_gb=hardware.memory_size_gb,
            memory_bandwidth_tbps=hardware.memory_bandwidth_tbps,
            description=hardware.description,
        )
        db_hardware_list.append(db_hardware)

    db.add_all(db_hardware_list)
    db.commit()

    # 刷新所有对象
    for hw in db_hardware_list:
        db.refresh(hw)

    return db_hardware_list
