"""预设数据初始化脚本

运行此脚本可以初始化数据库的预设数据
"""

from app.database import SessionLocal, init_db
from app.models import Hardware, Model
from app.schemas import HardwareCreate, ModelCreate
from app.crud import hardware as hardware_crud
from app.crud import model as model_crud


# 预设硬件数据 - 昇腾系列
HARDWARE_PRESETS = [
    {
        "name": "昇腾910B4 32G",
        "vendor": "Huawei",
        "fp16_peak_tflops": 280.0,
        "bf32_peak_tflops": 140.0,
        "fp32_peak_tflops": 70.0,
        "memory_size_gb": 32.0,
        "memory_bandwidth_tbps": 1.0,
        "description": "华为昇腾910B4, 达芬奇架构, 32GB HBM2",
    },
    {
        "name": "昇腾910B4-1 64G",
        "vendor": "Huawei",
        "fp16_peak_tflops": 280.0,
        "bf32_peak_tflops": 140.0,
        "fp32_peak_tflops": 70.0,
        "memory_size_gb": 64.0,
        "memory_bandwidth_tbps": 1.2,
        "description": "华为昇腾910B4-1, 达芬奇架构, 64GB HBM2",
    },
    {
        "name": "昇腾300I Duo 96G",
        "vendor": "Huawei",
        "fp16_peak_tflops": 140.0,
        "bf32_peak_tflops": 70.0,
        "fp32_peak_tflops": 35.0,
        "memory_size_gb": 96.0,
        "memory_bandwidth_tbps": 0.408,
        "description": "华为Atlas 300I Duo, 双芯推理卡, 96GB LPDDR4X",
    },
    {
        "name": "昇腾300v Pro 48G",
        "vendor": "Huawei",
        "fp16_peak_tflops": 140.0,
        "bf32_peak_tflops": 70.0,
        "fp32_peak_tflops": 35.0,
        "memory_size_gb": 48.0,
        "memory_bandwidth_tbps": 0.408,
        "description": "华为Atlas 300v Pro, 视频推理卡, 48GB显存",
    },
]

# 预设模型数据 - Qwen3, DeepSeek, Magistral 系列
MODEL_PRESETS = [
    {
        "name": "Qwen3-30B-A3B",
        "huggingface_id": "Qwen/Qwen3-30B-A3B",
        "params_billions": 30.5,  # 总参数量
        "num_layers": 48,
        "hidden_size": 2048,
        "num_attention_heads": 32,
        "num_key_value_heads": 4,  # GQA
        "vocab_size": 151936,
        "intermediate_size": 6144,
        "head_dim": 128,
        "max_position_embeddings": 32768,
        "model_type": "qwen3_moe",
        "description": "Qwen3 MoE模型, 30.5B总参数, 3.3B激活参数",
    },
    {
        "name": "Qwen3-32B",
        "huggingface_id": "Qwen/Qwen3-32B",
        "params_billions": 32.0,
        "num_layers": 64,
        "hidden_size": 5120,
        "num_attention_heads": 40,
        "num_key_value_heads": 8,  # GQA
        "vocab_size": 151936,
        "intermediate_size": 27648,
        "head_dim": 128,
        "max_position_embeddings": 40960,
        "model_type": "qwen3",
        "description": "Qwen3 32B密集模型",
    },
    {
        "name": "Qwen3-8B",
        "huggingface_id": "Qwen/Qwen3-8B",
        "params_billions": 8.0,
        "num_layers": 36,
        "hidden_size": 4096,
        "num_attention_heads": 32,
        "num_key_value_heads": 8,  # GQA
        "vocab_size": 151936,
        "intermediate_size": 12288,
        "head_dim": 128,
        "max_position_embeddings": 32768,
        "model_type": "qwen3",
        "description": "Qwen3 8B模型",
    },
    {
        "name": "DeepSeek-V3.2",
        "huggingface_id": "deepseek-ai/DeepSeek-V3.2",
        "params_billions": 685.0,  # MoE总参数量
        "num_layers": 61,
        "hidden_size": 7168,
        "num_attention_heads": 128,
        "num_key_value_heads": 128,
        "vocab_size": 129280,
        "intermediate_size": 2048,  # MoE专家中间层
        "head_dim": 128,
        "max_position_embeddings": 163840,
        "model_type": "deepseek_v3",
        "description": "DeepSeek-V3.2 MoE模型, 685B总参数",
    },
    {
        "name": "Magistral-Small-2509",
        "huggingface_id": "mistralai/Magistral-Small-2509",
        "params_billions": 24.0,
        "num_layers": 28,
        "hidden_size": 6144,
        "num_attention_heads": 48,
        "num_key_value_heads": 8,  # GQA
        "vocab_size": 32768,
        "intermediate_size": 16384,
        "head_dim": 128,
        "max_position_embeddings": 32768,
        "model_type": "mistral",
        "description": "Mistral Magistral Small 24B模型",
    },
]


def init_preset_data():
    """初始化预设数据"""
    db = SessionLocal()
    try:
        # 初始化硬件
        for hw_data in HARDWARE_PRESETS:
            existing = hardware_crud.get_hardware_by_name(db, hw_data["name"])
            if not existing:
                hw_create = HardwareCreate(**hw_data)
                hardware_crud.create_hardware(db, hw_create)
                print(f"Created hardware: {hw_data['name']}")
            else:
                print(f"Hardware already exists: {hw_data['name']}")

        # 初始化模型
        for model_data in MODEL_PRESETS:
            existing = model_crud.get_model_by_hf_id(db, model_data["huggingface_id"])
            if not existing:
                model_create = ModelCreate(**model_data)
                model_crud.create_model(db, model_create)
                print(f"Created model: {model_data['name']}")
            else:
                print(f"Model already exists: {model_data['name']}")

        print("\nPreset data initialization completed!")
    finally:
        db.close()


if __name__ == "__main__":
    # 初始化数据库
    init_db()

    # 初始化预设数据
    init_preset_data()
