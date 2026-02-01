"""计算 API 测试"""

import pytest


class TestCalculateAPI:
    """计算 API 测试"""

    def test_calculate_mfu_success(self, client, sample_hardware, sample_model):
        """测试成功计算 MFU"""
        # 创建硬件和模型
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        # 计算
        calc_data = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "gpu_count": 1,
            "precision": "fp16",
            "attention_precision": "fp16",
            "ffn_precision": "fp16",
            "first_token_latency_ms": 50.0,
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        response = client.post("/api/v1/calculate/mfu", json=calc_data)
        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert data["result"]["mfu"] > 0
        assert data["result"]["memory_bandwidth_utilization"] > 0
        assert len(data["suggestions"]) > 0

    def test_calculate_mfu_multi_gpu(self, client, sample_hardware, sample_model):
        """测试多卡 MFU 计算"""
        # 创建硬件和模型
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        # 单卡计算
        calc_data_single = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "gpu_count": 1,
            "precision": "fp16",
            "attention_precision": "fp16",
            "ffn_precision": "fp16",
            "first_token_latency_ms": 50.0,
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        response_single = client.post("/api/v1/calculate/mfu", json=calc_data_single)
        assert response_single.status_code == 200
        data_single = response_single.json()

        # 8卡计算
        calc_data_8gpu = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "gpu_count": 8,
            "precision": "fp16",
            "attention_precision": "fp16",
            "ffn_precision": "fp16",
            "first_token_latency_ms": 50.0,
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        response_8gpu = client.post("/api/v1/calculate/mfu", json=calc_data_8gpu)
        assert response_8gpu.status_code == 200
        data_8gpu = response_8gpu.json()

        # 8卡情况下峰值算力应该是单卡的 8 倍
        assert data_8gpu["result"]["peak_flops"] == pytest.approx(
            data_single["result"]["peak_flops"] * 8, rel=0.01
        )

    def test_calculate_mfu_gpu_count_options(self, client, sample_hardware, sample_model):
        """测试不同 GPU 数量选项"""
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        gpu_counts = [1, 2, 4, 8, 16, 32]
        prev_peak = 0

        for gpu_count in gpu_counts:
            calc_data = {
                "hardware_id": hardware_id,
                "model_id": model_id,
                "gpu_count": gpu_count,
                "precision": "fp16",
                "attention_precision": "fp16",
                "ffn_precision": "fp16",
                "first_token_latency_ms": 50.0,
                "tpot_ms": 10.0,
                "context_length": 2048,
                "generated_length": 128,
                "batch_size": 1,
            }

            response = client.post("/api/v1/calculate/mfu", json=calc_data)
            assert response.status_code == 200
            data = response.json()

            # 验证峰值算力随 GPU 数量增加
            expected_peak = sample_hardware["fp16_peak_tflops"] * gpu_count
            assert data["result"]["peak_flops"] == pytest.approx(expected_peak, rel=0.01)

    def test_calculate_mfu_hardware_not_found(self, client, sample_model):
        """测试硬件不存在"""
        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        calc_data = {
            "hardware_id": 99999,
            "model_id": model_id,
            "gpu_count": 1,
            "precision": "fp16",
            "attention_precision": "fp16",
            "ffn_precision": "fp16",
            "first_token_latency_ms": 50.0,
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        response = client.post("/api/v1/calculate/mfu", json=calc_data)
        assert response.status_code == 404

    def test_calculate_mfu_model_not_found(self, client, sample_hardware):
        """测试模型不存在"""
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        calc_data = {
            "hardware_id": hardware_id,
            "model_id": 99999,
            "gpu_count": 1,
            "precision": "fp16",
            "attention_precision": "fp16",
            "ffn_precision": "fp16",
            "first_token_latency_ms": 50.0,
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        response = client.post("/api/v1/calculate/mfu", json=calc_data)
        assert response.status_code == 404

    def test_calculate_mfu_validation(self, client, sample_hardware, sample_model):
        """测试输入验证"""
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        # 负值验证
        calc_data = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "gpu_count": 1,
            "precision": "fp16",
            "attention_precision": "fp16",
            "ffn_precision": "fp16",
            "first_token_latency_ms": -50.0,  # 负值
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        response = client.post("/api/v1/calculate/mfu", json=calc_data)
        assert response.status_code == 422

    def test_calculate_mfu_invalid_gpu_count(self, client, sample_hardware, sample_model):
        """测试无效 GPU 数量验证"""
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        # GPU 数量为 0
        calc_data = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "gpu_count": 0,
            "precision": "fp16",
            "attention_precision": "fp16",
            "ffn_precision": "fp16",
            "first_token_latency_ms": 50.0,
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        response = client.post("/api/v1/calculate/mfu", json=calc_data)
        assert response.status_code == 422

    def test_calculate_mfu_result_structure(self, client, sample_hardware, sample_model):
        """测试结果结构"""
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        calc_data = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "gpu_count": 1,
            "precision": "fp16",
            "attention_precision": "fp16",
            "ffn_precision": "fp16",
            "first_token_latency_ms": 50.0,
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        response = client.post("/api/v1/calculate/mfu", json=calc_data)
        data = response.json()

        result = data["result"]
        assert "mfu" in result
        assert "memory_bandwidth_utilization" in result
        assert "theoretical_flops" in result
        assert "actual_flops" in result
        assert "peak_flops" in result
        assert "prefill_flops" in result
        assert "decode_flops" in result
        assert "kv_cache_bytes" in result
        assert "model_memory_bytes" in result
        assert "bottleneck_type" in result
        assert "tokens_per_second" in result
        assert "total_time_ms" in result

    def test_calculate_mfu_different_precisions(self, client, sample_hardware, sample_model):
        """测试不同精度计算"""
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        for precision in ["fp16", "bf16", "fp32"]:
            calc_data = {
                "hardware_id": hardware_id,
                "model_id": model_id,
                "gpu_count": 1,
                "precision": precision,
                "attention_precision": precision,
                "ffn_precision": precision,
                "first_token_latency_ms": 50.0,
                "tpot_ms": 10.0,
                "context_length": 2048,
                "generated_length": 128,
                "batch_size": 1,
            }

            response = client.post("/api/v1/calculate/mfu", json=calc_data)
            assert response.status_code == 200
            data = response.json()
            assert 0 < data["result"]["mfu"] <= 100

    def test_get_bottleneck_description(self, client):
        """测试获取瓶颈描述"""
        response = client.get("/api/v1/calculate/bottleneck-description/compute")
        assert response.status_code == 200
        assert "计算" in response.json()["description"]

        response = client.get("/api/v1/calculate/bottleneck-description/memory")
        assert response.status_code == 200
        assert "显存" in response.json()["description"]

        response = client.get("/api/v1/calculate/bottleneck-description/balanced")
        assert response.status_code == 200
        assert "平衡" in response.json()["description"]


class TestConcurrencyAPI:
    """并发计算 API 测试"""

    def test_calculate_concurrency_success(self, client, sample_hardware, sample_model):
        """测试并发计算成功"""
        # 创建硬件和模型
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        # 并发计算
        calc_data = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "gpu_count": 1,
            "context_length": 4096,
            "precision": "fp16",
            "framework_overhead_gb": 2.0,
        }

        response = client.post("/api/v1/calculate/concurrency", json=calc_data)
        assert response.status_code == 200
        data = response.json()

        assert data["success"] is True
        assert "gpu_count" in data["result"]
        assert "max_concurrency_without_pa" in data["result"]
        assert "max_concurrency_with_pa" in data["result"]
        assert "memory_breakdown" in data["result"]
        assert "hardware_memory_gb" in data["result"]
        assert "available_memory_gb" in data["result"]

    def test_calculate_concurrency_multi_gpu(self, client, sample_hardware, sample_model):
        """测试多卡并发计算"""
        # 创建硬件和模型
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        # 单卡计算
        calc_data_single = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "gpu_count": 1,
            "context_length": 4096,
            "precision": "fp16",
            "framework_overhead_gb": 2.0,
        }

        response_single = client.post("/api/v1/calculate/concurrency", json=calc_data_single)
        assert response_single.status_code == 200
        data_single = response_single.json()

        # 8卡计算
        calc_data_8gpu = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "gpu_count": 8,
            "context_length": 4096,
            "precision": "fp16",
            "framework_overhead_gb": 2.0,
        }

        response_8gpu = client.post("/api/v1/calculate/concurrency", json=calc_data_8gpu)
        assert response_8gpu.status_code == 200
        data_8gpu = response_8gpu.json()

        # 8卡情况下硬件显存应该是单卡的 8 倍
        assert data_8gpu["result"]["hardware_memory_gb"] == pytest.approx(
            data_single["result"]["hardware_memory_gb"] * 8, rel=0.01
        )

        # 8卡情况下可用显存应该是 8倍硬件显存减去固定框架开销
        # 单卡: sample_hardware.memory_size_gb (80) - 2 = 78
        # 8卡: 80*8 - 2 = 638
        assert data_8gpu["result"]["available_memory_gb"] == pytest.approx(638.0, rel=0.01)

    def test_calculate_concurrency_gpu_count_options(self, client, sample_hardware, sample_model):
        """测试不同 GPU 数量的并发计算"""
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        gpu_counts = [1, 2, 4, 8, 16, 32]

        for gpu_count in gpu_counts:
            calc_data = {
                "hardware_id": hardware_id,
                "model_id": model_id,
                "gpu_count": gpu_count,
                "context_length": 4096,
                "precision": "fp16",
                "framework_overhead_gb": 2.0,
            }

            response = client.post("/api/v1/calculate/concurrency", json=calc_data)
            assert response.status_code == 200
            data = response.json()

            # 验证 GPU 数量正确
            assert data["result"]["gpu_count"] == gpu_count

            # 验证显存计算
            expected_memory = sample_hardware["memory_size_gb"] * gpu_count
            assert data["result"]["hardware_memory_gb"] == pytest.approx(expected_memory, rel=0.01)

    def test_calculate_concurrency_paged_attention(self, client, sample_hardware, sample_model):
        """测试 Paged Attention 对并发计算的影响"""
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        # Use larger context to make KV cache savings more significant
        calc_data = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "gpu_count": 1,
            "context_length": 8192,  # Larger context for more KV cache savings
            "precision": "fp16",
            "framework_overhead_gb": 2.0,
        }

        response = client.post("/api/v1/calculate/concurrency", json=calc_data)
        assert response.status_code == 200
        data = response.json()

        # Paged Attention should increase or maintain concurrency
        assert data["result"]["max_concurrency_with_pa"] >= data["result"]["max_concurrency_without_pa"]

    def test_calculate_concurrency_hardware_not_found(self, client, sample_model):
        """测试硬件不存在"""
        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        calc_data = {
            "hardware_id": 99999,
            "model_id": model_id,
            "gpu_count": 1,
            "context_length": 4096,
            "precision": "fp16",
            "framework_overhead_gb": 2.0,
        }

        response = client.post("/api/v1/calculate/concurrency", json=calc_data)
        assert response.status_code == 404

    def test_calculate_concurrency_model_not_found(self, client, sample_hardware):
        """测试模型不存在"""
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        calc_data = {
            "hardware_id": hardware_id,
            "model_id": 99999,
            "gpu_count": 1,
            "context_length": 4096,
            "precision": "fp16",
            "framework_overhead_gb": 2.0,
        }

        response = client.post("/api/v1/calculate/concurrency", json=calc_data)
        assert response.status_code == 404

    def test_calculate_concurrency_invalid_gpu_count(self, client, sample_hardware, sample_model):
        """测试无效 GPU 数量验证"""
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        calc_data = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "gpu_count": 33,  # 超过最大值 32
            "context_length": 4096,
            "precision": "fp16",
            "framework_overhead_gb": 2.0,
        }

        response = client.post("/api/v1/calculate/concurrency", json=calc_data)
        assert response.status_code == 422

    def test_calculate_concurrency_memory_breakdown(self, client, sample_hardware, sample_model):
        """测试显存占用明细"""
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        calc_data = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "gpu_count": 1,
            "context_length": 4096,
            "precision": "fp16",
            "framework_overhead_gb": 2.0,
        }

        response = client.post("/api/v1/calculate/concurrency", json=calc_data)
        assert response.status_code == 200
        data = response.json()

        breakdown = data["result"]["memory_breakdown"]

        # 验证显存明细结构
        assert "weight_memory_gb" in breakdown
        assert "framework_overhead_gb" in breakdown
        assert "kv_cache_memory_gb" in breakdown
        assert "activation_memory_gb" in breakdown
        assert "total_memory_gb" in breakdown

        # 验证框架开销
        assert breakdown["framework_overhead_gb"] == 2.0


class TestRootAndHealth:
    """根路径和健康检查测试"""

    def test_root(self, client):
        """测试根路径"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data

    def test_health_check(self, client):
        """测试健康检查"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"
