"""Pydantic Schemas"""

from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime
from typing import Optional, List
from enum import Enum


class PrecisionTypeEnum(str, Enum):
    """计算精度枚举"""

    FP16 = "fp16"
    BF16 = "bf16"
    FP32 = "fp32"


# 保持向后兼容的别名
PrecisionEnum = PrecisionTypeEnum


# ============ Hardware Schemas ============

class HardwareBase(BaseModel):
    """硬件基础 Schema"""

    name: str = Field(..., min_length=1, max_length=255)
    vendor: str = Field(default="")
    fp16_peak_tflops: float = Field(..., ge=0, description="FP16 峰值算力 (TFLOPS)")
    bf32_peak_tflops: float = Field(..., ge=0, description="BF32 峰值算力 (TFLOPS)")
    fp32_peak_tflops: float = Field(..., ge=0, description="FP32 峰值算力 (TFLOPS)")
    memory_size_gb: float = Field(..., ge=0, description="显存大小 (GB)")
    memory_bandwidth_tbps: float = Field(..., ge=0, description="显存带宽 (TB/s)")
    description: str = Field(default="")


class HardwareCreate(HardwareBase):
    """创建硬件 Schema"""

    pass


class HardwareUpdate(BaseModel):
    """更新硬件 Schema"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    vendor: Optional[str] = None
    fp16_peak_tflops: Optional[float] = Field(None, ge=0)
    bf32_peak_tflops: Optional[float] = Field(None, ge=0)
    fp32_peak_tflops: Optional[float] = Field(None, ge=0)
    memory_size_gb: Optional[float] = Field(None, ge=0)
    memory_bandwidth_tbps: Optional[float] = Field(None, ge=0)
    description: Optional[str] = None


class HardwareResponse(HardwareBase):
    """硬件响应 Schema"""

    id: int
    is_preset: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class HardwareImportResponse(BaseModel):
    """硬件导入响应 Schema"""

    imported_count: int
    hardware_list: List[HardwareResponse]


# ============ Model Schemas ============

class ModelBase(BaseModel):
    """模型基础 Schema"""

    name: str = Field(..., min_length=1, max_length=255)
    huggingface_id: str = Field(..., min_length=1, max_length=500)
    params_billions: float = Field(..., ge=0, description="参数量 (Billion)")
    num_layers: int = Field(..., ge=0, description="层数")
    hidden_size: int = Field(..., ge=0, description="隐藏层维度")
    num_attention_heads: int = Field(..., ge=0, description="注意力头数")
    num_key_value_heads: int = Field(..., ge=0, description="KV 注意力头数")
    vocab_size: int = Field(..., ge=0, description="词汇表大小")
    intermediate_size: int = Field(..., ge=0, description="中间层维度")
    head_dim: int = Field(..., ge=0, description="注意力头维度")
    max_position_embeddings: int = Field(..., ge=0, description="最大位置编码长度")
    model_type: str = Field(default="llama")
    description: str = Field(default="")


class ModelCreate(ModelBase):
    """创建模型 Schema"""

    pass


class ModelUpdate(BaseModel):
    """更新模型 Schema"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    huggingface_id: Optional[str] = Field(None, min_length=1, max_length=500)
    params_billions: Optional[float] = Field(None, ge=0)
    num_layers: Optional[int] = Field(None, ge=0)
    hidden_size: Optional[int] = Field(None, ge=0)
    num_attention_heads: Optional[int] = Field(None, ge=0)
    num_key_value_heads: Optional[int] = Field(None, ge=0)
    vocab_size: Optional[int] = Field(None, ge=0)
    intermediate_size: Optional[int] = Field(None, ge=0)
    head_dim: Optional[int] = Field(None, ge=0)
    max_position_embeddings: Optional[int] = Field(None, ge=0)
    model_type: Optional[str] = None
    description: Optional[str] = None


class ModelResponse(ModelBase):
    """模型响应 Schema"""

    id: int
    is_preset: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class HuggingFacePreviewResponse(BaseModel):
    """Hugging Face 预览响应 Schema"""

    huggingface_id: str
    name: str
    params_billions: float
    num_layers: int
    hidden_size: int
    num_attention_heads: int
    num_key_value_heads: int
    vocab_size: int
    intermediate_size: int
    head_dim: int
    max_position_embeddings: int
    model_type: str
    message: str = "Preview retrieved successfully"


# ============ Calculation Schemas ============

class CalculationInput(BaseModel):
    """计算输入 Schema"""

    model_config = ConfigDict(protected_namespaces=())

    hardware_id: int = Field(..., description="硬件 ID")
    model_id: int = Field(..., description="模型 ID")
    precision: PrecisionTypeEnum = Field(default=PrecisionTypeEnum.FP16, description="计算精度")
    first_token_latency_ms: float = Field(..., gt=0, description="首 Token 时延 (ms)")
    tpot_ms: float = Field(..., gt=0, description="每个输出 Token 的时间 (ms)")
    context_length: int = Field(..., gt=0, description="上下文长度 (tokens)")
    generated_length: int = Field(..., gt=0, description="生成长度 (tokens)")
    batch_size: int = Field(default=1, ge=1, description="批次大小")


class BottleneckTypeEnum(str, Enum):
    """瓶颈类型枚举"""

    COMPUTE = "compute"  # 计算受限
    MEMORY = "memory"  # 访存受限
    BALANCED = "balanced"  # 平衡


class CalculationResult(BaseModel):
    """计算结果 Schema"""

    model_config = ConfigDict(protected_namespaces=())

    # 核心指标
    mfu: float = Field(..., description="Model FLOPs Utilization (%)")
    memory_bandwidth_utilization: float = Field(..., description="显存带宽使用率 (%)")

    # 详细指标
    theoretical_flops: float = Field(..., description="理论算力需求 (TFLOPS)")
    actual_flops: float = Field(..., description="实际算力 (TFLOPS)")
    peak_flops: float = Field(..., description="峰值算力 (TFLOPS)")

    # FLOPs 分解
    prefill_flops: float = Field(..., description="Prefill 阶段 FLOPs")
    decode_flops: float = Field(..., description="Decode 阶段 FLOPs")

    # 内存信息
    kv_cache_bytes: float = Field(..., description="KV Cache 大小 (bytes)")
    model_memory_bytes: float = Field(..., description="模型参数内存 (bytes)")

    # 瓶颈分析
    bottleneck_type: BottleneckTypeEnum = Field(..., description="瓶颈类型")

    # 性能指标
    tokens_per_second: float = Field(..., description="每秒生成 Token 数")
    total_time_ms: float = Field(..., description="总耗时 (ms)")


class OptimizationSuggestion(BaseModel):
    """优化建议 Schema"""

    category: str = Field(..., description="建议类别")
    priority: str = Field(..., description="优先级 (high/medium/low)")
    suggestion: str = Field(..., description="建议内容")
    impact: str = Field(..., description="预期影响")


class CalculationResponse(BaseModel):
    """计算响应 Schema"""

    success: bool
    result: Optional[CalculationResult] = None
    error: Optional[str] = None
    suggestions: List[OptimizationSuggestion] = []


# ============ Message Schemas ============

class MessageResponse(BaseModel):
    """消息响应 Schema"""

    message: str


# ============ Pagination Schemas ============

class PaginationParams(BaseModel):
    """分页参数"""

    page: int = Field(default=1, ge=1, description="页码")
    page_size: int = Field(default=20, ge=1, le=100, description="每页数量")


class PaginatedResponse(BaseModel):
    """通用分页响应 Schema"""

    items: List
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool
