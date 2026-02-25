"""并发计算 API"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any, Dict, List

from ..database import get_db
from ..models import ConcurrencyHistory
from ..crud import hardware as hardware_crud
from ..crud import model as model_crud
from ..schemas import (
    ConcurrencyInput,
    ConcurrencyResponse,
    ConcurrencyResult,
    MemoryBreakdown,
    ConcurrencyHistoryResponse,
)


router = APIRouter(prefix="/api/v1/calculate", tags=["Concurrency Calculator"])


def hardware_to_dict(hardware) -> Dict[str, Any]:
    """将 Hardware ORM 对象转换为字典"""
    return {
        "fp16_peak_tflops": hardware.fp16_peak_tflops,
        "bf32_peak_tflops": hardware.bf32_peak_tflops,
        "fp32_peak_tflops": hardware.fp32_peak_tflops,
        "memory_size_gb": hardware.memory_size_gb,
        "memory_bandwidth_tbps": hardware.memory_bandwidth_tbps,
    }


def model_to_dict(model) -> Dict[str, Any]:
    """将 Model ORM 对象转换为字典"""
    return {
        "params_billions": model.params_billions,
        "num_layers": model.num_layers,
        "hidden_size": model.hidden_size,
        "num_attention_heads": model.num_attention_heads,
        "num_key_value_heads": model.num_key_value_heads,
        "vocab_size": model.vocab_size,
        "intermediate_size": model.intermediate_size,
        "head_dim": model.head_dim,
        "max_position_embeddings": model.max_position_embeddings,
    }


@router.post("/concurrency", response_model=ConcurrencyResponse)
def calculate_concurrency(input_data: ConcurrencyInput, db: Session = Depends(get_db)):
    """计算最大并发请求数

    Args:
        input_data: 并发计算输入参数

    Returns:
        计算结果
    """
    try:
        # 1. 获取硬件信息
        hardware = hardware_crud.get_hardware(db, input_data.hardware_id)
        if not hardware:
            raise HTTPException(
                status_code=404,
                detail=f"Hardware with id {input_data.hardware_id} not found"
            )

        # 2. 获取模型信息
        model = model_crud.get_model(db, input_data.model_id)
        if not model:
            raise HTTPException(
                status_code=404,
                detail=f"Model with id {input_data.model_id} not found"
            )

        # 3. 构建参数字典
        hardware_dict = hardware_to_dict(hardware)
        model_dict = model_to_dict(model)

        # 4. 执行并发计算
        result = calculate_concurrency_logic(
            hardware_dict,
            model_dict,
            input_data.gpu_count,
            input_data.context_length,
            input_data.precision.value,
            input_data.framework_overhead_gb
        )

        # 5. 保存计算历史
        input_params = {
            "gpu_count": input_data.gpu_count,
            "context_length": input_data.context_length,
            "precision": input_data.precision.value,
            "framework_overhead_gb": input_data.framework_overhead_gb,
        }
        history = ConcurrencyHistory(
            hardware_id=input_data.hardware_id,
            model_id=input_data.model_id,
            input_params=input_params,
            result=result,
        )
        db.add(history)
        db.commit()

        # 6. 构建响应
        return ConcurrencyResponse(
            success=True,
            result=ConcurrencyResult(
                gpu_count=result["gpu_count"],
                max_concurrency_without_pa=result["max_concurrency_without_pa"],
                max_concurrency_with_pa=result["max_concurrency_with_pa"],
                memory_breakdown=MemoryBreakdown(**result["memory_breakdown"]),
                hardware_memory_gb=result["hardware_memory_gb"],
                available_memory_gb=result["available_memory_gb"],
            ),
        )

    except HTTPException:
        raise
    except Exception as e:
        return ConcurrencyResponse(
            success=False,
            error=str(e),
            result=None,
        )


def calculate_concurrency_logic(
    hardware: Dict[str, Any],
    model: Dict[str, Any],
    gpu_count: int,
    context_length: int,
    precision: str,
    framework_overhead_gb: float
) -> Dict[str, Any]:
    """并发计算逻辑

    Args:
        hardware: 硬件参数字典
        model: 模型参数字典
        gpu_count: GPU 数量
        context_length: 上下文长度
        precision: 计算精度
        framework_overhead_gb: 框架开销

    Returns:
        计算结果字典
    """
    # 精度字节大小
    precision_size = {"fp16": 2, "bf16": 2, "fp32": 4}.get(precision, 2)

    # 计算权重内存 (GB)
    # 模型参数量 * 精度字节 / 1024^3
    weight_memory_gb = (model["params_billions"] * 1e9 * precision_size) / (1024 ** 3)

    # 计算 KV Cache 内存 (GB)
    # 2 * num_layers * num_attention_heads * head_dim * context_length * precision_size
    kv_cache_memory_gb = (
        2 * model["num_layers"] * model["num_attention_heads"] *
        model["head_dim"] * context_length * precision_size
    ) / (1024 ** 3)

    # 计算激活内存 (GB)
    # 2 * num_layers * context_length * hidden_size * precision_size
    activation_memory_gb = (
        2 * model["num_layers"] * context_length *
        model["hidden_size"] * precision_size
    ) / (1024 ** 3)

    # 单并发总内存
    total_per_request = (
        weight_memory_gb + framework_overhead_gb +
        kv_cache_memory_gb + activation_memory_gb
    )

    # 可用内存 (多卡总显存)
    total_memory_gb = hardware["memory_size_gb"] * gpu_count
    available_memory_gb = total_memory_gb - framework_overhead_gb

    # 最大并发数 (不考虑 Paged Attention)
    max_concurrency_without_pa = max(0, int(available_memory_gb / total_per_request))

    # 最大并发数 (考虑 Paged Attention, KV Cache 节省 2.3 倍)
    paged_attention_factor = 2.3
    memory_with_pa = (
        weight_memory_gb + framework_overhead_gb +
        kv_cache_memory_gb / paged_attention_factor +
        activation_memory_gb
    )
    max_concurrency_with_pa = max(0, int(available_memory_gb / memory_with_pa))

    return {
        "gpu_count": gpu_count,
        "max_concurrency_without_pa": max_concurrency_without_pa,
        "max_concurrency_with_pa": max_concurrency_with_pa,
        "memory_breakdown": {
            "weight_memory_gb": round(weight_memory_gb, 4),
            "framework_overhead_gb": round(framework_overhead_gb, 4),
            "kv_cache_memory_gb": round(kv_cache_memory_gb, 4),
            "activation_memory_gb": round(activation_memory_gb, 4),
            "total_memory_gb": round(total_per_request, 4),
        },
        "hardware_memory_gb": round(total_memory_gb, 4),
        "available_memory_gb": round(available_memory_gb, 4),
    }


@router.get("/concurrency/history", response_model=List[ConcurrencyHistoryResponse])
def get_concurrency_history(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """获取并发计算历史记录"""
    history = db.query(ConcurrencyHistory)\
        .order_by(ConcurrencyHistory.created_at.desc())\
        .offset(offset)\
        .limit(limit)\
        .all()
    return history


@router.delete("/concurrency/history/{history_id}")
def delete_concurrency_history(history_id: int, db: Session = Depends(get_db)):
    """删除并发计算历史记录"""
    history = db.query(ConcurrencyHistory).filter(ConcurrencyHistory.id == history_id).first()
    if not history:
        raise HTTPException(status_code=404, detail="History not found")
    db.delete(history)
    db.commit()
    return {"message": "History deleted successfully"}


@router.delete("/concurrency/history")
def clear_concurrency_history(db: Session = Depends(get_db)):
    """清空所有并发计算历史记录"""
    db.query(ConcurrencyHistory).delete()
    db.commit()
    return {"message": "All history cleared successfully"}
