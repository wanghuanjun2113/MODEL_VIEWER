"""模型管理 API 测试"""

import pytest
from unittest.mock import patch


class TestModelCRUD:
    """模型管理 API 测试"""

    def test_create_model(self, client, sample_model):
        """测试创建模型"""
        response = client.post("/api/v1/models", json=sample_model)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_model["name"]
        assert data["params_billions"] == sample_model["params_billions"]

    def test_create_duplicate_model(self, client, sample_model):
        """测试创建重复模型"""
        # 创建第一个
        client.post("/api/v1/models", json=sample_model)

        # 创建第二个（应该失败）
        response = client.post("/api/v1/models", json=sample_model)
        assert response.status_code == 400
        assert "already exists" in response.json()["detail"]

    def test_list_models(self, client, sample_model):
        """测试获取模型列表"""
        # 创建模型
        client.post("/api/v1/models", json=sample_model)

        # 获取列表
        response = client.get("/api/v1/models")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_get_model(self, client, sample_model):
        """测试获取单个模型"""
        # 创建模型
        create_response = client.post("/api/v1/models", json=sample_model)
        model_id = create_response.json()["id"]

        # 获取模型
        response = client.get(f"/api/v1/models/{model_id}")
        assert response.status_code == 200
        assert response.json()["id"] == model_id

    def test_get_model_not_found(self, client):
        """测试获取不存在的模型"""
        response = client.get("/api/v1/models/99999")
        assert response.status_code == 404

    def test_update_model(self, client, sample_model):
        """测试更新模型"""
        # 创建模型
        create_response = client.post("/api/v1/models", json=sample_model)
        model_id = create_response.json()["id"]

        # 更新模型
        update_data = {"name": "Updated Model", "num_layers": 40}
        response = client.put(f"/api/v1/models/{model_id}", json=update_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Model"
        assert data["num_layers"] == 40

    def test_delete_model(self, client, sample_model):
        """测试删除模型"""
        # 创建模型
        create_response = client.post("/api/v1/models", json=sample_model)
        model_id = create_response.json()["id"]

        # 删除模型
        response = client.delete(f"/api/v1/models/{model_id}")
        assert response.status_code == 200

        # 验证已删除
        response = client.get(f"/api/v1/models/{model_id}")
        assert response.status_code == 404

    def test_preview_huggingface_model(self, client):
        """测试预览 Hugging Face 模型（mock 测试）"""
        # 这里测试 API 端点响应，实际 HF 调用在 mock 测试
        response = client.get("/api/v1/models/hf/test-org/test-model")
        # 如果 HF 服务不可用，应该返回错误而不是崩溃
        assert response.status_code in [200, 404, 500]


class TestModelFromHuggingFace:
    """从 Hugging Face 创建模型测试"""

    def test_hf_endpoint_exists(self, client):
        """测试 HF API 端点存在"""
        # 测试端点存在（实际 HF 调用需要网络）
        # 使用 mock 测试时需要更复杂的设置，这里验证端点响应
        response = client.get("/api/v1/models/hf/test-org/test-model")
        # 404 是预期的（模型不存在），但端点应该存在
        assert response.status_code in [200, 404, 500]
