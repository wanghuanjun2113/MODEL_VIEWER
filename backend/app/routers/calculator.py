"""计算 API"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Any, Dict, List

from ..database import get_db
from ..models import CalculationHistory
from ..crud import hardware as hardware_crud
from ..crud import model as model_crud
from ..schemas import (
    CalculationInput,
    CalculationResponse,
    CalculationResult,
    OptimizationSuggestion,
    CalculationHistoryResponse,
)
from ..services import mfu_calculator, optimizer


router = APIRouter(prefix="/api/v1/calculate", tags=["Calculation"])


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


@router.post("/mfu", response_model=CalculationResponse)
def calculate_mfu(input_data: CalculationInput, db: Session = Depends(get_db)):
    """计算 MFU 和显存带宽使用率

    Args:
        input_data: 计算输入参数

    Returns:
        计算结果和建议
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

        # 3. 构建计算输入
        hardware_dict = hardware_to_dict(hardware)
        model_dict = model_to_dict(model)

        calc_input = {
            "gpu_count": input_data.gpu_count,
            "precision": input_data.precision.value,
            "attention_precision": input_data.attention_precision.value,
            "ffn_precision": input_data.ffn_precision.value,
            "first_token_latency_ms": input_data.first_token_latency_ms,
            "tpot_ms": input_data.tpot_ms,
            "context_length": input_data.context_length,
            "generated_length": input_data.generated_length,
            "batch_size": input_data.batch_size,
        }

        # 4. 执行计算
        result = mfu_calculator.calculate_mfu(hardware_dict, model_dict, calc_input)

        # 5. 生成优化建议
        suggestions = optimizer.get_optimization_suggestions(
            mfu=result["mfu"],
            bandwidth_utilization=result["memory_bandwidth_utilization"],
            hardware_info=hardware_dict,
            model_info=model_dict,
            bottleneck_type=result["bottleneck_type"],
        )

        # 6. 构建响应
        calculation_result = CalculationResult(
            mfu=result["mfu"],
            memory_bandwidth_utilization=result["memory_bandwidth_utilization"],
            prefill_mfu=result["prefill_mfu"],
            prefill_bandwidth_utilization=result["prefill_bandwidth_utilization"],
            decode_mfu=result["decode_mfu"],
            decode_bandwidth_utilization=result["decode_bandwidth_utilization"],
            theoretical_flops=result["theoretical_flops"],
            actual_flops=result["actual_flops"],
            peak_flops=result["peak_flops"],
            prefill_flops=result["prefill_flops"],
            decode_flops=result["decode_flops"],
            kv_cache_bytes=result["kv_cache_bytes"],
            model_memory_bytes=result["model_memory_bytes"],
            bottleneck_type=result["bottleneck_type"],
            tokens_per_second=result["tokens_per_second"],
            total_time_ms=result["total_time_ms"],
        )

        optimization_suggestions = [
            OptimizationSuggestion(**s) for s in suggestions
        ]

        # 7. 保存计算历史
        history = CalculationHistory(
            hardware_id=input_data.hardware_id,
            model_id=input_data.model_id,
            input_params=calc_input,
            result=result,
        )
        db.add(history)
        db.commit()

        return CalculationResponse(
            success=True,
            result=calculation_result,
            suggestions=optimization_suggestions,
        )

    except HTTPException:
        raise
    except Exception as e:
        return CalculationResponse(
            success=False,
            error=str(e),
            suggestions=[],
        )


@router.get("/bottleneck-description/{bottleneck_type}")
def get_bottleneck_description(bottleneck_type: str):
    """获取瓶颈类型的中文描述"""
    return {"description": optimizer.OptimizationEngine().get_bottleneck_description(bottleneck_type)}


@router.get("/history", response_model=List[CalculationHistoryResponse])
def get_calculation_history(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """获取 MFU 计算历史记录"""
    history = db.query(CalculationHistory)\
        .order_by(CalculationHistory.created_at.desc())\
        .offset(offset)\
        .limit(limit)\
        .all()
    return history


@router.delete("/history/{history_id}")
def delete_calculation_history(history_id: int, db: Session = Depends(get_db)):
    """删除 MFU 计算历史记录"""
    history = db.query(CalculationHistory).filter(CalculationHistory.id == history_id).first()
    if not history:
        raise HTTPException(status_code=404, detail="History not found")
    db.delete(history)
    db.commit()
    return {"message": "History deleted successfully"}


@router.delete("/history")
def clear_calculation_history(db: Session = Depends(get_db)):
    """清空所有 MFU 计算历史记录"""
    db.query(CalculationHistory).delete()
    db.commit()
    return {"message": "All history cleared successfully"}
