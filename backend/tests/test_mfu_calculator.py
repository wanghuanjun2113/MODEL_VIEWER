"""MFU 计算引擎测试"""

import pytest
from app.services.mfu_calculator import (
    MFUCalculator,
    calculate_mfu,
    HardwareInfo,
    ModelInfo,
    CalculationInput,
)


class TestMFUCalculator:
    """MFU 计算引擎测试"""

    @pytest.fixture
    def calculator(self):
        """创建计算器实例"""
        return MFUCalculator()

    @pytest.fixture
    def a100_hardware(self):
        """A100 80GB 硬件信息"""
        return HardwareInfo(
            fp16_peak_tflops=1248.0,
            bf32_peak_tflops=624.0,
            fp32_peak_tflops=312.0,
            memory_size_gb=80.0,
            memory_bandwidth_tbps=2.039,
        )

    @pytest.fixture
    def llama7b_model(self):
        """Llama-2-7B 模型信息"""
        return ModelInfo(
            params_billions=7.0,
            num_layers=32,
            hidden_size=4096,
            num_attention_heads=32,
            num_key_value_heads=32,
            vocab_size=32000,
            intermediate_size=11008,
            head_dim=128,
            max_position_embeddings=4096,
        )

    def test_get_peak_flops_fp16(self, calculator, a100_hardware):
        """测试 FP16 峰值算力获取"""
        result = calculator._get_peak_flops(a100_hardware, "fp16")
        assert result == 1248.0

    def test_get_peak_flops_bf16(self, calculator, a100_hardware):
        """测试 BF16 峰值算力获取"""
        result = calculator._get_peak_flops(a100_hardware, "bf16")
        assert result == 624.0

    def test_get_peak_flops_fp32(self, calculator, a100_hardware):
        """测试 FP32 峰值算力获取"""
        result = calculator._get_peak_flops(a100_hardware, "fp32")
        assert result == 312.0

    def test_calculate_prefill_flops(self, calculator, llama7b_model):
        """测试 Prefill FLOPs 计算公式"""
        context_length = 2048

        # 使用计算器
        result = calculator._calculate_prefill_flops(llama7b_model, context_length)

        # 验证结果大于 0
        assert result > 0

        # 手动验证公式
        L = llama7b_model.num_layers
        d = llama7b_model.hidden_size
        n = llama7b_model.vocab_size

        # 近似计算
        attention_flops = 4 * L * context_length * d * d
        mlp_flops = 3 * L * context_length * d * llama7b_model.intermediate_size
        output_flops = L * context_length * d * n

        expected = 2 * (attention_flops + mlp_flops + output_flops)

        assert abs(result - expected) < 1e6  # 允许小误差

    def test_calculate_decode_flops(self, calculator, llama7b_model):
        """测试 Decode FLOPs 计算公式"""
        generated_length = 128
        batch_size = 1

        result = calculator._calculate_decode_flops(llama7b_model, generated_length, batch_size)

        # 验证结果大于 0
        assert result > 0

        # 验证 batch_size 影响
        result_batch2 = calculator._calculate_decode_flops(llama7b_model, generated_length, 2)
        assert result_batch2 == result * 2

    def test_calculate_kv_cache(self, calculator, llama7b_model):
        """测试 KV Cache 计算"""
        context_length = 2048
        generated_length = 128
        batch_size = 1
        precision = "fp16"

        result = calculator._calculate_kv_cache(
            llama7b_model, context_length, generated_length, batch_size, precision
        )

        # 验证结果大于 0
        assert result > 0

        # 手动验证公式
        precision_size = 2  # FP16
        total_seq_len = context_length + generated_length
        kv_per_layer = 2 * llama7b_model.num_attention_heads * llama7b_model.head_dim * total_seq_len * precision_size
        expected = llama7b_model.num_layers * kv_per_layer * batch_size

        assert result == expected

    def test_calculate_model_memory(self, calculator, llama7b_model):
        """测试模型内存计算"""
        precision = "fp16"

        result = calculator._calculate_model_memory(llama7b_model, precision)

        # 验证结果大于 0
        assert result > 0

        # 验证精度影响
        result_fp32 = calculator._calculate_model_memory(llama7b_model, "fp32")
        assert result_fp32 == result * 2  # FP32 是 FP16 的 2 倍

    def test_calculate_required_bandwidth(self, calculator):
        """测试所需带宽计算"""
        model_memory = 14e9  # 14GB
        kv_cache = 2e9  # 2GB
        total_time_ms = 1000.0

        result = calculator._calculate_required_bandwidth(
            model_memory, kv_cache, total_time_ms, 1
        )

        # 验证结果大于 0
        assert result > 0

    def test_determine_bottleneck_compute(self, calculator):
        """测试计算瓶颈判断"""
        result = calculator._determine_bottleneck(mfu=80, bandwidth_utilization=30)
        assert result == "compute"

    def test_determine_bottleneck_memory(self, calculator):
        """测试访存瓶颈判断"""
        result = calculator._determine_bottleneck(mfu=20, bandwidth_utilization=80)
        assert result == "memory"

    def test_determine_bottleneck_balanced(self, calculator):
        """测试平衡状态判断"""
        result = calculator._determine_bottleneck(mfu=50, bandwidth_utilization=50)
        assert result == "balanced"

    def test_full_calculation(
        self, calculator, a100_hardware, llama7b_model
    ):
        """测试完整计算流程"""
        input_data = CalculationInput(
            precision="fp16",
            first_token_latency_ms=50.0,
            tpot_ms=10.0,
            context_length=2048,
            generated_length=128,
            batch_size=1,
        )

        result = calculator.calculate(a100_hardware, llama7b_model, input_data)

        # 验证结果结构
        assert result.mfu > 0
        assert result.memory_bandwidth_utilization > 0
        assert result.theoretical_flops > 0
        assert result.actual_flops > 0
        assert result.peak_flops > 0
        assert result.bottleneck_type in ["compute", "memory", "balanced"]
        assert result.tokens_per_second > 0

        # 验证数值范围
        assert 0 < result.mfu <= 100
        assert 0 < result.memory_bandwidth_utilization <= 100

    def test_mfu_value_range(self, calculator, a100_hardware, llama7b_model):
        """测试 MFU 值在合理范围内"""
        input_data = CalculationInput(
            precision="fp16",
            first_token_latency_ms=50.0,
            tpot_ms=10.0,
            context_length=2048,
            generated_length=128,
            batch_size=1,
        )

        result = calculator.calculate(a100_hardware, llama7b_model, input_data)

        # MFU 应该在 0-100% 之间
        assert 0 < result.mfu <= 100


class TestCalculateMFU:
    """便捷计算函数测试"""

    def test_calculate_mfu_with_dicts(self, A100_80GB, LLAMA_7B):
        """测试使用字典参数的便捷计算函数"""
        input_data = {
            "precision": "fp16",
            "first_token_latency_ms": 50.0,
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        result = calculate_mfu(A100_80GB, LLAMA_7B, input_data)

        # 验证结果
        assert "mfu" in result
        assert "memory_bandwidth_utilization" in result
        assert "bottleneck_type" in result
        assert 0 < result["mfu"] <= 100

    def test_calculate_mfu_different_precisions(self, A100_80GB, LLAMA_7B):
        """测试不同精度计算"""
        input_data = {
            "first_token_latency_ms": 50.0,
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        result_fp16 = calculate_mfu(A100_80GB, LLAMA_7B, {**input_data, "precision": "fp16"})
        result_bf16 = calculate_mfu(A100_80GB, LLAMA_7B, {**input_data, "precision": "bf16"})
        result_fp32 = calculate_mfu(A100_80GB, LLAMA_7B, {**input_data, "precision": "fp32"})

        # FP16 的 peak_flops 应该最高
        assert result_fp16["peak_flops"] > result_bf16["peak_flops"]
        assert result_bf16["peak_flops"] > result_fp32["peak_flops"]
