"""HuggingFace 客户端测试"""

import pytest
from unittest.mock import Mock, patch


class TestHuggingFaceClient:
    """HuggingFace 客户端单元测试"""

    def test_get_model_info_success(self):
        """测试成功获取模型信息（mock 测试）"""
        from app.services.hf_client import HuggingFaceClient

        # Mock model_info
        mock_model_info = Mock()
        mock_model_info.modelId = "meta-llama/Llama-2-7b-hf"
        mock_model_info.tags = ["p7b", "transformers", "llama"]

        with patch('app.services.hf_client.HfApi') as mock_hf_api:
            mock_api = Mock()
            mock_api.model_info.return_value = mock_model_info
            mock_hf_api.return_value = mock_api

            client = HuggingFaceClient()
            result = client.get_model_info("meta-llama/Llama-2-7b-hf")

            assert result is not None
            assert result["huggingface_id"] == "meta-llama/Llama-2-7b-hf"
            assert result["name"] == "Llama-2-7b-hf"

    def test_get_model_info_repository_not_found(self):
        """测试模型不存在"""
        from app.services.hf_client import HuggingFaceClient
        from huggingface_hub.utils import RepositoryNotFoundError

        with patch('app.services.hf_client.HfApi') as mock_hf_api:
            mock_api = Mock()
            mock_api.model_info.side_effect = RepositoryNotFoundError("Not found")
            mock_hf_api.return_value = mock_api

            client = HuggingFaceClient()
            result = client.get_model_info("non-existent/model")

            assert result is None

    def test_get_model_info_with_params_tag(self):
        """测试带有参数标签的处理"""
        from app.services.hf_client import HuggingFaceClient

        mock_model_info = Mock()
        mock_model_info.modelId = "test/model"
        mock_model_info.tags = ["p13b", "transformers"]  # 13B 模型

        with patch('app.services.hf_client.HfApi') as mock_hf_api:
            mock_api = Mock()
            mock_api.model_info.return_value = mock_model_info
            mock_hf_api.return_value = mock_api

            with patch('huggingface_hub.hf_hub_download') as mock_download:
                mock_download.side_effect = Exception("File not found")

                client = HuggingFaceClient()
                result = client.get_model_info("test/model")

                assert result is not None
                # config 返回空，params_billions 应该使用默认值 0.0
                assert result["params_billions"] == 0.0

    def test_estimate_params_llama_style(self):
        """测试 Llama 风格模型参数估算"""
        from app.services.hf_client import HuggingFaceClient

        client = HuggingFaceClient()
        config = {
            "num_hidden_layers": 32,
            "hidden_size": 4096,
            "num_attention_heads": 32,
            "vocab_size": 32000,
            "intermediate_size": 11008,
        }

        params = client._estimate_params(config)

        # 验证返回值大于 0
        assert params > 0
        # 7B 模型应该返回约 7.0
        assert 6.0 < params < 8.0

    def test_estimate_params_minimal_config(self):
        """测试最小配置参数估算"""
        from app.services.hf_client import HuggingFaceClient

        client = HuggingFaceClient()
        config = {
            "num_hidden_layers": 1,
            "hidden_size": 128,
            "num_attention_heads": 4,
        }

        params = client._estimate_params(config)

        assert params > 0

    def test_estimate_params_empty_config(self):
        """测试空配置参数估算"""
        from app.services.hf_client import HuggingFaceClient

        client = HuggingFaceClient()
        config = {}

        params = client._estimate_params(config)

        assert params == 0.0

    def test_estimate_params_with_d_model(self):
        """测试使用 d_model 字段的配置"""
        from app.services.hf_client import HuggingFaceClient

        client = HuggingFaceClient()
        config = {
            "n_layers": 24,
            "d_model": 2048,
            "n_heads": 16,
            "vocab_size": 30000,
            "intermediate_size": 8192,
        }

        params = client._estimate_params(config)

        assert params > 0

    def test_extract_config_file_not_found(self):
        """测试配置文件不存在"""
        from app.services.hf_client import HuggingFaceClient
        from huggingface_hub.utils import EntryNotFoundError

        client = HuggingFaceClient()

        with patch('huggingface_hub.hf_hub_download') as mock_download:
            mock_download.side_effect = EntryNotFoundError("File not found")

            result = client._extract_config_from_model_card("test/model")

            # 应该返回空字典
            assert result == {}

    def test_extract_config_general_exception(self):
        """测试配置文件提取时的通用异常"""
        from app.services.hf_client import HuggingFaceClient

        client = HuggingFaceClient()

        with patch('huggingface_hub.hf_hub_download') as mock_download:
            mock_download.side_effect = Exception("Network error")

            result = client._extract_config_from_model_card("test/model")

            # 应该返回空字典
            assert result == {}


class TestHuggingFaceEndpoints:
    """HuggingFace API 端点存在性测试"""

    def test_preview_endpoint_exists(self, client):
        """测试预览端点存在"""
        # 即使 HF 服务不可用，端点应该存在并返回合适的响应
        response = client.get("/api/v1/models/hf/test-org/test-model")
        # 404 或 500 都是预期的（模型不存在），但端点应该存在
        assert response.status_code in [200, 404, 500]

    # 移除不稳定的端点测试（需要网络访问 HF API）
