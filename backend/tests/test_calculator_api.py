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
            "precision": "fp16",
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

    def test_calculate_mfu_hardware_not_found(self, client, sample_model):
        """测试硬件不存在"""
        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        calc_data = {
            "hardware_id": 99999,
            "model_id": model_id,
            "precision": "fp16",
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
            "precision": "fp16",
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
            "precision": "fp16",
            "first_token_latency_ms": -50.0,  # 负值
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
            "precision": "fp16",
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
                "precision": precision,
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
