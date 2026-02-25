"""FastAPI 应用主入口"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import logging
import os

from .database import init_db, SessionLocal
from .models import Hardware, Model
from .routers import hardware, model, calculator, concurrency

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 创建 FastAPI 应用
app = FastAPI(
    title="MFU Calculator API",
    description="大模型推理 MFU 和显存带宽计算器",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# 配置 CORS - 生产环境应修改为实际域名
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:8080",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(hardware.router)
app.include_router(model.router)
app.include_router(calculator.router)
app.include_router(concurrency.router)

# 配置静态文件服务 - 支持前端构建产物
frontend_dist_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'dist')

if os.path.exists(frontend_dist_path):
    # 挂载前端静态文件
    app.mount("/static", StaticFiles(directory=os.path.join(frontend_dist_path, 'assets')), name="static")


def init_preset_data_on_first_run():
    """首次启动时初始化预设数据"""
    db = SessionLocal()
    try:
        # 检查是否已有硬件数据
        hardware_count = db.query(Hardware).count()
        if hardware_count == 0:
            from .schemas import HardwareCreate, ModelCreate
            from .crud import hardware as hardware_crud
            from .crud import model as model_crud

            # 预设硬件数据 - 昇腾系列
            hardware_presets = [
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

            # 预设模型数据
            model_presets = [
                {
                    "name": "Qwen3-30B-A3B",
                    "huggingface_id": "Qwen/Qwen3-30B-A3B",
                    "params_billions": 30.5,
                    "num_layers": 48,
                    "hidden_size": 2048,
                    "num_attention_heads": 32,
                    "num_key_value_heads": 4,
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
                    "num_key_value_heads": 8,
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
                    "num_key_value_heads": 8,
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
                    "params_billions": 685.0,
                    "num_layers": 61,
                    "hidden_size": 7168,
                    "num_attention_heads": 128,
                    "num_key_value_heads": 128,
                    "vocab_size": 129280,
                    "intermediate_size": 2048,
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
                    "num_key_value_heads": 8,
                    "vocab_size": 32768,
                    "intermediate_size": 16384,
                    "head_dim": 128,
                    "max_position_embeddings": 32768,
                    "model_type": "mistral",
                    "description": "Mistral Magistral Small 24B模型",
                },
            ]

            # 初始化硬件
            for hw_data in hardware_presets:
                hw_create = HardwareCreate(**hw_data)
                hardware_crud.create_hardware(db, hw_create)
                logger.info(f"Created preset hardware: {hw_data['name']}")

            # 初始化模型
            for model_data in model_presets:
                model_create = ModelCreate(**model_data)
                model_crud.create_model(db, model_create)
                logger.info(f"Created preset model: {model_data['name']}")

            logger.info("Preset data initialization completed on first run")
        else:
            logger.info(f"Database already contains {hardware_count} hardware entries, skipping preset initialization")
    except Exception as e:
        logger.error(f"Error initializing preset data: {e}")
    finally:
        db.close()


@app.on_event("startup")
def startup_event():
    """启动时初始化数据库和预设数据"""
    init_db()
    logger.info("Database initialized")
    init_preset_data_on_first_run()


@app.get("/")
def root():
    """根路径"""
    return {
        "name": "MFU Calculator API",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    """健康检查"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
