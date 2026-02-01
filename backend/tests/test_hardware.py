"""硬件管理 API 测试"""

import pytest


class TestHardwareCRUD:
    """硬件管理 API 测试"""

    def test_create_hardware(self, client, sample_hardware):
        """测试创建硬件"""
        response = client.post("/api/v1/hardware", json=sample_hardware)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_hardware["name"]
        assert data["fp16_peak_tflops"] == sample_hardware["fp16_peak_tflops"]

    def test_create_duplicate_hardware(self, client, sample_hardware):
        """测试创建重复硬件"""
        # 创建第一个
        client.post("/api/v1/hardware", json=sample_hardware)

        # 创建第二个（应该失败）
        response = client.post("/api/v1/hardware", json=sample_hardware)
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    def test_list_hardware(self, client, sample_hardware):
        """测试获取硬件列表"""
        # 创建硬件
        client.post("/api/v1/hardware", json=sample_hardware)

        # 获取列表
        response = client.get("/api/v1/hardware")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_hardware(self, client, sample_hardware):
        """测试获取单个硬件"""
        # 创建硬件
        create_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = create_response.json()["id"]

        # 获取硬件
        response = client.get(f"/api/v1/hardware/{hardware_id}")
        assert response.status_code == 200
        assert response.json()["id"] == hardware_id

    def test_get_hardware_not_found(self, client):
        """测试获取不存在的硬件"""
        response = client.get("/api/v1/hardware/99999")
        assert response.status_code == 404

    def test_update_hardware(self, client, sample_hardware):
        """测试更新硬件"""
        # 创建硬件
        create_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = create_response.json()["id"]

        # 更新硬件
        update_data = {"name": "Updated GPU", "fp16_peak_tflops": 2000.0}
        response = client.put(f"/api/v1/hardware/{hardware_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated GPU"
        assert data["fp16_peak_tflops"] == 2000.0

    def test_delete_hardware(self, client, sample_hardware):
        """测试删除硬件"""
        # 创建硬件
        create_response = client.post("/api/v1/hardware", json=sample_hardware)
        hardware_id = create_response.json()["id"]

        # 删除硬件
        response = client.delete(f"/api/v1/hardware/{hardware_id}")
        assert response.status_code == 200

        # 验证已删除
        response = client.get(f"/api/v1/hardware/{hardware_id}")
        assert response.status_code == 404

    def test_delete_hardware_not_found(self, client):
        """测试删除不存在的硬件"""
        response = client.delete("/api/v1/hardware/99999")
        assert response.status_code == 404

    def test_hardware_validation(self, client):
        """测试硬件数据验证"""
        # 缺少必填字段
        invalid_data = {
            "name": "Test GPU",
            # 缺少 fp16_peak_tflops 等必填字段
        }
        response = client.post("/api/v1/hardware", json=invalid_data)
        assert response.status_code == 422  # Validation error

    def test_hardware_negative_value(self, client):
        """测试负值验证"""
        invalid_data = {
            "name": "Test GPU",
            "fp16_peak_tflops": -100.0,  # 负值
            "bf32_peak_tflops": 500.0,
            "fp32_peak_tflops": 250.0,
            "memory_size_gb": 80.0,
            "memory_bandwidth_tbps": 2.0,
        }
        response = client.post("/api/v1/hardware", json=invalid_data)
        assert response.status_code == 422
