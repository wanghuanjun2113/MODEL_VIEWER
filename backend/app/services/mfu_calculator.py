"""MFU (Model FLOPs Utilization) 计算引擎

MFU 计算公式基于以下原理：
1. Prefill 阶段：处理输入序列，计算密集的注意力计算
2. Decode 阶段：自回归生成，每个 token 只需要部分计算

参考论文和实现：
- https://medium.com/@dzmitrybahdanau/the-flops-considerations-of-modern-transformer-models-a8b67182765f
- https://github.com/EleutherAI/gpt-neox
"""

from dataclasses import dataclass
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


@dataclass
class HardwareInfo:
    """硬件信息"""

    fp16_peak_tflops: float
    bf32_peak_tflops: float
    fp32_peak_tflops: float
    memory_size_gb: float
    memory_bandwidth_tbps: float


@dataclass
class ModelInfo:
    """模型信息"""

    params_billions: float
    num_layers: int
    hidden_size: int
    num_attention_heads: int
    num_key_value_heads: int
    vocab_size: int
    intermediate_size: int
    head_dim: int
    max_position_embeddings: int


@dataclass
class CalculationInput:
    """计算输入参数"""

    precision: str  # fp16, bf16, fp32
    first_token_latency_ms: float
    tpot_ms: float
    context_length: int
    generated_length: int
    batch_size: int


@dataclass
class CalculationOutput:
    """计算输出结果"""

    # 核心指标
    mfu: float
    memory_bandwidth_utilization: float

    # 详细指标
    theoretical_flops: float
    actual_flops: float
    peak_flops: float

    # FLOPs 分解
    prefill_flops: float
    decode_flops: float

    # 内存信息
    kv_cache_bytes: float
    model_memory_bytes: float

    # 瓶颈分析
    bottleneck_type: str  # compute, memory, balanced

    # 性能指标
    tokens_per_second: float
    total_time_ms: float


class MFUCalculator:
    """MFU 计算引擎"""

    # 不同精度的大小（bytes）
    PRECISION_SIZE = {
        "fp16": 2,
        "bf16": 2,
        "fp32": 4,
    }

    def __init__(self):
        pass

    def calculate(
        self,
        hardware: HardwareInfo,
        model: ModelInfo,
        input_data: CalculationInput
    ) -> CalculationOutput:
        """执行 MFU 计算

        Args:
            hardware: 硬件信息
            model: 模型信息
            input_data: 输入参数

        Returns:
            计算结果
        """
        # 1. 获取峰值算力
        peak_flops = self._get_peak_flops(hardware, input_data.precision)

        # 2. 计算各阶段 FLOPs
        prefill_flops = self._calculate_prefill_flops(model, input_data.context_length)
        decode_flops = self._calculate_decode_flops(
            model, input_data.generated_length, input_data.batch_size
        )

        # 3. 总 FLOPs
        total_flops = prefill_flops + decode_flops

        # 4. 实际算力 (FLOPs / time)
        total_time_ms = input_data.first_token_latency_ms + \
                       input_data.generated_length * input_data.tpot_ms
        total_time_seconds = total_time_ms / 1000.0

        # 避免除以零
        if total_time_seconds <= 0:
            actual_flops = peak_flops
        else:
            actual_flops = total_flops / total_time_seconds / 1e12  # TFLOPS

        # 5. 计算 MFU
        mfu = (actual_flops / peak_flops * 100) if peak_flops > 0 else 0

        # 6. 计算显存需求和带宽使用
        kv_cache_bytes = self._calculate_kv_cache(
            model,
            input_data.context_length,
            input_data.generated_length,
            input_data.batch_size,
            input_data.precision
        )
        model_memory_bytes = self._calculate_model_memory(model, input_data.precision)

        # 带宽计算：基于时延和传输数据量
        required_bandwidth = self._calculate_required_bandwidth(
            model_memory_bytes,
            kv_cache_bytes,
            total_time_ms,
            input_data.batch_size
        )

        memory_bandwidth_utilization = (
            required_bandwidth / hardware.memory_bandwidth_tbps * 100
        ) if hardware.memory_bandwidth_tbps > 0 else 0

        # 7. 性能指标
        tokens_per_second = (
            (input_data.generated_length * input_data.batch_size) / total_time_seconds
            if total_time_seconds > 0 else 0
        )

        # 8. 确定瓶颈类型
        bottleneck_type = self._determine_bottleneck(
            mfu, memory_bandwidth_utilization
        )

        return CalculationOutput(
            mfu=round(mfu, 2),
            memory_bandwidth_utilization=round(memory_bandwidth_utilization, 2),
            theoretical_flops=round(total_flops / 1e12, 2),  # TFLOPS
            actual_flops=round(actual_flops, 2),
            peak_flops=round(peak_flops, 2),
            prefill_flops=round(prefill_flops, 0),
            decode_flops=round(decode_flops, 0),
            kv_cache_bytes=round(kv_cache_bytes, 0),
            model_memory_bytes=round(model_memory_bytes, 0),
            bottleneck_type=bottleneck_type,
            tokens_per_second=round(tokens_per_second, 2),
            total_time_ms=round(total_time_ms, 2),
        )

    def _get_peak_flops(self, hardware: HardwareInfo, precision: str) -> float:
        """获取峰值算力 (TFLOPS)"""
        precision_map = {
            "fp16": hardware.fp16_peak_tflops,
            "bf16": hardware.bf32_peak_tflops,  # BF32 使用 BF32 峰值
            "fp32": hardware.fp32_peak_tflops,
        }
        return precision_map.get(precision, hardware.fp16_peak_tflops)

    def _calculate_prefill_flops(self, model: ModelInfo, context_length: int) -> float:
        """计算 Prefill 阶段的 FLOPs

        Prefill 阶段对整个输入序列进行计算，包括：
        - Q/K/V 投影: 3 * L * context_length * d * d
        - Attention 输出投影: L * context_length * d * d
        - MLP: 3 * L * context_length * d * intermediate_size
        - 输出投影: L * context_length * d * vocab_size

        简化公式（使用标准 Transformer 近似）：
        FLOPs = 2 * (2 * L * d^2 + 3 * L * d * n) * context_length

        其中 n 是词汇表大小
        """
        L = model.num_layers
        d = model.hidden_size
        n = model.vocab_size

        # 使用更精确的公式
        # Attention: 4 * L * context_length * d^2 (Q, K, V, O projections)
        attention_flops = 4 * L * context_length * d * d

        # MLP: 3 * L * context_length * d * intermediate_size
        # 注意：intermediate_size 通常是 2-4 倍的 hidden_size
        mlp_flops = 3 * L * context_length * d * model.intermediate_size

        # Output layer: L * context_length * d * vocab_size
        output_flops = L * context_length * d * n

        total_flops = attention_flops + mlp_flops + output_flops

        # 乘以 2 (因为每个 MAC 对应 2 个 FLOP)
        return 2 * total_flops

    def _calculate_decode_flops(
        self,
        model: ModelInfo,
        generated_length: int,
        batch_size: int
    ) -> float:
        """计算 Decode 阶段的 FLOPs

        Decode 阶段自回归生成每个 token：
        - 每个 token 的计算与 context_length=1 类似
        - 但 KV cache 需要更新

        FLOPs = 2 * L * d * (2 * d + n) * generated_length * batch_size
        """
        L = model.num_layers
        d = model.hidden_size
        n = model.vocab_size

        # Attention per token: 4 * L * d^2
        attention_flops = 4 * L * d * d

        # MLP per token: 3 * L * d * intermediate_size
        mlp_flops = 3 * L * d * model.intermediate_size

        # Output per token: L * d * n
        output_flops = L * d * n

        # 单个 token 的 FLOPs
        per_token_flops = attention_flops + mlp_flops + output_flops

        # 乘以 2 (MAC -> FLOPs)
        total_flops = 2 * per_token_flops * generated_length * batch_size

        return total_flops

    def _calculate_kv_cache(
        self,
        model: ModelInfo,
        context_length: int,
        generated_length: int,
        batch_size: int,
        precision: str
    ) -> float:
        """计算 KV Cache 大小 (bytes)

        KV Cache = 2 * batch_size * num_layers * num_heads * head_dim * seq_len * precision_size

        注意：KV cache 需要存储所有层的 K 和 V
        """
        precision_size = self.PRECISION_SIZE.get(precision, 2)
        total_seq_len = context_length + generated_length

        # 每个 layer 的 KV cache
        # K 和 V 各一份
        kv_per_layer = 2 * model.num_attention_heads * model.head_dim * total_seq_len * precision_size

        # 所有 layer
        total_kv = model.num_layers * kv_per_layer

        # batch
        return total_kv * batch_size

    def _calculate_model_memory(self, model: ModelInfo, precision: str) -> float:
        """计算模型参数内存 (bytes)

        对于 Llama 风格模型：
        - Embedding: vocab_size * d
        - Attention: 4 * L * d^2 (Q, K, V, O)
        - MLP: 3 * L * d * intermediate_size
        - Output: vocab_size * d
        """
        precision_size = self.PRECISION_SIZE.get(precision, 2)
        d = model.hidden_size
        L = model.num_layers
        n = model.vocab_size

        # Attention params: 4 * L * d^2
        attention_params = 4 * L * d * d

        # MLP params: 3 * L * d * intermediate_size
        mlp_params = 3 * L * d * model.intermediate_size

        # Embedding and output
        embedding_params = 2 * n * d

        total_params = attention_params + mlp_params + embedding_params

        return total_params * precision_size

    def _calculate_required_bandwidth(
        self,
        model_memory_bytes: float,
        kv_cache_bytes: float,
        total_time_ms: float,
        batch_size: int
    ) -> float:
        """计算所需显存带宽 (TB/s)

        所需带宽 = 总数据传输量 / 时间
        """
        total_bytes = model_memory_bytes + kv_cache_bytes

        if total_time_ms <= 0:
            return 0

        # bytes to TB
        total_tb = total_bytes / 1e12
        time_seconds = total_time_ms / 1000

        return total_tb / time_seconds

    def _determine_bottleneck(
        self,
        mfu: float,
        bandwidth_utilization: float
    ) -> str:
        """确定系统瓶颈类型

        判断依据：
        - MFU > 80% 且 带宽使用率低 -> 计算受限
        - MFU < 40% 且 带宽使用率高 -> 访存受限
        - 其他 -> 平衡
        """
        if mfu > 70 and bandwidth_utilization < 40:
            return "compute"  # 计算受限
        elif mfu < 30 and bandwidth_utilization > 70:
            return "memory"  # 访存受限
        else:
            return "balanced"  # 平衡


def calculate_mfu(
    hardware: Dict[str, float],
    model: Dict[str, Any],
    input_data: Dict[str, Any]
) -> Dict[str, Any]:
    """便捷的 MFU 计算函数

    Args:
        hardware: 硬件参数字典
        model: 模型参数字典
        input_data: 输入参数字典

    Returns:
        计算结果字典
    """
    hw_info = HardwareInfo(
        fp16_peak_tflops=hardware.get("fp16_peak_tflops", 0),
        bf32_peak_tflops=hardware.get("bf32_peak_tflops", 0),
        fp32_peak_tflops=hardware.get("fp32_peak_tflops", 0),
        memory_size_gb=hardware.get("memory_size_gb", 0),
        memory_bandwidth_tbps=hardware.get("memory_bandwidth_tbps", 0),
    )

    model_info = ModelInfo(
        params_billions=model.get("params_billions", 0),
        num_layers=model.get("num_layers", 0),
        hidden_size=model.get("hidden_size", 0),
        num_attention_heads=model.get("num_attention_heads", 0),
        num_key_value_heads=model.get("num_key_value_heads", 0),
        vocab_size=model.get("vocab_size", 0),
        intermediate_size=model.get("intermediate_size", 0),
        head_dim=model.get("head_dim", 0),
        max_position_embeddings=model.get("max_position_embeddings", 0),
    )

    calc_input = CalculationInput(
        precision=input_data.get("precision", "fp16"),
        first_token_latency_ms=input_data.get("first_token_latency_ms", 0),
        tpot_ms=input_data.get("tpot_ms", 0),
        context_length=input_data.get("context_length", 0),
        generated_length=input_data.get("generated_length", 0),
        batch_size=input_data.get("batch_size", 1),
    )

    calculator = MFUCalculator()
    result = calculator.calculate(hw_info, model_info, calc_input)

    return {
        "mfu": result.mfu,
        "memory_bandwidth_utilization": result.memory_bandwidth_utilization,
        "theoretical_flops": result.theoretical_flops,
        "actual_flops": result.actual_flops,
        "peak_flops": result.peak_flops,
        "prefill_flops": result.prefill_flops,
        "decode_flops": result.decode_flops,
        "kv_cache_bytes": result.kv_cache_bytes,
        "model_memory_bytes": result.model_memory_bytes,
        "bottleneck_type": result.bottleneck_type,
        "tokens_per_second": result.tokens_per_second,
        "total_time_ms": result.total_time_ms,
    }
