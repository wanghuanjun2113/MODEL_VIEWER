# MFU计算器 - 产品需求文档 (PRD)

## 1. 项目概述

### 1.1 产品名称
MFU计算器 - 大模型推理效率分析平台

### 1.2 产品定位
面向研究人员和工程师的专业工具，用于计算和分析大语言模型推理过程中的 MFU (Model FLOPs Utilization) 和显存带宽使用率，并提供系统优化建议。

### 1.3 核心价值
- 帮助用户了解模型推理的实际性能与理论性能的比值
- 识别系统瓶颈（计算受限 vs 访存受限）
- 提供针对性的优化建议

---

## 2. 用户需求

### 2.1 目标用户
- 大模型研究人员
- AI 系统工程师
- 深度学习性能优化人员

### 2.2 用户场景
1. 评估不同硬件配置下的推理效率
2. 对比不同模型的推理性能
3. 识别系统性能瓶颈
4. 指导系统调优决策

---

## 3. 功能需求

### 3.1 硬件管理

#### 3.1.1 功能描述
管理可用于计算的硬件设备信息

#### 3.1.2 硬件参数
| 参数 | 类型 | 说明 |
|------|------|------|
| id | UUID | 唯一标识 |
| name | String | 硬件型号 |
| fp16_peak_tflops | Float | FP16 峰值算力 (TFLOPS) |
| bf32_peak_tflops | Float | BF32 峰值算力 (TFLOPS) |
| fp32_peak_tflops | Float | FP32 峰值算力 (TFLOPS) |
| memory_size_gb | Float | 显存大小 (GB) |
| memory_bandwidth_tbps | Float | 显存带宽 (TB/s) |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

#### 3.1.3 功能列表
- [ ] 硬件列表展示
- [ ] Excel 模板下载
- [ ] Excel 批量导入
- [ ] 单个硬件添加
- [ ] 硬件编辑
- [ ] 硬件删除

#### 3.1.4 预设数据
- NVIDIA A100 (40GB/80GB)
- NVIDIA H100
- NVIDIA RTX 4090
- NVIDIA L40S
- NVIDIA T4

---

### 3.2 模型管理

#### 3.2.1 功能描述
管理用于计算的模型信息，支持从 Hugging Face 自动获取

#### 3.2.2 模型参数
| 参数 | 类型 | 说明 |
|------|------|------|
| id | UUID | 唯一标识 |
| name | String | 模型名称 |
| huggingface_id | String | Hugging Face 模型ID |
| params_billions | Float | 参数量 (Billion) |
| num_layers | Int | 层数 |
| hidden_size | Int | 隐藏层维度 |
| num_attention_heads | Int | 注意力头数 |
| num_key_value_heads | Int | KV 注意力头数 |
| vocab_size | Int | 词汇表大小 |
| intermediate_size | Int | 中间层维度 |
| head_dim | Int | 注意力头维度 |
| max_position_embeddings | Int | 最大位置编码长度 |
| created_at | DateTime | 创建时间 |
| updated_at | DateTime | 更新时间 |

#### 3.2.3 功能列表
- [ ] 模型列表展示
- [ ] 从 Hugging Face 添加（输入ID → 获取预览 → 确认保存）
- [ ] 模型编辑
- [ ] 模型删除

---

### 3.3 MFU 计算

#### 3.3.1 输入参数
| 参数 | 类型 | 说明 | 来源 |
|------|------|------|------|
| hardware_id | UUID | 选择的硬件 | 用户选择 |
| model_id | UUID | 选择的模型 | 用户选择 |
| precision | Enum | 计算精度 | 用户选择 (FP16/BF16/FP32) |
| first_token_latency_ms | Float | 首 Token 时延 (ms) | 用户输入 |
| tpot_ms | Float | 每个输出 Token 的时间 (ms) | 用户输入 |
| context_length | Int | 上下文长度 | 用户输入 |
| generated_length | Int | 生成长度 | 用户输入 |
| batch_size | Int | 批次大小/并发数 | 用户输入 |

#### 3.3.2 输出结果
| 参数 | 说明 |
|------|------|
| mfu | Model FLOPs Utilization (%) |
| memory_bandwidth_utilization | 显存带宽使用率 (%) |
| theoretical_flops | 理论算力需求 (TFLOPS) |
| actual_flops | 实际算力 (TFLOPS) |
| bottleneck_type | 瓶颈类型 (compute/memory) |

#### 3.3.3 计算公式

**MFU 计算：**
```
MFU = Actual FLOPs / Peak FLOPs × 100%

对于 Transformer 模型：
- Prefill 阶段 FLOPs = 2 × (2 × L × d² + 3 × L × d × n)
- Decode 阶段 FLOPs = 2 × L × d × (2 × d + n)

其中：
- L = 层数
- d = 隐藏层维度
- n = 词汇表大小
```

**显存带宽使用率：**
```
带宽使用率 = 所需带宽 / 峰值带宽 × 100%

所需带宽 = (模型参数 + KV Cache + 激活值) / 时延
```

---

### 3.4 优化建议

#### 3.4.1 建议类型
| 瓶颈类型 | 建议内容 |
|----------|----------|
| 计算受限 | 建议使用更高算力硬件、启用 Tensor Core、考虑模型量化 |
| 访存受限 | 建议使用高带宽内存、减少 batch size、考虑模型压缩 |
| 正常 | 系统运行在合理效率范围 |

#### 3.4.2 展示方式
- 计算结果区域直接显示简要优化建议
- 文字说明 + 可视化指标对比

---

### 3.5 多配置对比

#### 3.5.1 功能描述
允许用户保存多个计算结果，进行横向对比分析

#### 3.5.2 展示方式
- 表格形式并排对比各配置指标
- 可删除不需要对比的配置

---

### 3.6 导入导出

#### 3.6.1 导出功能
- 导出硬件配置 (Excel)
- 导出模型配置 (JSON)
- 导出计算结果 (Excel/JSON)

#### 3.6.2 导入功能
- 导入硬件配置 (Excel)

---

## 4. 页面设计

### 4.1 页面结构

```
┌────────────────────────────────────────────┐
│ [MFU计算器]    [计算]    [管理]            │  ← 顶部导航
├────────────────────────────────────────────┤
│                                            │
│              首页（计算页面）               │
│                                            │
└────────────────────────────────────────────┘
```

### 4.2 导航设计
- **MFU计算器**：Logo/品牌标识
- **计算**：跳转到计算页面（首页）
- **管理**：跳转到硬件和模型管理页面

### 4.3 计算页面布局

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  左侧 - 输入区域                     │  右侧 - 结果区域     │
│                                       │                      │
│  [硬件选择 ▼]                        │  ┌────────────────┐  │
│                                       │  │ MFU            │  │
│  [模型选择 ▼]                        │  │ XX.XX %        │  │
│                                       │  └────────────────┘  │
│  ───────── 时延信息 ───────────      │                      │
│  首Token时延 [________] ms           │  ┌────────────────┐  │
│  TPOT        [________] ms           │  │ 带宽使用率     │  │
│                                       │  │ XX.XX %        │  │
│  ───────── 上下文信息 ──────────      │  └────────────────┘  │
│  上下文长度 [________] tokens        │                      │
│  生成长度   [________] tokens        │  ─────────────────   │
│                                       │                      │
│  并发数     [________]               │  ┌────────────────┐  │
│                                       │  │ 优化建议       │  │
│  ───────── 计算精度 ──────────      │  │ • 简要提示...  │  │
│  (○) FP16  ( ) BF16  ( ) FP32       │  │ • 简要提示...  │  │
│                                       │  └────────────────┘  │
│  [         开始计算          ]       │                      │
│                                       │  ─────────────────   │
│                                       │                      │
│                                       │  ┌────────────────┐  │
│                                       │  │ 结果对比列表   │  │
│                                       │  │ [表格对比]     │  │
│                                       │  └────────────────┘  │
│                                       │                      │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 管理页面布局

```
┌─────────────────────────────────────────────────────────────┐
│  [硬件管理] Tab        │        [模型管理] Tab              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [下载模板] [导入Excel] [+ 添加硬件]                         │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 硬件列表（表格）                                       │   │
│  │ ───────────────────────────────────────────────────  │   │
│  │  型号     │ FP16算力  │ 显存   │ 带宽     │ 操作     │   │
│  │  A100     │ 312 TF   │ 80GB   │ 2TB/s   │ [编辑]   │   │
│  │  H100     │ 2000 TF  │ 80GB   │ 3TB/s   │ [编辑]   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**模型管理 Tab：**

```
┌─────────────────────────────────────────────────────────────┐
│  [硬件管理] Tab        │        [模型管理] Tab              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [+ 从 Hugging Face 添加]                                    │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Hugging Face ID: [____________________] [获取预览]   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 模型列表（表格）                                       │   │
│  │ ───────────────────────────────────────────────────  │   │
│  │  名称       │ 参数量  │ 层数 │ 隐藏维度 │ 操作       │   │
│  │  llama-2-7b │ 7B      │ 32   │ 4096    │ [编辑][删除]│   │
│  │  llama-2-13b│ 13B     │ 40   │ 5120    │ [编辑][删除]│   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 技术架构

### 5.1 技术栈

| 层级 | 技术选择 |
|------|----------|
| 前端框架 | React + TypeScript |
| UI 组件库 | Ant Design / Material UI |
| 状态管理 | React Context / Zustand |
| 图表库 | Recharts / ECharts |
| 后端框架 | FastAPI (Python) |
| 数据库 | SQLite |
| Hugging Face 集成 | huggingface_hub 库 |
| Excel 处理 | openpyxl / pandas |
| 部署方式 | 一体化部署 |

### 5.2 项目结构

```
model_viewer/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI 应用入口
│   │   ├── database.py             # 数据库连接
│   │   ├── models.py               # 数据模型
│   │   ├── schemas.py              # Pydantic schemas
│   │   ├── crud/
│   │   │   ├── __init__.py
│   │   │   ├── hardware.py         # 硬件 CRUD
│   │   │   └── model.py            # 模型 CRUD
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── mfu_calculator.py   # MFU 计算引擎
│   │   │   ├── hf_client.py        # Hugging Face 客户端
│   │   │   └── optimizer.py        # 优化建议
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── hardware.py
│   │       ├── model.py
│   │       └── calculator.py
│   ├── requirements.txt
│   └── templates/
│       └── hardware_template.xlsx  # 硬件导入模板
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/
│   │   │   ├── Layout/
│   │   │   ├── Calculator/
│   │   │   └── Management/
│   │   ├── pages/
│   │   │   ├── CalculatorPage.tsx
│   │   │   └── ManagementPage.tsx
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── styles/
│   ├── package.json
│   └── tsconfig.json
├── docs/
│   └── API.md
├── PRD.md
└── README.md
```

### 5.3 API 设计

#### 5.3.1 硬件管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/hardware | 获取硬件列表 |
| GET | /api/hardware/{id} | 获取单个硬件 |
| POST | /api/hardware | 创建硬件 |
| PUT | /api/hardware/{id} | 更新硬件 |
| DELETE | /api/hardware/{id} | 删除硬件 |
| POST | /api/hardware/import | 批量导入硬件 |
| GET | /api/hardware/template | 下载导入模板 |

#### 5.3.2 模型管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/models | 获取模型列表 |
| GET | /api/models/{id} | 获取单个模型 |
| POST | /api/models | 创建模型 |
| POST | /api/models/from-hf | 从 Hugging Face 获取 |
| PUT | /api/models/{id} | 更新模型 |
| DELETE | /api/models/{id} | 删除模型 |

#### 5.3.3 计算 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/calculate/mfu | 计算 MFU |
| POST | /api/calculate/batch | 批量计算 |

---

## 6. 非功能需求

### 6.1 性能需求
- 页面加载时间 < 3秒
- API 响应时间 < 500ms
- Hugging Face 获取 < 5秒

### 6.2 兼容性
- Chrome / Firefox / Safari / Edge 最新版本
- 响应式设计，支持移动端

### 6.3 主题
- 支持深色/浅色主题切换
- 默认跟随系统设置

### 6.4 国际化
- 支持中文
- 支持英文

---

## 7. 开发计划

### Phase 1: 基础架构
- [ ] 设计数据库模型
- [ ] 搭建 FastAPI 后端
- [ ] 搭建 React 前端项目
- [ ] 实现硬件 CRUD API

### Phase 2: 模型管理
- [ ] 实现模型 CRUD API
- [ ] 集成 Hugging Face Hub API
- [ ] 开发模型管理页面
- [ ] 实现 Excel 导入功能

### Phase 3: 计算引擎
- [ ] 实现 MFU 计算逻辑
- [ ] 实现显存带宽计算
- [ ] 实现优化建议算法
- [ ] 添加预设数据

### Phase 4: 前端开发
- [ ] 开发计算输入表单
- [ ] 开发结果展示面板
- [ ] 实现主题切换
- [ ] 实现响应式布局

### Phase 5: 完善功能
- [ ] 实现多配置对比
- [ ] 实现导入导出
- [ ] 中英文国际化
- [ ] 测试和优化

---

## 8. 附录

### 8.1 术语表

| 术语 | 说明 |
|------|------|
| MFU | Model FLOPs Utilization，模型算力利用率 |
| TPOT | Time Per Output Token，输出每个 token 的时间 |
| FLOPs | Floating Point Operations，浮点运算次数 |
| TFLOPS | Tera FLOPs，万亿次浮点运算/秒 |
| KV Cache | Key-Value 缓存，用于加速生成 |

### 8.2 参考资料
- [Transformer FLOPs 计算](https://medium.com/@dzmitrybahdanau/the-flops-considerations-of-modern-transformer-models-a8b67182765f)
- [Hugging Face Hub API](https://huggingface.co/docs/hub)
- [MFU 基准测试方法](https://github.com/EleutherAI/gpt-neox)
