# MFU Calculator - Claude Code 指南

## 项目概述

大模型推理 MFU (Model FLOPs Utilization) 和显存带宽使用率计算平台。

## 项目结构

```
model_viewer/
├── backend/                     # FastAPI 后端
│   ├── app/
│   │   ├── main.py             # FastAPI 应用入口
│   │   ├── database.py         # SQLite 数据库连接
│   │   ├── models.py           # SQLAlchemy 数据模型 (Hardware, Model)
│   │   ├── schemas.py          # Pydantic schemas (请求/响应模型)
│   │   ├── crud/               # 数据库 CRUD 操作
│   │   │   ├── hardware.py     # 硬件 CRUD
│   │   │   └── model.py        # 模型 CRUD
│   │   ├── services/           # 业务逻辑服务
│   │   │   ├── hf_client.py    # Hugging Face API 集成
│   │   │   ├── mfu_calculator.py # MFU 计算引擎
│   │   │   └── optimizer.py    # 优化建议引擎
│   │   └── routers/            # API 路由
│   │       ├── hardware.py     # 硬件管理 API
│   │       ├── model.py        # 模型管理 API
│   │       └── calculator.py   # MFU 计算 API
│   ├── tests/                  # 测试 (pytest + Playwright)
│   │   ├── conftest.py         # pytest 配置和 fixtures
│   │   ├── test_hardware.py    # 硬件 API 测试
│   │   ├── test_model.py       # 模型 API 测试
│   │   ├── test_mfu_calculator.py # MFU 计算测试
│   │   ├── test_boundary.py    # 边界条件测试
│   │   ├── test_optimizer.py   # 优化建议测试
│   │   ├── test_calculator_api.py # 计算 API 测试
│   │   ├── test_e2e.py         # API 端到端测试 (25用例)
│   │   └── test_playwright.py  # 浏览器 E2E 测试 (13用例)
│   ├── init_preset_data.py     # 预设数据初始化脚本
│   ├── requirements.txt        # Python 依赖
│   └── pytest.ini              # pytest 配置
├── frontend/                   # Next.js + React 前端
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 首页 (计算器)
│   │   └── management/         # 管理页面
│   │       └── page.tsx        # 硬件/模型管理
│   ├── components/             # React 组件
│   │   ├── calculator/         # 计算器相关组件
│   │   │   ├── calculator-form.tsx
│   │   │   ├── results-panel.tsx
│   │   │   └── comparison-table.tsx
│   │   ├── management/         # 管理相关组件
│   │   │   ├── hardware-table.tsx
│   │   │   └── model-table.tsx
│   │   └── ui/                 # UI 组件库 (shadcn/ui)
│   ├── lib/                    # 工具库
│   │   ├── api.ts              # API 服务层 (对接后端)
│   │   ├── store.ts            # Zustand 状态管理
│   │   ├── calculator.ts       # MFU 计算逻辑
│   │   ├── types.ts            # TypeScript 类型定义
│   │   └── utils.ts            # 工具函数
│   ├── hooks/                  # React Hooks
│   ├── public/                 # 静态资源
│   ├── package.json            # Node.js 依赖
│   ├── pnpm-lock.yaml          # pnpm 锁定文件
│   ├── vitest.config.ts        # Vitest 配置
│   ├── vitest.setup.ts         # Vitest 设置
│   └── tsconfig.json           # TypeScript 配置
├── PRD.md                      # 产品需求文档
├── TEST_PLAN.md                # 测试计划
└── CLAUDE.md                   # 本指南
```

## 快速开始

### 后端安装

```bash
cd backend
pip install -r requirements.txt
```

### 前端安装

```bash
cd frontend
pnpm install
```

### 初始化数据库

```bash
cd backend
python init_preset_data.py
```

预设数据包括：
- **硬件**: NVIDIA A100 (40GB/80GB), H100, RTX 4090, L40S, T4
- **模型**: Llama-2-7b, Llama-2-13b, Llama-2-70b, Qwen-7B, Mistral-7B

### 启动服务

**后端服务器 (端口 8080)**:
```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8080
```

**前端开发服务器 (端口 3000)**:
```bash
cd frontend
pnpm dev
```

API 文档: http://localhost:8080/docs

## API 端点 (后端)

### 硬件管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/hardware` | 获取硬件列表 |
| GET | `/api/v1/hardware/{id}` | 获取单个硬件 |
| POST | `/api/v1/hardware` | 创建硬件 |
| PUT | `/api/v1/hardware/{id}` | 更新硬件 |
| DELETE | `/api/v1/hardware/{id}` | 删除硬件 |
| POST | `/api/v1/hardware/import` | Excel 批量导入 |
| GET | `/api/v1/hardware/template/download` | 下载导入模板 |

### 模型管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/models` | 获取模型列表 |
| GET | `/api/v1/models/{id}` | 获取单个模型 |
| POST | `/api/v1/models` | 创建模型 |
| POST | `/api/v1/models/from-hf` | 从 Hugging Face 添加 |
| GET | `/api/v1/models/hf/{hf_id}` | 预览 Hugging Face 模型 |
| PUT | `/api/v1/models/{id}` | 更新模型 |
| DELETE | `/api/v1/models/{id}` | 删除模型 |

### 计算 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/calculate/mfu` | 计算 MFU 和显存带宽 |
| GET | `/api/v1/calculate/bottleneck-description/{type}` | 获取瓶颈描述 |

### 健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/` | 根路径信息 |
| GET | `/health` | 健康检查 |

## 前端测试

### 安装测试依赖

```bash
cd frontend
pnpm install
```

### 运行测试

```bash
cd frontend

# 运行所有测试
pnpm test:run

# 运行并显示覆盖率
pnpm test:run --coverage

# 交互式测试 (带 UI)
pnpm test:ui
```

### 前端测试文件

| 文件 | 说明 | 用例数 |
|------|------|--------|
| `lib/api.test.ts` | API 服务层测试 | 9 |
| `lib/calculator.test.ts` | MFU 计算逻辑测试 | 10 |
| `lib/store.test.ts` | Zustand 状态管理测试 | 6 |

## 后端测试

### 运行后端测试

```bash
cd backend

# 运行所有测试
pytest tests/ -v

# 运行特定模块测试
pytest tests/test_mfu_calculator.py -v

# 运行并生成覆盖率报告
pytest tests/ --cov=app --cov-report=html
```

### 后端测试模块

| 文件 | 说明 | 用例数 |
|------|------|--------|
| `test_hardware.py` | 硬件 CRUD API 测试 | 10+ |
| `test_model.py` | 模型 CRUD API 测试 | 10+ |
| `test_mfu_calculator.py` | MFU 计算引擎测试 | 15+ |
| `test_boundary.py` | 边界条件测试 | 12 |
| `test_calculator_api.py` | 计算 API 测试 | 10+ |
| `test_e2e.py` | API 端到端测试 | 25 |
| `test_hf_client.py` | Hugging Face 客户端测试 | 10+ |
| `test_import_export.py` | 导入导出测试 | 7 |
| `test_playwright.py` | 浏览器 E2E 测试 | 17 |

### 浏览器 E2E 测试 (Playwright)

需要先启动后端服务器：

```bash
# 终端 1: 启动服务器
cd backend
uvicorn app.main:app --host 0.0.0.0 --port 8080

# 终端 2: 运行 Playwright 测试
cd backend
python -m pytest tests/test_playwright.py -v
```

## 前端 API 对接

前端通过 `lib/api.ts` 中的 `ApiClient` 与后端通信，支持：

- **双模式支持**: 可切换本地计算模式 (useApi: false) 或 API 模式 (useApi: true)
- **类型转换**: 自动转换前后端数据类型 (ID、精度格式等)
- **错误处理**: 统一的错误处理和提示

### API 服务配置

环境变量: `NEXT_PUBLIC_API_URL` (默认: `http://localhost:8080/api/v1`)

### Precision 格式转换

| 场景 | 前端格式 | 后端格式 |
|------|---------|---------|
| FP16 | `FP16` | `fp16` |
| BF16 | `BF16` | `bf16` |
| FP32 | `FP32` | `fp32` |

### ID 类型转换

| 场景 | 前端 | 后端 |
|------|------|------|
| 硬件/模型 ID | `string` | `number` |

## MFU 计算公式

### Prefill 阶段 FLOPs
```
Prefill FLOPs = 2 × (Attention FLOPs + MLP FLOPs + Output FLOPs)
             = 2 × (4 × L × C × d² + 3 × L × C × d × intermediate_size + L × C × d × vocab_size)
```

### Decode 阶段 FLOPs
```
Decode FLOPs = 2 × (4 × L × d² + 3 × L × d × intermediate_size + L × d × vocab_size) × Generated Tokens × Batch Size
```

### MFU
```
MFU = (Actual FLOPs / Peak FLOPs) × 100%
```

其中：
- L = 层数 (num_layers)
- C = 上下文长度 (context_length)
- d = 隐藏层维度 (hidden_size)
- vocab_size = 词汇表大小

## 数据模型

### Hardware (硬件)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer | 主键 |
| name | String | 硬件名称 |
| fp16_peak_tflops | Float | FP16 峰值算力 (TFLOPS) |
| bf32_peak_tflops | Float | BF32 峰值算力 (TFLOPS) |
| fp32_peak_tflops | Float | FP32 峰值算力 (TFLOPS) |
| memory_size_gb | Float | 显存大小 (GB) |
| memory_bandwidth_tbps | Float | 显存带宽 (TB/s) |
| is_preset | Boolean | 是否为预设数据 |

### Model (模型)
| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer | 主键 |
| name | String | 模型名称 |
| huggingface_id | String | Hugging Face 模型 ID |
| params_billions | Float | 参数量 (Billion) |
| num_layers | Integer | 层数 |
| hidden_size | Integer | 隐藏层维度 |
| num_attention_heads | Integer | 注意力头数 |
| num_key_value_heads | Integer | KV 注意力头数 |
| vocab_size | Integer | 词汇表大小 |
| intermediate_size | Integer | 中间层维度 |
| head_dim | Integer | 注意力头维度 |
| max_position_embeddings | Integer | 最大位置编码长度 |
| is_preset | Boolean | 是否为预设数据 |

## 优化建议类型

- **compute (计算受限)**: MFU 高、带宽使用率低
- **memory (访存受限)**: MFU 低、带宽使用率高
- **balanced (平衡)**: 两者相近

## 开发注意事项

1. **数据库初始化**: 首次运行会自动创建 SQLite 数据库
2. **预设数据**: `init_preset_data.py` 不会覆盖已存在的数据
3. **API 验证**: 使用 Pydantic 进行参数校验
4. **CORS**: 已配置允许跨域访问
5. **日志**: 使用 Python 标准 logging 模块
6. **前端双模式**: 支持本地计算 (离线使用) 和 API 模式 (对接后端)

## 技术栈

### 后端
- **框架**: FastAPI + SQLAlchemy + Pydantic
- **数据库**: SQLite
- **Hugging Face**: huggingface_hub
- **Excel 处理**: pandas + openpyxl
- **测试**: pytest + httpx + Playwright

### 前端
- **框架**: Next.js 15 + React 19
- **状态管理**: Zustand
- **UI 组件**: shadcn/ui + Radix UI
- **样式**: Tailwind CSS
- **测试**: Vitest + Testing Library
- **图表**: Recharts
- **包管理**: pnpm
