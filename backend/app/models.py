"""数据库模型定义"""

from sqlalchemy import Column, Float, Integer, String, DateTime, Boolean, JSON, Text
from sqlalchemy.sql import func
from .database import Base


class Hardware(Base):
    """硬件设备模型"""

    __tablename__ = "hardware"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    vendor = Column(String(100), default="")  # 厂商

    # 峰值算力 (TFLOPS)
    fp16_peak_tflops = Column(Float, nullable=False, default=0.0)
    bf32_peak_tflops = Column(Float, nullable=False, default=0.0)
    fp32_peak_tflops = Column(Float, nullable=False, default=0.0)

    # 显存配置
    memory_size_gb = Column(Float, nullable=False, default=0.0)
    memory_bandwidth_tbps = Column(Float, nullable=False, default=0.0)

    # 额外信息
    is_preset = Column(Boolean, default=False)  # 是否为预设数据
    description = Column(String(1000), default="")

    # 时间戳
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Model(Base):
    """模型配置模型"""

    __tablename__ = "models"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    huggingface_id = Column(String(500), nullable=False, index=True)

    # 模型结构参数
    params_billions = Column(Float, nullable=False, default=0.0)
    num_layers = Column(Integer, nullable=False, default=0)
    hidden_size = Column(Integer, nullable=False, default=0)
    num_attention_heads = Column(Integer, nullable=False, default=0)
    num_key_value_heads = Column(Integer, nullable=False, default=0)
    vocab_size = Column(Integer, nullable=False, default=0)
    intermediate_size = Column(Integer, nullable=False, default=0)
    head_dim = Column(Integer, nullable=False, default=0)
    max_position_embeddings = Column(Integer, nullable=False, default=0)

    # 模型类型
    model_type = Column(String(100), default="llama")  # llama, bert, gpt 等

    # 额外信息
    is_preset = Column(Boolean, default=False)
    description = Column(String(1000), default="")

    # 时间戳
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class CalculationHistory(Base):
    """MFU计算历史记录"""

    __tablename__ = "calculation_history"

    id = Column(Integer, primary_key=True, index=True)

    # 关联的硬件和模型
    hardware_id = Column(Integer, nullable=False, index=True)
    model_id = Column(Integer, nullable=False, index=True)

    # 输入参数 (JSON 格式存储)
    input_params = Column(JSON, nullable=False)

    # 计算结果 (JSON 格式存储)
    result = Column(JSON, nullable=False)

    # 时间戳
    created_at = Column(DateTime, server_default=func.now())


class ConcurrencyHistory(Base):
    """并发计算历史记录"""

    __tablename__ = "concurrency_history"

    id = Column(Integer, primary_key=True, index=True)

    # 关联的硬件和模型
    hardware_id = Column(Integer, nullable=False, index=True)
    model_id = Column(Integer, nullable=False, index=True)

    # 输入参数 (JSON 格式存储)
    input_params = Column(JSON, nullable=False)

    # 计算结果 (JSON 格式存储)
    result = Column(JSON, nullable=False)

    # 时间戳
    created_at = Column(DateTime, server_default=func.now())
