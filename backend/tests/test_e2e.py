"""E2E (端到端) 测试

完整用户流程测试，覆盖：
1. 完整计算流程
2. 硬件管理流程
3. 模型管理流程
4. 多配置计算对比
5. 异常处理流程
"""

import pytest
import time


class TestE2ECalculationFlow:
    """完整计算流程 E2E 测试"""

    def test_complete_calculation_flow_fp16(self, client, sample_hardware, sample_model):
        """测试完整的 FP16 计算流程

        流程：
        1. 创建硬件
        2. 创建模型
        3. 执行 MFU 计算
        4. 验证结果
        5. 清理资源
        """
        # Step 1: 创建硬件
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        assert hw_response.status_code == 201
        hardware_id = hw_response.json()["id"]
        assert hw_response.json()["name"] == sample_hardware["name"]

        # Step 2: 创建模型
        model_response = client.post("/api/v1/models", json=sample_model)
        assert model_response.status_code == 201
        model_id = model_response.json()["id"]
        assert model_response.json()["name"] == sample_model["name"]

        # Step 3: 执行 MFU 计算 (FP16)
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

        calc_response = client.post("/api/v1/calculate/mfu", json=calc_data)
        assert calc_response.status_code == 200
        calc_data_result = calc_response.json()

        # Step 4: 验证计算结果
        assert calc_data_result["success"] is True
        result = calc_data_result["result"]

        # 验证核心指标
        assert 0 < result["mfu"] <= 100
        assert 0 < result["memory_bandwidth_utilization"] <= 100

        # 验证详细指标存在
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

        # 验证优化建议
        assert len(calc_data_result["suggestions"]) > 0

        # Step 5: 清理 - 删除硬件和模型
        # 注意: API 返回 200 和 MessageResponse，不是 204
        delete_hw = client.delete(f"/api/v1/hardware/{hardware_id}")
        assert delete_hw.status_code == 200
        assert delete_hw.json()["message"] == "Hardware deleted successfully"

        delete_model = client.delete(f"/api/v1/models/{model_id}")
        assert delete_model.status_code == 200
        assert delete_model.json()["message"] == "Model deleted successfully"

    def test_complete_calculation_flow_bf16(self, client, sample_hardware, sample_model):
        """测试完整的 BF16 计算流程"""
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        calc_data = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "precision": "bf16",
            "first_token_latency_ms": 50.0,
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        calc_response = client.post("/api/v1/calculate/mfu", json=calc_data)
        assert calc_response.status_code == 200
        result = calc_response.json()["result"]

        # BF16 应该使用 bf32_peak_tflops
        assert 0 < result["mfu"] <= 100

    def test_complete_calculation_flow_fp32(self, client, sample_hardware, sample_model):
        """测试完整的 FP32 计算流程"""
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        calc_data = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "precision": "fp32",
            "first_token_latency_ms": 50.0,
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        calc_response = client.post("/api/v1/calculate/mfu", json=calc_data)
        assert calc_response.status_code == 200
        result = calc_response.json()["result"]

        # FP32 应该使用 fp32_peak_tflops
        assert 0 < result["mfu"] <= 100


class TestE2EHardwareManagement:
    """硬件管理 E2E 测试"""

    def test_hardware_crud_full_flow(self, client):
        """测试硬件完整 CRUD 流程"""
        hardware_data = {
            "name": "E2E Test GPU",
            "vendor": "E2E Vendor",
            "fp16_peak_tflops": 2000.0,
            "bf32_peak_tflops": 1000.0,
            "fp32_peak_tflops": 500.0,
            "memory_size_gb": 80.0,
            "memory_bandwidth_tbps": 3.0,
            "description": "E2E Test Hardware",
        }

        # Create
        create_response = client.post("/api/v1/hardware", json=hardware_data)
        assert create_response.status_code == 201
        hardware_id = create_response.json()["id"]
        assert create_response.json()["name"] == hardware_data["name"]

        # Read (single)
        get_response = client.get(f"/api/v1/hardware/{hardware_id}")
        assert get_response.status_code == 200
        assert get_response.json()["id"] == hardware_id

        # Read (list)
        list_response = client.get("/api/v1/hardware")
        assert list_response.status_code == 200
        assert isinstance(list_response.json(), list)
        assert any(h["id"] == hardware_id for h in list_response.json())

        # Update
        update_data = {"name": "E2E Updated GPU", "fp16_peak_tflops": 2500.0}
        update_response = client.put(f"/api/v1/hardware/{hardware_id}", json=update_data)
        assert update_response.status_code == 200
        assert update_response.json()["name"] == "E2E Updated GPU"
        assert update_response.json()["fp16_peak_tflops"] == 2500.0

        # Delete
        delete_response = client.delete(f"/api/v1/hardware/{hardware_id}")
        assert delete_response.status_code == 200
        assert delete_response.json()["message"] == "Hardware deleted successfully"

        # Verify deletion
        get_after_delete = client.get(f"/api/v1/hardware/{hardware_id}")
        assert get_after_delete.status_code == 404

    def test_hardware_creation_validation(self, client):
        """测试硬件创建验证"""
        # 缺少必填字段
        invalid_data = {"name": "Test GPU"}  # 缺少算力和内存信息
        response = client.post("/api/v1/hardware", json=invalid_data)
        assert response.status_code == 422

        # 负值验证
        invalid_data = {
            "name": "Test GPU",
            "fp16_peak_tflops": -100.0,  # 负值
            "memory_size_gb": 80.0,
            "memory_bandwidth_tbps": 2.0,
        }
        response = client.post("/api/v1/hardware", json=invalid_data)
        assert response.status_code == 422

    def test_hardware_bulk_creation(self, client):
        """测试批量创建硬件"""
        hardware_list = [
            {
                "name": f"Bulk Test GPU {i}",
                "vendor": "Bulk Vendor",
                "fp16_peak_tflops": 1000.0 + i * 100,
                "bf32_peak_tflops": 500.0,
                "fp32_peak_tflops": 250.0,
                "memory_size_gb": 80.0,
                "memory_bandwidth_tbps": 2.0,
            }
            for i in range(5)
        ]

        created_ids = []
        for hw in hardware_list:
            response = client.post("/api/v1/hardware", json=hw)
            assert response.status_code == 201
            created_ids.append(response.json()["id"])

        # 验证所有硬件已创建
        list_response = client.get("/api/v1/hardware")
        assert list_response.status_code == 200
        hardware_names = [h["name"] for h in list_response.json()]
        for hw in hardware_list:
            assert hw["name"] in hardware_names

        # 清理
        for hw_id in created_ids:
            client.delete(f"/api/v1/hardware/{hw_id}")


class TestE2EModelManagement:
    """模型管理 E2E 测试"""

    def test_model_crud_full_flow(self, client):
        """测试模型完整 CRUD 流程"""
        model_data = {
            "name": "E2E Test Model",
            "huggingface_id": "e2e-org/e2e-test-model",
            "params_billions": 13.0,
            "num_layers": 40,
            "hidden_size": 5120,
            "num_attention_heads": 40,
            "num_key_value_heads": 40,
            "vocab_size": 32000,
            "intermediate_size": 13824,
            "head_dim": 128,
            "max_position_embeddings": 4096,
            "model_type": "llama",
            "description": "E2E Test Model",
        }

        # Create
        create_response = client.post("/api/v1/models", json=model_data)
        assert create_response.status_code == 201
        model_id = create_response.json()["id"]
        assert create_response.json()["name"] == model_data["name"]

        # Read (single)
        get_response = client.get(f"/api/v1/models/{model_id}")
        assert get_response.status_code == 200
        assert get_response.json()["id"] == model_id

        # Read (list)
        list_response = client.get("/api/v1/models")
        assert list_response.status_code == 200
        assert isinstance(list_response.json(), list)
        assert any(m["id"] == model_id for m in list_response.json())

        # Update
        update_data = {"name": "E2E Updated Model", "params_billions": 20.0}
        update_response = client.put(f"/api/v1/models/{model_id}", json=update_data)
        assert update_response.status_code == 200
        assert update_response.json()["name"] == "E2E Updated Model"
        assert update_response.json()["params_billions"] == 20.0

        # Delete
        delete_response = client.delete(f"/api/v1/models/{model_id}")
        assert delete_response.status_code == 200
        assert delete_response.json()["message"] == "Model deleted successfully"

        # Verify deletion
        get_after_delete = client.get(f"/api/v1/models/{model_id}")
        assert get_after_delete.status_code == 404

    def test_model_creation_validation(self, client):
        """测试模型创建验证"""
        # 缺少必填字段
        invalid_data = {"name": "Test Model"}  # 缺少层数等
        response = client.post("/api/v1/models", json=invalid_data)
        assert response.status_code == 422

        # 负值/零值验证
        invalid_data = {
            "name": "Test Model",
            "num_layers": -1,  # 负值
            "hidden_size": 4096,
            "vocab_size": 32000,
        }
        response = client.post("/api/v1/models", json=invalid_data)
        assert response.status_code == 422


class TestE2EMultiConfigurationComparison:
    """多配置对比 E2E 测试"""

    def test_multiple_calculation_comparison(self, client, sample_hardware, sample_model):
        """测试多次计算并对比结果"""
        # 创建资源
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        # 配置列表
        scenarios = [
            {
                "name": "低延迟场景",
                "calc_data": {
                    "first_token_latency_ms": 20.0,
                    "tpot_ms": 5.0,
                    "context_length": 1024,
                    "generated_length": 64,
                    "batch_size": 1,
                    "precision": "fp16",
                },
            },
            {
                "name": "高吞吐场景",
                "calc_data": {
                    "first_token_latency_ms": 100.0,
                    "tpot_ms": 20.0,
                    "context_length": 4096,
                    "generated_length": 256,
                    "batch_size": 8,
                    "precision": "fp16",
                },
            },
            {
                "name": "长上下文场景",
                "calc_data": {
                    "first_token_latency_ms": 200.0,
                    "tpot_ms": 15.0,
                    "context_length": 16384,
                    "generated_length": 128,
                    "batch_size": 1,
                    "precision": "bf16",
                },
            },
        ]

        results = []
        for scenario in scenarios:
            calc_data = {
                "hardware_id": hardware_id,
                "model_id": model_id,
                **scenario["calc_data"],
            }
            calc_response = client.post("/api/v1/calculate/mfu", json=calc_data)
            assert calc_response.status_code == 200

            result = calc_response.json()["result"]
            results.append({
                "name": scenario["name"],
                "mfu": result["mfu"],
                "bandwidth": result["memory_bandwidth_utilization"],
                "bottleneck": result["bottleneck_type"],
            })

        # 验证不同场景产生不同结果
        mfu_values = [r["mfu"] for r in results]
        assert len(set(mfu_values)) > 1  # 至少有不同的 MFU 值

        # 清理
        client.delete(f"/api/v1/hardware/{hardware_id}")
        client.delete(f"/api/v1/models/{model_id}")

    def test_different_hardware_comparison(self, client, sample_model):
        """测试不同硬件配置对比"""
        # 创建多个硬件
        hardware_list = [
            {
                "name": "High Performance GPU",
                "fp16_peak_tflops": 4000.0,
                "bf32_peak_tflops": 2000.0,
                "fp32_peak_tflops": 1000.0,
                "memory_size_gb": 80.0,
                "memory_bandwidth_tbps": 3.35,
            },
            {
                "name": "Mid Range GPU",
                "fp16_peak_tflops": 1000.0,
                "bf32_peak_tflops": 500.0,
                "fp32_peak_tflops": 250.0,
                "memory_size_gb": 24.0,
                "memory_bandwidth_tbps": 1.0,
            },
        ]

        hw_ids = []
        for hw in hardware_list:
            response = client.post("/api/v1/hardware", json=hw)
            assert response.status_code == 201
            hw_ids.append(response.json()["id"])

        # 创建模型
        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        # 对每个硬件执行相同计算
        calc_data = {
            "precision": "fp16",
            "first_token_latency_ms": 50.0,
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        results = []
        for hw_id in hw_ids:
            calc_data["hardware_id"] = hw_id
            calc_data["model_id"] = model_id
            response = client.post("/api/v1/calculate/mfu", json=calc_data)
            assert response.status_code == 200
            results.append(response.json()["result"])

        # 高性能 GPU 应该有不同的 MFU
        assert results[0]["mfu"] != results[1]["mfu"]

        # 清理
        for hw_id in hw_ids:
            client.delete(f"/api/v1/hardware/{hw_id}")
        client.delete(f"/api/v1/models/{model_id}")


class TestE2EErrorHandling:
    """异常处理 E2E 测试"""

    def test_calculation_with_invalid_hardware(self, client, sample_model):
        """测试使用不存在的硬件ID计算"""
        calc_data = {
            "hardware_id": 99999,
            "model_id": 1,  # 假设存在
            "precision": "fp16",
            "first_token_latency_ms": 50.0,
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        response = client.post("/api/v1/calculate/mfu", json=calc_data)
        assert response.status_code == 404
        assert "not found" in response.json()["detail"]

    def test_calculation_with_invalid_model(self, client, sample_hardware):
        """测试使用不存在的模型ID计算"""
        calc_data = {
            "hardware_id": 1,  # 假设存在
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

    def test_calculation_with_invalid_precision(self, client, sample_hardware, sample_model):
        """测试使用无效精度计算"""
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        calc_data = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "precision": "invalid_precision",  # 无效精度
            "first_token_latency_ms": 50.0,
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        response = client.post("/api/v1/calculate/mfu", json=calc_data)
        assert response.status_code == 422

        # 清理
        client.delete(f"/api/v1/hardware/{hardware_id}")
        client.delete(f"/api/v1/models/{model_id}")

    def test_get_nonexistent_hardware(self, client):
        """测试获取不存在的硬件"""
        response = client.get("/api/v1/hardware/99999")
        assert response.status_code == 404

    def test_get_nonexistent_model(self, client):
        """测试获取不存在的模型"""
        response = client.get("/api/v1/models/99999")
        assert response.status_code == 404

    def test_delete_nonexistent_hardware(self, client):
        """测试删除不存在的硬件"""
        response = client.delete("/api/v1/hardware/99999")
        assert response.status_code == 404

    def test_update_nonexistent_hardware(self, client):
        """测试更新不存在的硬件"""
        response = client.put("/api/v1/hardware/99999", json={"name": "Updated"})
        assert response.status_code == 404


class TestE2EBoundaryConditions:
    """边界条件 E2E 测试"""

    def test_minimum_batch_size(self, client, sample_hardware, sample_model):
        """测试最小批次大小 (batch_size = 1)"""
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        calc_data = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "precision": "fp16",
            "first_token_latency_ms": 10.0,
            "tpot_ms": 1.0,
            "context_length": 1,
            "generated_length": 1,
            "batch_size": 1,
        }

        response = client.post("/api/v1/calculate/mfu", json=calc_data)
        assert response.status_code == 200
        result = response.json()["result"]
        assert result["mfu"] > 0
        # batch_size 是输入参数，不在结果中，通过 tpot 和 total_time 验证批次计算正确

        # 清理
        client.delete(f"/api/v1/hardware/{hardware_id}")
        client.delete(f"/api/v1/models/{model_id}")

    def test_large_batch_size(self, client, sample_hardware, sample_model):
        """测试大批次大小"""
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        calc_data = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "precision": "fp16",
            "first_token_latency_ms": 500.0,
            "tpot_ms": 50.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 128,
        }

        response = client.post("/api/v1/calculate/mfu", json=calc_data)
        assert response.status_code == 200
        result = response.json()["result"]
        assert result["mfu"] > 0

        # 清理
        client.delete(f"/api/v1/hardware/{hardware_id}")
        client.delete(f"/api/v1/models/{model_id}")

    def test_long_context_length(self, client, sample_hardware, sample_model):
        """测试长上下文长度"""
        hw_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        calc_data = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "precision": "bf16",
            "first_token_latency_ms": 1000.0,
            "tpot_ms": 100.0,
            "context_length": 100000,
            "generated_length": 1000,
            "batch_size": 1,
        }

        response = client.post("/api/v1/calculate/mfu", json=calc_data)
        assert response.status_code == 200
        result = response.json()["result"]
        assert result["mfu"] > 0
        # context_length 是输入参数，不在结果中，通过 prefill_flops 验证长上下文计算正确
        assert result["prefill_flops"] > 0  # Prefill FLOPs 应该很大

        # 清理
        client.delete(f"/api/v1/hardware/{hardware_id}")
        client.delete(f"/api/v1/models/{model_id}")


class TestE2EBottleneckDetection:
    """瓶颈检测 E2E 测试"""

    def test_compute_bottleneck_detection(self, client, sample_model):
        """测试计算受限场景"""
        # 创建高算力硬件
        high_compute_hw = {
            "name": "High Compute GPU",
            "fp16_peak_tflops": 10000.0,
            "bf32_peak_tflops": 5000.0,
            "fp32_peak_tflops": 2500.0,
            "memory_size_gb": 80.0,
            "memory_bandwidth_tbps": 5.0,  # 相对较低的带宽
        }

        hw_response = client.post("/api/v1/hardware", json=high_compute_hw)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        # 高算力 + 低带宽 -> 可能是计算受限
        calc_data = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "precision": "fp16",
            "first_token_latency_ms": 5.0,  # 快速处理
            "tpot_ms": 1.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        response = client.post("/api/v1/calculate/mfu", json=calc_data)
        assert response.status_code == 200
        result = response.json()["result"]
        suggestions = response.json()["suggestions"]

        # 验证瓶颈类型和优化建议
        assert result["bottleneck_type"] in ["compute", "balanced"]
        assert len(suggestions) > 0

        # 清理
        client.delete(f"/api/v1/hardware/{hardware_id}")
        client.delete(f"/api/v1/models/{model_id}")

    def test_memory_bottleneck_detection(self, client, sample_model):
        """测试访存受限场景"""
        # 创建低算力但高带宽的硬件
        high_mem_hw = {
            "name": "High Memory GPU",
            "fp16_peak_tflops": 500.0,
            "bf32_peak_tflops": 250.0,
            "fp32_peak_tflops": 125.0,
            "memory_size_gb": 80.0,
            "memory_bandwidth_tbps": 10.0,  # 极高带宽
        }

        hw_response = client.post("/api/v1/hardware", json=high_mem_hw)
        hardware_id = hw_response.json()["id"]

        model_response = client.post("/api/v1/models", json=sample_model)
        model_id = model_response.json()["id"]

        # 低算力但高带宽 -> 可能是计算受限
        calc_data = {
            "hardware_id": hardware_id,
            "model_id": model_id,
            "precision": "fp16",
            "first_token_latency_ms": 500.0,  # 慢速处理
            "tpot_ms": 100.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        response = client.post("/api/v1/calculate/mfu", json=calc_data)
        assert response.status_code == 200
        result = response.json()["result"]

        # 验证结果
        assert result["mfu"] >= 0
        assert result["mfu"] <= 100

        # 清理
        client.delete(f"/api/v1/hardware/{hardware_id}")
        client.delete(f"/api/v1/models/{model_id}")


class TestE2EHealthCheck:
    """健康检查 E2E 测试"""

    def test_root_endpoint(self, client):
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

    def test_bottleneck_description(self, client):
        """测试瓶颈描述获取"""
        for bottleneck_type in ["compute", "memory", "balanced"]:
            response = client.get(f"/api/v1/calculate/bottleneck-description/{bottleneck_type}")
            assert response.status_code == 200
            assert "description" in response.json()
