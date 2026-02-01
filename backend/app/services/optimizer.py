"""优化建议引擎

根据 MFU 和显存带宽使用率生成优化建议
"""

from typing import List, Dict, Any
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class OptimizationSuggestion:
    """优化建议"""

    category: str  # English category
    priority: str  # high, medium, low
    suggestion: str  # Chinese suggestion text
    impact: str


class OptimizationEngine:
    """优化建议引擎"""

    def __init__(self):
        pass

    def generate_suggestions(
        self,
        mfu: float,
        bandwidth_utilization: float,
        hardware_info: Dict[str, Any] = None,
        model_info: Dict[str, Any] = None,
        bottleneck_type: str = "balanced"
    ) -> List[OptimizationSuggestion]:
        """生成优化建议

        Args:
            mfu: Model FLOPs Utilization (%)
            bandwidth_utilization: 显存带宽使用率 (%)
            hardware_info: 硬件信息（可选）
            model_info: 模型信息（可选）
            bottleneck_type: 瓶颈类型

        Returns:
            优化建议列表
        """
        suggestions = []

        # 1. 计算受限建议
        if bottleneck_type == "compute":
            suggestions.extend(self._get_compute_bottleneck_suggestions(
                mfu, hardware_info, model_info
            ))

        # 2. 访存受限建议
        elif bottleneck_type == "memory":
            suggestions.extend(self._get_memory_bottleneck_suggestions(
                bandwidth_utilization, hardware_info, model_info
            ))

        # 3. 平衡状态建议
        else:
            suggestions.extend(self._get_balanced_suggestions())

        return suggestions

    def _get_compute_bottleneck_suggestions(
        self,
        mfu: float,
        hardware_info: Dict[str, Any] = None,
        model_info: Dict[str, Any] = None
    ) -> List[OptimizationSuggestion]:
        """计算受限场景的优化建议"""
        suggestions = []

        # 高优先级建议
        if mfu < 30:
            suggestions.append(OptimizationSuggestion(
                category="Hardware Upgrade",
                priority="high",
                suggestion="考虑使用更高算力的 GPU（如 H100 替代 A100）",
                impact="可将 MFU 提升 2-3 倍"
            ))

        if mfu < 50:
            suggestions.append(OptimizationSuggestion(
                category="Precision Optimization",
                priority="high",
                suggestion="启用 Tensor Core 加速（使用 FP16/BF16 而非 FP32）",
                impact="可提升 2-4 倍计算性能"
            ))

        # 中优先级建议
        if hardware_info and hardware_info.get("fp16_peak_tflops", 0) > 1000:
            suggestions.append(OptimizationSuggestion(
                category="Batch Optimization",
                priority="medium",
                suggestion="增加批处理大小 (batch_size)，提高 GPU 利用率",
                impact="提升吞吐量，降低单请求成本"
            ))

        if model_info and model_info.get("num_layers", 0) > 50:
            suggestions.append(OptimizationSuggestion(
                category="Model Optimization",
                priority="medium",
                suggestion="考虑模型蒸馏或剪枝，减少计算量",
                impact="在保持质量的同时提升推理速度"
            ))

        # 低优先级建议
        suggestions.append(OptimizationSuggestion(
            category="System Config",
            priority="low",
            suggestion="确保 CUDA、cuBLAS 和 cuDNN 为最新版本",
            impact="可获得最新的性能优化"
        ))

        return suggestions

    def _get_memory_bottleneck_suggestions(
        self,
        bandwidth_utilization: float,
        hardware_info: Dict[str, Any] = None,
        model_info: Dict[str, Any] = None
    ) -> List[OptimizationSuggestion]:
        """访存受限场景的优化建议"""
        suggestions = []

        # 高优先级建议
        if bandwidth_utilization > 90:
            suggestions.append(OptimizationSuggestion(
                category="Batch Optimization",
                priority="high",
                suggestion="减小批处理大小 (batch_size)",
                impact="显著降低显存带宽压力"
            ))

            suggestions.append(OptimizationSuggestion(
                category="Hardware Upgrade",
                priority="high",
                suggestion="使用高带宽显存的 GPU（如 H100 替代 A100）",
                impact="H100 带宽是 A100 的 1.6 倍"
            ))

        # 中优先级建议
        if bandwidth_utilization > 70:
            suggestions.append(OptimizationSuggestion(
                category="Model Optimization",
                priority="medium",
                suggestion="考虑模型量化（INT8/INT4）",
                impact="减少显存访问量，提升带宽利用率"
            ))

            suggestions.append(OptimizationSuggestion(
                category="Config Optimization",
                priority="medium",
                suggestion="启用 KV Cache 优化（PagedAttention）",
                impact="减少 KV Cache 显存占用和带宽使用"
            ))

        if model_info and model_info.get("context_length", 0) > 8000:
            suggestions.append(OptimizationSuggestion(
                category="Input Optimization",
                priority="medium",
                suggestion="考虑使用滑动窗口或稀疏注意力减少长上下文计算",
                impact="降低长上下文的显存带宽压力"
            ))

        # 低优先级建议
        suggestions.append(OptimizationSuggestion(
            category="System Config",
            priority="low",
            suggestion="启用显存池和内存锁定",
            impact="减少显存分配开销"
        ))

        return suggestions

    def _get_balanced_suggestions(self) -> List[OptimizationSuggestion]:
        """平衡状态下的优化建议"""
        suggestions = []

        suggestions.append(OptimizationSuggestion(
            category="Status",
            priority="low",
            suggestion="当前系统运行在合理效率范围",
            impact="无需特殊优化"
        ))

        suggestions.append(OptimizationSuggestion(
            category="Monitoring",
            priority="low",
            suggestion="持续监控 MFU 和带宽使用率变化",
            impact="及时发现性能波动"
        ))

        return suggestions

    def get_bottleneck_description(self, bottleneck_type: str) -> str:
        """获取瓶颈类型的中文描述"""
        descriptions = {
            "compute": "系统当前主要受计算能力限制",
            "memory": "系统当前主要受显存带宽限制",
            "balanced": "系统计算和访存相对平衡",
        }
        return descriptions.get(bottleneck_type, "未知瓶颈类型")


def get_optimization_suggestions(
    mfu: float,
    bandwidth_utilization: float,
    hardware_info: Dict[str, Any] = None,
    model_info: Dict[str, Any] = None,
    bottleneck_type: str = "balanced"
) -> List[Dict[str, str]]:
    """便捷的优化建议生成函数"""
    engine = OptimizationEngine()
    suggestions = engine.generate_suggestions(
        mfu, bandwidth_utilization, hardware_info, model_info, bottleneck_type
    )

    return [
        {
            "category": s.category,
            "priority": s.priority,
            "suggestion": s.suggestion,
            "impact": s.impact,
        }
        for s in suggestions
    ]
