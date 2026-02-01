"""预设数据初始化脚本

运行此脚本可以初始化数据库的预设数据
"""

from app.database import SessionLocal, init_db
from app.models import Hardware, Model
from app.schemas import HardwareCreate, ModelCreate
from app.crud import hardware as hardware_crud
from app.crud import model as model_crud


# 预设硬件数据
HARDWARE_PRESETS = [
    {
        "name": "NVIDIA A100 80GB",
        "vendor": "NVIDIA",
        "fp16_peak_tflops": 1248.0,
        "bf32_peak_tflops": 624.0,
        "fp32_peak_tflops": 312.0,
        "memory_size_gb": 80.0,
        "memory_bandwidth_tbps": 2.039,
        "description": "Data center GPU, Ampere architecture",
    },
    {
        "name": "NVIDIA A100 40GB",
        "vendor": "NVIDIA",
        "fp16_peak_tflops": 1248.0,
        "bf32_peak_tflops": 624.0,
        "fp32_peak_tflops": 312.0,
        "memory_size_gb": 40.0,
        "memory_bandwidth_tbps": 1.555,
        "description": "Data center GPU, Ampere architecture",
    },
    {
        "name": "NVIDIA H100 80GB",
        "vendor": "NVIDIA",
        "fp16_peak_tflops": 4000.0,
        "bf32_peak_tflops": 2000.0,
        "fp32_peak_tflops": 1000.0,
        "memory_size_gb": 80.0,
        "memory_bandwidth_tbps": 3.35,
        "description": "Next generation data center GPU, Hopper architecture",
    },
    {
        "name": "NVIDIA RTX 4090",
        "vendor": "NVIDIA",
        "fp16_peak_tflops": 1657.0,
        "bf32_peak_tflops": 82.0,
        "fp32_peak_tflops": 82.0,
        "memory_size_gb": 24.0,
        "memory_bandwidth_tbps": 1.008,
        "description": "Consumer GPU, Ada Lovelace architecture",
    },
    {
        "name": "NVIDIA L40S",
        "vendor": "NVIDIA",
        "fp16_peak_tflops": 1833.0,
        "bf32_peak_tflops": 366.0,
        "fp32_peak_tflops": 183.0,
        "memory_size_gb": 48.0,
        "memory_bandwidth_tbps": 1.6,
        "description": "Data center GPU, Ada Lovelace architecture",
    },
    {
        "name": "NVIDIA T4",
        "vendor": "NVIDIA",
        "fp16_peak_tflops": 130.0,
        "bf32_peak_tflops": 65.0,
        "fp32_peak_tflops": 65.0,
        "memory_size_gb": 16.0,
        "memory_bandwidth_tbps": 0.3,
        "description": "Inference GPU, Turing architecture",
    },
]

# 预设模型数据
MODEL_PRESETS = [
    {
        "name": "Llama-2-7b",
        "huggingface_id": "meta-llama/Llama-2-7b-hf",
        "params_billions": 7.0,
        "num_layers": 32,
        "hidden_size": 4096,
        "num_attention_heads": 32,
        "num_key_value_heads": 32,
        "vocab_size": 32000,
        "intermediate_size": 11008,
        "head_dim": 128,
        "max_position_embeddings": 4096,
        "model_type": "llama",
        "description": "Meta's Llama 2 7B parameter model",
    },
    {
        "name": "Llama-2-13b",
        "huggingface_id": "meta-llama/Llama-2-13b-hf",
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
        "description": "Meta's Llama 2 13B parameter model",
    },
    {
        "name": "Llama-2-70b",
        "huggingface_id": "meta-llama/Llama-2-70b-hf",
        "params_billions": 70.0,
        "num_layers": 80,
        "hidden_size": 8192,
        "num_attention_heads": 64,
        "num_key_value_heads": 8,  # GQA
        "vocab_size": 32000,
        "intermediate_size": 28672,
        "head_dim": 128,
        "max_position_embeddings": 4096,
        "model_type": "llama",
        "description": "Meta's Llama 2 70B parameter model",
    },
    {
        "name": "Qwen-7B",
        "huggingface_id": "Qwen/Qwen-7B",
        "params_billions": 7.0,
        "num_layers": 32,
        "hidden_size": 4096,
        "num_attention_heads": 32,
        "num_key_value_heads": 32,
        "vocab_size": 151936,
        "intermediate_size": 11008,
        "head_dim": 128,
        "max_position_embeddings": 32768,
        "model_type": "qwen",
        "description": "Alibaba's Qwen 7B parameter model",
    },
    {
        "name": "Mistral-7B",
        "huggingface_id": "mistralai/Mistral-7B-v0.1",
        "params_billions": 7.0,
        "num_layers": 32,
        "hidden_size": 4096,
        "num_attention_heads": 32,
        "num_key_value_heads": 8,  # GQA
        "vocab_size": 32000,
        "intermediate_size": 14336,
        "head_dim": 128,
        "max_position_embeddings": 32768,
        "model_type": "mistral",
        "description": "Mistral AI's 7B parameter model",
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
