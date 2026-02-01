"""FastAPI 应用主入口"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import logging
import os

from .database import init_db
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


@app.on_event("startup")
def startup_event():
    """启动时初始化数据库"""
    init_db()
    logger.info("Database initialized")


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
