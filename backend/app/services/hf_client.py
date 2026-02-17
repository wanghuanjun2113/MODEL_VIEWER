"""Hugging Face 客户端服务"""

import asyncio
import re
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

            # 尝试获取 model card 中的配置
            config = self._extract_config_from_model_card(hf_id, model_info.modelId)

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
                "is_moe": config.get("is_moe", False),
                "num_experts": config.get("num_experts", 0),
                "num_experts_per_tok": config.get("num_experts_per_tok", 0),
                # Hybrid attention fields
                "is_hybrid_attention": config.get("is_hybrid_attention", False),
                "full_attention_interval": config.get("full_attention_interval", 0),
                "num_full_attention_layers": config.get("num_full_attention_layers", 0),
                "num_linear_attention_layers": config.get("num_linear_attention_layers", 0),
                "linear_num_key_heads": config.get("linear_num_key_heads", 0),
                "linear_num_value_heads": config.get("linear_num_value_heads", 0),
                "linear_key_head_dim": config.get("linear_key_head_dim", 0),
                "linear_value_head_dim": config.get("linear_value_head_dim", 0),
                "linear_conv_kernel_dim": config.get("linear_conv_kernel_dim", 0),
                "layer_types": config.get("layer_types", []),
            }

        except RepositoryNotFoundError:
            logger.error(f"Model not found: {hf_id}")
            return None
        except Exception as e:
            logger.error(f"Error fetching model info: {e}")
            return None

    def _extract_config_from_model_card(self, hf_id: str, model_full_id: str = "") -> Dict[str, Any]:
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

                # 对于多模态模型 (如 Qwen3.5), 文本配置嵌套在 "text_config" 中
                # 对于标准模型, 配置在根级别
                text_config = config.get("text_config", {})

                # 层数 - 支持多种字段名, 优先检查 text_config
                result["num_layers"] = (
                    text_config.get("num_hidden_layers") or
                    config.get("num_hidden_layers") or
                    text_config.get("num_layers") or
                    config.get("num_layers") or
                    config.get("n_layers") or
                    config.get("decoder_layers") or
                    0
                )

                # 隐藏层维度
                result["hidden_size"] = (
                    text_config.get("hidden_size") or
                    config.get("hidden_size") or
                    config.get("d_model") or
                    0
                )

                # 注意力头数
                result["num_attention_heads"] = (
                    text_config.get("num_attention_heads") or
                    config.get("num_attention_heads") or
                    config.get("n_heads") or
                    config.get("attention_heads") or
                    0
                )

                # KV 注意力头数
                result["num_key_value_heads"] = (
                    text_config.get("num_key_value_heads") or
                    config.get("num_key_value_heads") or
                    text_config.get("n_kv_heads") or
                    config.get("n_kv_heads") or
                    text_config.get("num_kv_heads") or
                    config.get("num_kv_heads") or
                    result.get("num_attention_heads", 0)
                )

                # 词汇表大小
                result["vocab_size"] = text_config.get("vocab_size") or config.get("vocab_size") or 0

                # 中间层维度 - 支持 MoE 和普通模型
                result["intermediate_size"] = (
                    text_config.get("intermediate_size") or
                    text_config.get("moe_intermediate_size") or
                    config.get("intermediate_size") or
                    text_config.get("ffn_hidden_size") or
                    config.get("ffn_hidden_size") or
                    0
                )

                # 注意力头维度
                if "head_dim" in text_config:
                    result["head_dim"] = text_config["head_dim"]
                elif "head_dim" in config:
                    result["head_dim"] = config["head_dim"]
                elif result.get("hidden_size") and result.get("num_attention_heads"):
                    result["head_dim"] = result["hidden_size"] // result["num_attention_heads"]
                else:
                    result["head_dim"] = 0

                # 最大位置编码
                result["max_position_embeddings"] = (
                    text_config.get("max_position_embeddings") or
                    config.get("max_position_embeddings") or
                    text_config.get("max_sequence_length") or
                    config.get("max_sequence_length") or
                    config.get("seq_length") or
                    0
                )

                # MoE 相关字段 - 同时检查 text_config 和 config
                num_experts = (
                    text_config.get("num_experts") or
                    config.get("num_experts") or
                    text_config.get("num_local_experts") or
                    config.get("num_local_experts") or
                    config.get("expert_count") or
                    0
                )
                num_experts_per_tok = (
                    text_config.get("num_experts_per_tok") or
                    config.get("num_experts_per_tok") or
                    text_config.get("top_k") or
                    config.get("top_k") or
                    config.get("active_experts") or
                    config.get("num_activated_experts") or
                    0
                )

                result["num_experts"] = num_experts
                result["num_experts_per_tok"] = num_experts_per_tok
                result["is_moe"] = num_experts > 0

                # Hybrid attention fields (for models like Qwen3.5)
                # Check for layer_types array which indicates hybrid attention
                layer_types = text_config.get("layer_types", [])
                full_attention_interval = text_config.get("full_attention_interval", 0)

                if layer_types and "linear_attention" in layer_types:
                    result["is_hybrid_attention"] = True
                    result["full_attention_interval"] = full_attention_interval
                    result["layer_types"] = layer_types

                    # Count full and linear attention layers
                    num_full = sum(1 for lt in layer_types if lt == "full_attention")
                    num_linear = sum(1 for lt in layer_types if lt == "linear_attention")
                    result["num_full_attention_layers"] = num_full
                    result["num_linear_attention_layers"] = num_linear

                    # Linear attention specific config
                    result["linear_num_key_heads"] = text_config.get("linear_num_key_heads", 0)
                    result["linear_num_value_heads"] = text_config.get("linear_num_value_heads", 0)
                    result["linear_key_head_dim"] = text_config.get("linear_key_head_dim", 0)
                    result["linear_value_head_dim"] = text_config.get("linear_value_head_dim", 0)
                    result["linear_conv_kernel_dim"] = text_config.get("linear_conv_kernel_dim", 0)

                    logger.info(f"Hybrid attention model detected: {num_full} full, {num_linear} linear attention layers")
                else:
                    result["is_hybrid_attention"] = False
                    result["full_attention_interval"] = 0
                    result["num_full_attention_layers"] = 0
                    result["num_linear_attention_layers"] = 0
                    result["linear_num_key_heads"] = 0
                    result["linear_num_value_heads"] = 0
                    result["linear_key_head_dim"] = 0
                    result["linear_value_head_dim"] = 0
                    result["linear_conv_kernel_dim"] = 0
                    result["layer_types"] = []

                # 参数量估算
                result["params_billions"] = self._estimate_params(config, text_config, model_full_id)

                return result

            except (EntryNotFoundError, FileNotFoundError):
                logger.warning(f"config.json not found for {hf_id}")
                return {}

        except Exception as e:
            logger.warning(f"Error parsing config: {e}")
            return {}

    def _estimate_params(self, config: Dict[str, Any], text_config: Dict[str, Any] = None, model_full_id: str = "") -> float:
        """根据配置估算参数量 (Billion)

        支持普通 Transformer 和 MoE 模型
        """
        if text_config is None:
            text_config = {}

        try:
            # 尝试从模型名称解析参数量 (如 "397B-A17B" 表示 397B 总参数, 17B 激活参数)
            if model_full_id:
                # 匹配 MoE 命名格式: 397B-A17B, 235B-A22B 等
                moe_match = re.search(r'(\d+)B-A(\d+)B', model_full_id, re.IGNORECASE)
                if moe_match:
                    total_params = float(moe_match.group(1))
                    logger.info(f"Parsed MoE params from model name: {total_params}B total")
                    return total_params

                # 匹配普通命名格式: 7B, 70B 等
                standard_match = re.search(r'[-_](\d+)B(?:[-_]|$)', model_full_id, re.IGNORECASE)
                if standard_match:
                    return float(standard_match.group(1))

            # 从 config 字段获取层数 - 优先使用 text_config
            L = (
                text_config.get("num_hidden_layers") or
                config.get("num_hidden_layers") or
                text_config.get("num_layers") or
                config.get("num_layers") or
                config.get("n_layers") or
                config.get("decoder_layers") or
                0
            )
            d = (
                text_config.get("hidden_size") or
                config.get("hidden_size") or
                config.get("d_model") or
                0
            )
            vocab_size = text_config.get("vocab_size") or config.get("vocab_size") or 32000

            intermediate_size = (
                text_config.get("intermediate_size") or
                text_config.get("moe_intermediate_size") or
                config.get("intermediate_size") or
                text_config.get("ffn_hidden_size") or
                config.get("ffn_hidden_size") or
                4 * d
            )

            # 检查是否为 MoE 模型 - 同时检查 text_config 和 config
            num_experts = (
                text_config.get("num_experts") or
                config.get("num_experts") or
                text_config.get("num_local_experts") or
                config.get("num_local_experts") or
                0
            )
            num_experts_per_tok = (
                text_config.get("num_experts_per_tok") or
                config.get("num_experts_per_tok") or
                text_config.get("top_k") or
                config.get("top_k") or
                config.get("num_activated_experts") or
                0
            )

            if num_experts > 0 and num_experts_per_tok > 0:
                # MoE 模型参数量估算
                # embedding + output
                embedding_params = vocab_size * d * 2

                # attention params: 4 * L * d^2
                attention_params = 4 * L * d * d

                # MoE FFN: 所有专家的参数 (但推理时只激活 num_experts_per_tok 个)
                # 每个专家的参数: 3 * d * intermediate_size
                moe_ffn_params = num_experts * 3 * d * intermediate_size

                # Router 参数: L * d * num_experts
                router_params = L * d * num_experts

                total_params = embedding_params + attention_params + moe_ffn_params + router_params

                logger.info(f"MoE estimation: {num_experts} experts, {num_experts_per_tok} active, "
                           f"total params: {total_params / 1e9:.2f}B")

                return round(total_params / 1e9, 2)
            else:
                # 普通 Transformer 模型参数量估算
                # embedding + output
                embedding_params = vocab_size * d * 2

                # attention params: 4 * L * d^2
                attention_params = 4 * L * d * d

                # ffn params: 3 * L * d * intermediate_size
                ffn_params = 3 * L * d * intermediate_size

                total_params = embedding_params + attention_params + ffn_params

                return round(total_params / 1e9, 2)

        except Exception as e:
            logger.warning(f"Error estimating params: {e}")
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
