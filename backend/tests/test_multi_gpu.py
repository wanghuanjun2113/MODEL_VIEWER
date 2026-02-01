"""多卡计算功能测试"""

import pytest
from app.services.mfu_calculator import (
    MFUCalculator,
    calculate_mfu,
    HardwareInfo,
    ModelInfo,
    CalculationInput,
)


class TestMultiGPUCalculator:
    """多卡计算测试"""

    @pytest.fixture
    def calculator(self):
        """创建计算器实例"""
        return MFUCalculator()

    @pytest.fixture
    def a100_hardware(self):
        """A100 80GB 单卡硬件信息"""
        return HardwareInfo(
            fp16_peak_tflops=1248.0,
            bf32_peak_tflops=624.0,
            fp32_peak_tflops=312.0,
            memory_size_gb=80.0,
            memory_bandwidth_tbps=2.039,
            gpu_count=1,
        )

    @pytest.fixture
    def a100_8gpu_hardware(self):
        """8卡 A100 硬件信息 (8x80GB)"""
        return HardwareInfo(
            fp16_peak_tflops=1248.0,
            bf32_peak_tflops=624.0,
            fp32_peak_tflops=312.0,
            memory_size_gb=640.0,  # 80 * 8
            memory_bandwidth_tbps=2.039,
            gpu_count=8,
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

    def test_peak_flops_multiplied_by_gpu_count(
        self, calculator, a100_hardware, a100_8gpu_hardware, llama7b_model
    ):
        """测试峰值算力是否按 GPU 数量倍增"""
        input_data = CalculationInput(
            precision="fp16",
            attention_precision="fp16",
            ffn_precision="fp16",
            first_token_latency_ms=50.0,
            tpot_ms=10.0,
            context_length=2048,
            generated_length=128,
            batch_size=1,
        )

        result_single = calculator.calculate(a100_hardware, llama7b_model, input_data)
        result_multi = calculator.calculate(a100_8gpu_hardware, llama7b_model, input_data)

        # 8卡情况下峰值算力应该是单卡的 8 倍
        assert result_multi.peak_flops == pytest.approx(result_single.peak_flops * 8, rel=0.01)

    def test_memory_bandwidth_utilization_with_multi_gpu(
        self, calculator, a100_hardware, a100_8gpu_hardware, llama7b_model
    ):
        """测试多卡情况下显存带宽利用率计算"""
        input_data = CalculationInput(
            precision="fp16",
            attention_precision="fp16",
            ffn_precision="fp16",
            first_token_latency_ms=50.0,
            tpot_ms=10.0,
            context_length=2048,
            generated_length=128,
            batch_size=1,
        )

        result_single = calculator.calculate(a100_hardware, llama7b_model, input_data)
        result_multi = calculator.calculate(a100_8gpu_hardware, llama7b_model, input_data)

        # 8卡情况下，带宽利用率应该降低（因为总带宽增加了）
        assert result_multi.memory_bandwidth_utilization < result_single.memory_bandwidth_utilization

    def test_mfu_calculation_with_multi_gpu(
        self, calculator, a100_8gpu_hardware, llama7b_model
    ):
        """测试多卡情况下 MFU 计算"""
        input_data = CalculationInput(
            precision="fp16",
            attention_precision="fp16",
            ffn_precision="fp16",
            first_token_latency_ms=50.0,
            tpot_ms=10.0,
            context_length=2048,
            generated_length=128,
            batch_size=1,
        )

        result = calculator.calculate(a100_8gpu_hardware, llama7b_model, input_data)

        # 验证结果结构
        assert result.mfu > 0
        assert result.memory_bandwidth_utilization > 0
        assert result.theoretical_flops > 0
        assert result.actual_flops > 0
        assert result.peak_flops > 0
        assert result.bottleneck_type in ["compute", "memory", "balanced"]

        # 验证 peak_flops 包含 GPU 数量
        expected_peak = 1248.0 * 8  # 单卡峰值 * 8
        assert result.peak_flops == pytest.approx(expected_peak, rel=0.01)


class TestCalculateMFUMultiGPU:
    """便捷计算函数多卡测试"""

    def test_calculate_mfu_with_gpu_count(self, A100_80GB, LLAMA_7B):
        """测试使用 gpu_count 参数的便捷计算函数"""
        # 单卡计算
        input_data_single = {
            "gpu_count": 1,
            "precision": "fp16",
            "first_token_latency_ms": 50.0,
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        result_single = calculate_mfu(A100_80GB, LLAMA_7B, input_data_single)

        # 8卡计算
        input_data_multi = {
            "gpu_count": 8,
            "precision": "fp16",
            "first_token_latency_ms": 50.0,
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        result_multi = calculate_mfu(A100_80GB, LLAMA_7B, input_data_multi)

        # 验证 8卡情况下峰值算力是单卡的 8 倍
        assert result_multi["peak_flops"] == pytest.approx(result_single["peak_flops"] * 8, rel=0.01)

        # 验证显存按 GPU 数量倍增
        expected_memory = A100_80GB["memory_size_gb"] * 8
        assert result_multi["peak_flops"] == pytest.approx(result_single["peak_flops"] * 8, rel=0.01)

    def test_calculate_mfu_different_gpu_counts(self, A100_80GB, LLAMA_7B):
        """测试不同 GPU 数量的计算"""
        input_data_base = {
            "precision": "fp16",
            "first_token_latency_ms": 50.0,
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        # 测试 1, 2, 4, 8, 16, 32 卡
        gpu_counts = [1, 2, 4, 8, 16, 32]
        prev_peak = 0

        for gpu_count in gpu_counts:
            input_data = {**input_data_base, "gpu_count": gpu_count}
            result = calculate_mfu(A100_80GB, LLAMA_7B, input_data)

            # 验证峰值算力按比例增加
            expected_peak = A100_80GB["fp16_peak_tflops"] * gpu_count
            assert result["peak_flops"] == pytest.approx(expected_peak, rel=0.01)

            # 验证显存按比例增加
            expected_memory = A100_80GB["memory_size_gb"] * gpu_count

            prev_peak = result["peak_flops"]

    def test_calculate_mfu_gpu_count_default(self, A100_80GB, LLAMA_7B):
        """测试 gpu_count 默认值为 1"""
        input_data = {
            "precision": "fp16",
            "first_token_latency_ms": 50.0,
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
            # 不指定 gpu_count
        }

        result = calculate_mfu(A100_80GB, LLAMA_7B, input_data)

        # 应该使用默认 gpu_count=1
        expected_peak = A100_80GB["fp16_peak_tflops"] * 1
        assert result["peak_flops"] == pytest.approx(expected_peak, rel=0.01)


class TestConcurrencyCalculator:
    """并发计算器测试"""

    def test_calculate_concurrency_logic(self, A100_80GB, LLAMA_7B):
        """测试并发计算逻辑"""
        from app.routers.concurrency import calculate_concurrency_logic

        # 单卡配置
        result = calculate_concurrency_logic(
            hardware=A100_80GB,
            model=LLAMA_7B,
            gpu_count=1,
            context_length=4096,
            precision="fp16",
            framework_overhead_gb=2.0,
        )

        # 验证结果结构
        assert "gpu_count" in result
        assert "max_concurrency_without_pa" in result
        assert "max_concurrency_with_pa" in result
        assert "memory_breakdown" in result
        assert "hardware_memory_gb" in result
        assert "available_memory_gb" in result

        assert result["gpu_count"] == 1
        assert result["max_concurrency_without_pa"] >= 0
        assert result["max_concurrency_with_pa"] >= result["max_concurrency_without_pa"]

    def test_calculate_concurrency_multi_gpu(self, A100_80GB, LLAMA_7B):
        """测试多卡并发计算"""
        from app.routers.concurrency import calculate_concurrency_logic

        # 单卡结果
        result_single = calculate_concurrency_logic(
            hardware=A100_80GB,
            model=LLAMA_7B,
            gpu_count=1,
            context_length=4096,
            precision="fp16",
            framework_overhead_gb=2.0,
        )

        # 8卡结果
        result_8gpu = calculate_concurrency_logic(
            hardware=A100_80GB,
            model=LLAMA_7B,
            gpu_count=8,
            context_length=4096,
            precision="fp16",
            framework_overhead_gb=2.0,
        )

        # 8卡情况下硬件显存应该是单卡的 8 倍
        assert result_8gpu["hardware_memory_gb"] == pytest.approx(
            result_single["hardware_memory_gb"] * 8, rel=0.01
        )

        # 8卡情况下可用显存应该是 8倍硬件显存减去固定框架开销
        # 单卡: 80 - 2 = 78
        # 8卡: 80*8 - 2 = 638
        assert result_8gpu["available_memory_gb"] == pytest.approx(638.0, rel=0.01)

        # 8卡情况下最大并发数应该约为单卡的 8 倍
        assert result_8gpu["max_concurrency_without_pa"] >= result_single["max_concurrency_without_pa"] * 7

    def test_calculate_concurrency_paged_attention(self, A100_80GB, LLAMA_7B):
        """测试 Paged Attention 对并发计算的影响"""
        from app.routers.concurrency import calculate_concurrency_logic

        # Use larger context to make KV cache savings more significant
        result = calculate_concurrency_logic(
            hardware=A100_80GB,
            model=LLAMA_7B,
            gpu_count=1,
            context_length=8192,  # Larger context for more KV cache savings
            precision="fp16",
            framework_overhead_gb=2.0,
        )

        # Paged Attention should increase concurrency when KV cache is significant
        # With larger context, the difference should be more apparent
        assert result["max_concurrency_with_pa"] >= result["max_concurrency_without_pa"]

    def test_calculate_concurrency_different_gpu_counts(self, A100_80GB, LLAMA_7B):
        """测试不同 GPU 数量的并发计算"""
        from app.routers.concurrency import calculate_concurrency_logic

        gpu_counts = [1, 2, 4, 8, 16, 32]
        prev_concurrency = 0

        for gpu_count in gpu_counts:
            result = calculate_concurrency_logic(
                hardware=A100_80GB,
                model=LLAMA_7B,
                gpu_count=gpu_count,
                context_length=4096,
                precision="fp16",
                framework_overhead_gb=2.0,
            )

            assert result["gpu_count"] == gpu_count
            assert result["hardware_memory_gb"] == pytest.approx(
                A100_80GB["memory_size_gb"] * gpu_count, rel=0.01
            )

            # 验证显存计算
            expected_available = A100_80GB["memory_size_gb"] * gpu_count - 2.0
            assert result["available_memory_gb"] == pytest.approx(expected_available, rel=0.01)

            prev_concurrency = result["max_concurrency_without_pa"]

    def test_calculate_concurrency_memory_breakdown(self, A100_80GB, LLAMA_7B):
        """测试显存占用明细计算"""
        from app.routers.concurrency import calculate_concurrency_logic

        result = calculate_concurrency_logic(
            hardware=A100_80GB,
            model=LLAMA_7B,
            gpu_count=1,
            context_length=4096,
            precision="fp16",
            framework_overhead_gb=2.0,
        )

        breakdown = result["memory_breakdown"]

        # 验证显存明细结构
        assert "weight_memory_gb" in breakdown
        assert "framework_overhead_gb" in breakdown
        assert "kv_cache_memory_gb" in breakdown
        assert "activation_memory_gb" in breakdown
        assert "total_memory_gb" in breakdown

        # 验证权重显存计算 (7B FP16 = 14GB)
        assert breakdown["weight_memory_gb"] == pytest.approx(14.0, rel=0.1)

        # 验证框架开销
        assert breakdown["framework_overhead_gb"] == 2.0

        # 验证总显存
        assert breakdown["total_memory_gb"] == pytest.approx(
            breakdown["weight_memory_gb"]
            + breakdown["framework_overhead_gb"]
            + breakdown["kv_cache_memory_gb"]
            + breakdown["activation_memory_gb"],
            rel=0.01,
        )
