"""分页功能测试"""

import pytest


class TestHardwarePagination:
    """硬件分页测试"""

    def test_list_hardware_paginated_first_page(self, client, sample_hardware):
        """测试分页获取第一页"""
        # 创建多个硬件
        for i in range(3):
            sample_hardware["name"] = f"Test GPU {i}"
            client.post("/api/v1/hardware", json=sample_hardware)

        # 获取第一页
        response = client.get("/api/v1/hardware/paginated?page=1&page_size=2")
        assert response.status_code == 200
        data = response.json()

        assert data["page"] == 1
        assert data["page_size"] == 2
        assert data["total"] == 3
        assert data["total_pages"] == 2
        assert len(data["items"]) == 2
        assert data["has_next"] is True
        assert data["has_previous"] is False

    def test_list_hardware_paginated_second_page(self, client, sample_hardware):
        """测试分页获取第二页"""
        # 创建多个硬件
        for i in range(3):
            sample_hardware["name"] = f"Test GPU {i}"
            client.post("/api/v1/hardware", json=sample_hardware)

        # 获取第二页
        response = client.get("/api/v1/hardware/paginated?page=2&page_size=2")
        assert response.status_code == 200
        data = response.json()

        assert data["page"] == 2
        assert len(data["items"]) == 1
        assert data["has_next"] is False
        assert data["has_previous"] is True

    def test_list_hardware_paginated_empty(self, client):
        """测试空列表分页"""
        response = client.get("/api/v1/hardware/paginated?page=1&page_size=10")
        assert response.status_code == 200
        data = response.json()

        assert data["page"] == 1
        assert data["total"] == 0
        assert data["total_pages"] == 0
        assert len(data["items"]) == 0
        assert data["has_next"] is False
        assert data["has_previous"] is False

    def test_list_hardware_paginated_custom_page_size(self, client, sample_hardware):
        """测试自定义每页数量"""
        # 创建硬件
        for i in range(5):
            sample_hardware["name"] = f"Test GPU {i}"
            client.post("/api/v1/hardware", json=sample_hardware)

        response = client.get("/api/v1/hardware/paginated?page=1&page_size=100")
        assert response.status_code == 200
        data = response.json()

        assert data["page_size"] == 100
        assert data["total_pages"] == 1
        assert data["has_next"] is False

    def test_list_hardware_paginated_negative_values(self, client):
        """测试负值分页参数（会使用默认值）"""
        # page < 1 会被 FastAPI/Pydantic 调整为 1
        response = client.get("/api/v1/hardware/paginated?page=-1&page_size=10")
        # 应该返回 200，使用默认值
        assert response.status_code == 200


class TestModelPagination:
    """模型分页测试"""

    def test_list_models_paginated_first_page(self, client, sample_model):
        """测试分页获取模型第一页"""
        # 创建多个模型
        for i in range(3):
            sample_model["name"] = f"Test Model {i}"
            sample_model["huggingface_id"] = f"test-org/test-model-{i}"
            client.post("/api/v1/models", json=sample_model)

        # 获取第一页
        response = client.get("/api/v1/models/paginated?page=1&page_size=2")
        assert response.status_code == 200
        data = response.json()

        assert data["page"] == 1
        assert data["page_size"] == 2
        assert data["total"] == 3
        assert data["total_pages"] == 2
        assert len(data["items"]) == 2
        assert data["has_next"] is True
        assert data["has_previous"] is False

    def test_list_models_paginated_second_page(self, client, sample_model):
        """测试分页获取模型第二页"""
        # 创建多个模型
        for i in range(3):
            sample_model["name"] = f"Test Model {i}"
            sample_model["huggingface_id"] = f"test-org/test-model-{i}"
            client.post("/api/v1/models", json=sample_model)

        # 获取第二页
        response = client.get("/api/v1/models/paginated?page=2&page_size=2")
        assert response.status_code == 200
        data = response.json()

        assert data["page"] == 2
        assert len(data["items"]) == 1
        assert data["has_next"] is False
        assert data["has_previous"] is True

    def test_list_models_paginated_empty(self, client):
        """测试空模型列表分页"""
        response = client.get("/api/v1/models/paginated?page=1&page_size=10")
        assert response.status_code == 200
        data = response.json()

        assert data["page"] == 1
        assert data["total"] == 0
        assert len(data["items"]) == 0
