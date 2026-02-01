"""Pytest 配置文件"""

import pytest
import subprocess
import time
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app


# 测试数据库
TEST_DATABASE_URL = "sqlite:///./test_mfu_calculator.db"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def test_db():
    """创建测试数据库"""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(test_db):
    """创建测试客户端"""
    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


@pytest.fixture
def sample_hardware():
    """示例硬件数据"""
    return {
        "name": "Test GPU",
        "vendor": "Test Vendor",
        "fp16_peak_tflops": 1000.0,
        "bf32_peak_tflops": 500.0,
        "fp32_peak_tflops": 250.0,
        "memory_size_gb": 80.0,
        "memory_bandwidth_tbps": 2.0,
        "description": "Test hardware",
    }


@pytest.fixture
def sample_model():
    """示例模型数据"""
    return {
        "name": "test-model",
        "huggingface_id": "test-org/test-model",
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
        "description": "Test model",
    }


# 预设硬件常量 (定义为 fixture)
@pytest.fixture
def A100_80GB():
    return {
        "fp16_peak_tflops": 1248.0,
        "bf32_peak_tflops": 624.0,
        "fp32_peak_tflops": 312.0,
        "memory_size_gb": 80.0,
        "memory_bandwidth_tbps": 2.039,
    }


@pytest.fixture
def H100():
    return {
        "fp16_peak_tflops": 4000.0,
        "bf32_peak_tflops": 2000.0,
        "fp32_peak_tflops": 1000.0,
        "memory_size_gb": 80.0,
        "memory_bandwidth_tbps": 3.35,
    }


# 预设模型常量 (定义为 fixture)
@pytest.fixture
def LLAMA_7B():
    return {
        "params_billions": 7.0,
        "num_layers": 32,
        "hidden_size": 4096,
        "num_attention_heads": 32,
        "num_key_value_heads": 32,
        "vocab_size": 32000,
        "intermediate_size": 11008,
        "head_dim": 128,
        "max_position_embeddings": 4096,
    }


@pytest.fixture(scope="session")
def live_server_url():
    """返回服务器 URL (用于 Playwright 测试)"""
    return "http://localhost:8080"
