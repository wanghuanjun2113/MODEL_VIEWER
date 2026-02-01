"""Hugging Face 客户端服务"""

import asyncio
from typing import Optional, Dict, Any
from huggingface_hub import HfApi, snapshot_download
from huggingface_hub.utils import RepositoryNotFoundError, EntryNotFoundError
import logging

logger = logging.getLogger(__name__)


class HuggingFaceClient:
    """Hugging Face API 客户端"""

    def __init__(self):
        self.api = HfApi()

    def get_model_info(self, hf_id: str) -> Optional[Dict[str, Any]]:
        """获取模型信息

        Args:
            hf_id: Hugging Face 模型 ID (例如: "meta-llama/Llama-2-7b-hf")

        Returns:
            模型参数字典，如果获取失败返回 None
        """
        try:
            # 获取模型信息
            model_info = self.api.model_info(hf_id)

            # 提取参数量
            params_str = ""
            params_billions = 0.0
            for tag in model_info.tags:
                if tag.startswith("p"):
                    try:
                        # 处理如 "7b", "13b", "70b" 等格式
                        tag_value = tag[1:].lower().replace("b", "")
                        params_billions = float(tag_value)
                        params_str = f"{params_billions}B"
                        break
                    except (ValueError, IndexError) as e:
                        logger.debug(f"Failed to parse tag '{tag}': {e}")
                        continue

            # 尝试获取 model card 中的配置
            config = self._extract_config_from_model_card(hf_id)

            return {
                "huggingface_id": hf_id,
                "name": model_info.modelId.split("/")[-1],
                "params_billions": config.get("params_billions", 0.0),
                "num_layers": config.get("num_layers", 0),
                "hidden_size": config.get("hidden_size", 0),
                "num_attention_heads": config.get("num_attention_heads", 0),
                "num_key_value_heads": config.get("num_key_value_heads", 0),
                "vocab_size": config.get("vocab_size", 0),
                "intermediate_size": config.get("intermediate_size", 0),
                "head_dim": config.get("head_dim", 0),
                "max_position_embeddings": config.get("max_position_embeddings", 0),
                "model_type": config.get("model_type", "llama"),
            }

        except RepositoryNotFoundError:
            logger.error(f"Model not found: {hf_id}")
            return None
        except Exception as e:
            logger.error(f"Error fetching model info: {e}")
            return None

    def _extract_config_from_model_card(self, hf_id: str) -> Dict[str, Any]:
        """从 model card 提取配置信息

        这是一个简化版本，实际应该下载并解析 config.json
        """
        try:
            # 尝试下载 config.json
            from huggingface_hub import hf_hub_download

            try:
                config_path = hf_hub_download(
                    repo_id=hf_id,
                    filename="config.json",
                    repo_type="model"
                )

                import json
                with open(config_path, 'r', encoding='utf-8') as f:
                    config = json.load(f)

                # 提取关键参数
                result = {}

                # 模型类型
                result["model_type"] = config.get("model_type", "llama")

                # 层数
                if "num_hidden_layers" in config:
                    result["num_layers"] = config["num_hidden_layers"]
                elif "n_layers" in config:
                    result["num_layers"] = config["n_layers"]

                # 隐藏层维度
                if "hidden_size" in config:
                    result["hidden_size"] = config["hidden_size"]
                elif "d_model" in config:
                    result["hidden_size"] = config["d_model"]

                # 注意力头数
                if "num_attention_heads" in config:
                    result["num_attention_heads"] = config["num_attention_heads"]
                elif "n_heads" in config:
                    result["num_attention_heads"] = config["n_heads"]

                # KV 注意力头数
                if "num_key_value_heads" in config:
                    result["num_key_value_heads"] = config["num_key_value_heads"]
                elif "n_kv_heads" in config:
                    result["num_key_value_heads"] = config["n_kv_heads"]
                else:
                    result["num_key_value_heads"] = result.get("num_attention_heads", 0)

                # 词汇表大小
                if "vocab_size" in config:
                    result["vocab_size"] = config["vocab_size"]

                # 中间层维度
                if "intermediate_size" in config:
                    result["intermediate_size"] = config["intermediate_size"]

                # 注意力头维度
                if "head_dim" in config:
                    result["head_dim"] = config["head_dim"]
                elif result.get("hidden_size") and result.get("num_attention_heads"):
                    result["head_dim"] = result["hidden_size"] // result["num_attention_heads"]

                # 最大位置编码
                if "max_position_embeddings" in config:
                    result["max_position_embeddings"] = config["max_position_embeddings"]

                # 参数量 (从 config 中推断)
                if "model_type" in config:
                    result["params_billions"] = self._estimate_params(config)

                return result

            except (EntryNotFoundError, FileNotFoundError):
                logger.warning(f"config.json not found for {hf_id}")
                return {}

        except Exception as e:
            logger.warning(f"Error parsing config: {e}")
            return {}

    def _estimate_params(self, config: Dict[str, Any]) -> float:
        """根据配置估算参数量 (Billion)

        基于标准 Transformer 架构估算
        """
        try:
            L = config.get("num_hidden_layers", config.get("n_layers", 0))
            d = config.get("hidden_size", config.get("d_model", 0))
            n_heads = config.get("num_attention_heads", config.get("n_heads", 0))
            vocab_size = config.get("vocab_size", 32000)

            # Llama 风格模型参数量估算
            # embedding: vocab_size * d
            # attention: 4 * L * d^2 (Q, K, V, O)
            # ffn: 3 * L * d * intermediate_size
            # output: vocab_size * d

            intermediate_size = config.get("intermediate_size", 4 * d)

            # 使用更精确的公式
            # embedding + output
            embedding_params = vocab_size * d * 2  # token embedding + lm_head

            # attention params: 4 * L * d^2
            attention_params = 4 * L * d * d

            # ffn params: 3 * L * d * intermediate_size
            ffn_params = 3 * L * d * intermediate_size

            total_params = embedding_params + attention_params + ffn_params

            return round(total_params / 1e9, 2)

        except Exception:
            return 0.0


# 全局客户端实例
hf_client = HuggingFaceClient()


def get_model_from_huggingface(hf_id: str) -> Optional[Dict[str, Any]]:
    """获取 Hugging Face 模型信息

    Args:
        hf_id: Hugging Face 模型 ID

    Returns:
        模型信息字典
    """
    return hf_client.get_model_info(hf_id)
