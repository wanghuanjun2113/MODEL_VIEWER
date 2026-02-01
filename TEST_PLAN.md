# MFU计算器 - 测试计划

## 1. 测试概述

### 1.1 测试目标
- 验证所有功能模块正确运行
- 确保 MFU 和显存带宽计算结果正确
- 验证公式计算准确性
- 确保边界情况和异常处理正常

### 1.2 测试范围
| 模块 | 测试内容 |
|------|----------|
| 后端 API | 硬件 CRUD、模型 CRUD、计算 API |
| 计算引擎 | MFU 计算、显存带宽计算、优化建议 |
| 前端组件 | 表单、结果展示、主题切换 |
| E2E | 完整用户流程 |

---

## 2. 测试环境

### 2.1 环境配置
```yaml
后端:
  Python: 3.10+
  FastAPI: latest
  pytest: latest
  数据库: SQLite

前端:
  Node.js: 18+
  React: 18+
  Jest: latest
  Playwright: latest

预设数据:
  硬件: A100, H100, RTX 4090, L40S, T4
  模型: llama-2-7b, llama-2-13b, llama-2-70b
```

---

## 3. 测试数据 (Preset)

### 3.1 硬件预设数据
```python
HARDWARE_PRESETS = [
    {
        "name": "NVIDIA A100 80GB",
        "fp16_peak_tflops": 1248.0,
        "bf32_peak_tflops": 624.0,
        "fp32_peak_tflops": 312.0,
        "memory_size_gb": 80.0,
        "memory_bandwidth_tbps": 2.039,
    },
    {
        "name": "NVIDIA H100 80GB",
        "fp16_peak_tflops": 4000.0,
        "bf32_peak_tflops": 2000.0,
        "fp32_peak_tflops": 1000.0,
        "memory_size_gb": 80.0,
        "memory_bandwidth_tbps": 3.35,
    },
    {
        "name": "NVIDIA RTX 4090",
        "fp16_peak_tflops": 1657.0,
        "bf32_peak_tflops": 82.0,
        "fp32_peak_tflops": 82.0,
        "memory_size_gb": 24.0,
        "memory_bandwidth_tbps": 1.008,
    },
]
```

### 3.2 模型预设数据
```python
MODEL_PRESETS = [
    {
        "name": "llama-2-7b",
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
    },
    {
        "name": "llama-2-13b",
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
    },
]
```

---

## 4. 后端单元测试 (pytest)

### 4.1 硬件 CRUD 测试
```python
# tests/test_hardware.py

class TestHardwareCRUD:
    """硬件管理 API 测试"""

    def test_create_hardware(self, client):
        """测试创建硬件"""
        hardware_data = {
            "name": "Test GPU",
            "fp16_peak_tflops": 1000.0,
            "bf32_peak_tflops": 500.0,
            "fp32_peak_tflops": 250.0,
            "memory_size_gb": 80.0,
            "memory_bandwidth_tbps": 2.0,
        }
        response = client.post("/api/hardware", json=hardware_data)
        assert response.status_code == 201
        assert response.json()["name"] == "Test GPU"

    def test_get_hardware_list(self, client):
        """测试获取硬件列表"""
        response = client.get("/api/hardware")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_update_hardware(self, client, created_hardware):
        """测试更新硬件"""
        update_data = {"": "Updatedname GPU"}
        response = client.put(f"/api/hardware/{created_hardware.id}", json=update_data)
        assert response.status_code == 200
        assert response.json()["name"] == "Updated GPU"

    def test_delete_hardware(self, client, created_hardware):
        """测试删除硬件"""
        response = client.delete(f"/api/hardware/{created_hardware.id}")
        assert response.status_code == 204

    def test_import_hardware_from_excel(self, client, sample_excel_file):
        """测试 Excel 导入硬件"""
        files = {"file": ("hardware.xlsx", sample_excel_file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
        response = client.post("/api/hardware/import", files=files)
        assert response.status_code == 200
        assert response.json()["imported_count"] > 0
```

### 4.2 模型 CRUD 测试
```python
# tests/test_model.py

class TestModelCRUD:
    """模型管理 API 测试"""

    def test_create_model(self, client):
        """测试创建模型"""
        model_data = {
            "name": "test-model",
            "huggingface_id": "openai-community/gpt2",
            "params_billions": 0.124,
            "num_layers": 12,
            "hidden_size": 768,
            "num_attention_heads": 12,
            "num_key_value_heads": 12,
            "vocab_size": 50257,
            "intermediate_size": 3072,
            "head_dim": 64,
            "max_position_embeddings": 1024,
        }
        response = client.post("/api/models", json=model_data)
        assert response.status_code == 201

    def test_get_model_from_huggingface(self, client):
        """测试从 Hugging Face 获取模型"""
        hf_id = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
        response = client.post(f"/api/models/from-hf?hf_id={hf_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["huggingface_id"] == hf_id
        assert "params_billions" in data
        assert "num_layers" in data

    def test_delete_model(self, client, created_model):
        """测试删除模型"""
        response = client.delete(f"/api/models/{created_model.id}")
        assert response.status_code == 204
```

### 4.3 MFU 计算测试
```python
# tests/test_mfu_calculator.py

class TestMFUCalculator:
    """MFU 计算引擎测试"""

    def test_mfu_calculation_fp16(self):
        """测试 FP16 精度 MFU 计算"""
        hardware = {
            "fp16_peak_tflops": 1248.0,
            "memory_size_gb": 80.0,
            "memory_bandwidth_tbps": 2.039,
        }
        model = {
            "num_layers": 32,
            "hidden_size": 4096,
            "num_attention_heads": 32,
            "vocab_size": 32000,
        }
        input_data = {
            "precision": "fp16",
            "first_token_latency_ms": 50.0,
            "tpot_ms": 10.0,
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        result = mfu_calculator.calculate(hardware, model, input_data)

        # 验证结果结构
        assert "mfu" in result
        assert "memory_bandwidth_utilization" in result
        assert "theoretical_flops" in result
        assert "actual_flops" in result
        assert "bottleneck_type" in result

        # 验证数值范围
        assert 0 < result["mfu"] <= 100
        assert 0 < result["memory_bandwidth_utilization"] <= 100

    def test_mfu_calculation_formula_verification(self):
        """验证 MFU 计算公式正确性

        对于 Llama-2-7B:
        - 层数 L = 32
        - 隐藏层维度 d = 4096
        - 词汇表大小 n = 32000

        Prefill 阶段 FLOPs:
        = 2 * (2 * L * d^2 + 3 * L * d * n)
        = 2 * (2 * 32 * 4096^2 + 3 * 32 * 4096 * 32000)
        """
        model = {
            "num_layers": 32,
            "hidden_size": 4096,
            "vocab_size": 32000,
        }
        context_length = 2048

        # 手动计算 Prefill FLOPs
        L, d, n = 32, 4096, 32000
        expected_prefill_flops = 2 * (2 * L * d * d + 3 * L * d * n)

        result = mfu_calculator._calculate_prefill_flops(model, context_length)

        assert abs(result - expected_prefill_flops) < 1e-6

    def test_mfu_calculation_decode_phase(self):
        """测试 Decode 阶段 FLOPs 计算

        Decode 阶段 FLOPs:
        = 2 * L * d * (2 * d + n)
        """
        model = {
            "num_layers": 32,
            "hidden_size": 4096,
            "vocab_size": 32000,
        }
        generated_length = 128

        L, d, n = 32, 4096, 32000
        expected_decode_flops = 2 * L * d * (2 * d + n) * generated_length

        result = mfu_calculator._calculate_decode_flops(model, generated_length)

        assert abs(result - expected_decode_flops) < 1e-6

    def test_mfu_with_different_precisions(self):
        """测试不同精度计算结果"""
        hardware_fp16 = {"fp16_peak_tflops": 1248.0}
        hardware_bf32 = {"bf32_peak_tflops": 624.0}

        model = {"num_layers": 32, "hidden_size": 4096, "vocab_size": 32000}
        input_data = {"tpot_ms": 10.0, "batch_size": 1}

        result_fp16 = mfu_calculator._calculate_peak_flops(hardware_fp16, "fp16")
        result_bf32 = mfu_calculator._calculate_peak_flops(hardware_bf32, "bf32")

        assert result_fp16 == 1248.0
        assert result_bf32 == 624.0
```

### 4.4 显存带宽计算测试
```python
# tests/test_memory_bandwidth.py

class TestMemoryBandwidth:
    """显存带宽计算测试"""

    def test_memory_bandwidth_calculation(self):
        """测试显存带宽计算"""
        hardware = {
            "memory_size_gb": 80.0,
            "memory_bandwidth_tbps": 2.039,
        }
        model = {
            "params_billions": 7.0,
            "num_layers": 32,
            "hidden_size": 4096,
        }
        input_data = {
            "context_length": 2048,
            "generated_length": 128,
            "batch_size": 1,
        }

        result = memory_bandwidth_calculator.calculate(hardware, model, input_data)

        assert "required_bandwidth" in result
        assert "utilization" in result
        assert result["utilization"] <= 100

    def test_kv_cache_calculation(self):
        """测试 KV Cache 大小计算

        KV Cache = 2 * batch_size * num_layers * num_heads * head_dim * context_length * dtype_size
        """
        batch_size = 1
        num_layers = 32
        num_heads = 32
        head_dim = 128
        context_length = 2048
        dtype_size = 2  # FP16

        expected_kv_cache = (2 * batch_size * num_layers * num_heads *
                           head_dim * context_length * dtype_size)

        result = memory_bandwidth_calculator._calculate_kv_cache(
            batch_size, num_layers, num_heads, head_dim, context_length, dtype_size
        )

        assert abs(result - expected_kv_cache) < 1e-6
```

### 4.5 边界测试
```python
# tests/test_boundary.py

class TestBoundaryConditions:
    """边界条件测试"""

    def test_minimum_batch_size(self):
        """测试最小批次大小 (batch_size = 1)"""
        result = calculate_mfu(
            hardware=A100_80GB,
            model=LLAMA_7B,
            input_data={
                "first_token_latency_ms": 10.0,
                "tpot_ms": 1.0,
                "context_length": 1,
                "generated_length": 1,
                "batch_size": 1,
            }
        )
        assert result["mfu"] > 0

    def test_maximum_context_length(self):
        """测试最大上下文长度"""
        result = calculate_mfu(
            hardware=A100_80GB,
            model=LLAMA_7B,
            input_data={
                "first_token_latency_ms": 1000.0,
                "tpot_ms": 100.0,
                "context_length": 100000,
                "generated_length": 1000,
                "batch_size": 1,
            }
        )
        assert result["mfu"] > 0

    def test_large_batch_size(self):
        """测试大批次大小"""
        result = calculate_mfu(
            hardware=A100_80GB,
            model=LLAMA_7B,
            input_data={
                "first_token_latency_ms": 500.0,
                "tpot_ms": 50.0,
                "context_length": 2048,
                "generated_length": 128,
                "batch_size": 128,
            }
        )
        assert result["mfu"] > 0

    def test_zero_latency_handling(self):
        """测试零时延处理（应该报错或返回最大值）"""
        with pytest.raises(ValueError):
            calculate_mfu(
                hardware=A100_80GB,
                model=LLAMA_7B,
                input_data={
                    "first_token_latency_ms": 0,
                    "tpot_ms": 10.0,
                }
            )

    def test_negative_values_handling(self):
        """测试负值处理"""
        with pytest.raises(ValidationError):
            mfu_calculator.validate_input({"tpot_ms": -10.0})

    def test_very_small_tpot(self):
        """测试极小 TPOT"""
        result = calculate_mfu(
            hardware=H100,
            model=LLAMA_7B,
            input_data={
                "first_token_latency_ms": 1.0,
                "tpot_ms": 0.001,  # 极小值
            }
        )
        assert 0 <= result["mfu"] <= 100

    def test_very_large_tpot(self):
        """测试极大 TPOT"""
        result = calculate_mfu(
            hardware=A100_80GB,
            model=LLAMA_7B,
            input_data={
                "first_token_latency_ms": 10000.0,
                "tpot_ms": 10000.0,
            }
        )
        assert result["mfu"] < 1  # 应该是极低的 MFU
```

### 4.6 优化建议测试
```python
# tests/test_optimizer.py

class TestOptimizer:
    """优化建议引擎测试"""

    def test_compute_bottleneck_detection(self):
        """测试计算瓶颈检测"""
        result = {
            "mfu": 95.0,
            "memory_bandwidth_utilization": 30.0,
            "bottleneck_type": "compute",
        }
        suggestions = optimizer.generate_suggestions(result)

        assert any("计算" in s for s in suggestions)
        assert any("算力" in s.lower() or "硬件" in s for s in suggestions)

    def test_memory_bottleneck_detection(self):
        """测试访存瓶颈检测"""
        result = {
            "mfu": 20.0,
            "memory_bandwidth_utilization": 95.0,
            "bottleneck_type": "memory",
        }
        suggestions = optimizer.generate_suggestions(result)

        assert any("显存" in s or "带宽" in s for s in suggestions)

    def test_normal_operation_suggestions(self):
        """测试正常运行的建议"""
        result = {
            "mfu": 50.0,
            "memory_bandwidth_utilization": 50.0,
            "bottleneck_type": "balanced",
        }
        suggestions = optimizer.generate_suggestions(result)

        # 正常情况下应该没有严重警告
        assert len(suggestions) <= 2
```

---

## 5. 前端组件测试 (Jest)

### 5.1 计算表单测试
```typescript
// src/components/Calculator/__tests__/CalculatorForm.test.tsx

describe("CalculatorForm", () => {
  it("renders all input fields", () => {
    render(<CalculatorForm />);

    expect(screen.getByLabelText("硬件选择")).toBeInTheDocument();
    expect(screen.getByLabelText("模型选择")).toBeInTheDocument();
    expect(screen.getByLabelText("首Token时延")).toBeInTheDocument();
    expect(screen.getByLabelText("TPOT")).toBeInTheDocument();
    expect(screen.getByLabelText("上下文长度")).toBeInTheDocument();
    expect(screen.getByLabelText("生成长度")).toBeInTheDocument();
    expect(screen.getByLabelText("并发数")).toBeInTheDocument();
  });

  it("validates required fields", async () => {
    render(<CalculatorForm />);

    fireEvent.click(screen.getByText("开始计算"));

    await waitFor(() => {
      expect(screen.getByText("请选择硬件")).toBeInTheDocument();
      expect(screen.getByText("请选择模型")).toBeInTheDocument();
    });
  });

  it("shows validation error for negative values", async () => {
    render(<CalculatorForm />);

    const tpotInput = screen.getByLabelText("TPOT");
    fireEvent.change(tpotInput, { target: { value: "-10" } });

    fireEvent.click(screen.getByText("开始计算"));

    await waitFor(() => {
      expect(screen.getByText("值必须大于0")).toBeInTheDocument();
    });
  });

  it("calls API on form submission", async () => {
    const mockCalculate = jest.fn().mockResolvedValue({ mfu: 50.0 });
    jest.spyOn(api, "calculateMFU").mockImplementation(mockCalculate);

    render(<CalculatorForm />);

    // 填充表单...
    fireEvent.click(screen.getByText("开始计算"));

    await waitFor(() => {
      expect(mockCalculate).toHaveBeenCalled();
    });
  });
});
```

### 5.2 结果展示组件测试
```typescript
// src/components/Calculator/__tests__/ResultPanel.test.tsx

describe("ResultPanel", () => {
  it("displays MFU value correctly", () => {
    render(<ResultPanel mfu={75.5} bandwidth={45.2} />);

    expect(screen.getByText("75.5%")).toBeInTheDocument();
    expect(screen.getByText("45.2%")).toBeInTheDocument();
  });

  it("shows bottleneck type", () => {
    render(<ResultPanel bottleneckType="compute" />);

    expect(screen.getByText("计算受限")).toBeInTheDocument();
  });

  it("displays optimization suggestions", () => {
    const suggestions = ["建议使用更高算力硬件", "考虑启用 Tensor Core"];
    render(<ResultPanel suggestions={suggestions} />);

    expect(screen.getByText("建议使用更高算力硬件")).toBeInTheDocument();
  });
});
```

### 5.3 主题切换测试
```typescript
// src/hooks/__tests__/useTheme.test.ts

describe("useTheme", () => {
  it("toggles between light and dark theme", () => {
    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("light");

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe("dark");
  });

  it("persists theme preference", () => {
    localStorage.setItem("theme", "dark");

    const { result } = renderHook(() => useTheme());

    expect(result.current.theme).toBe("dark");
  });
});
```

---

## 6. E2E 测试 (Playwright)

### 6.1 计算完整流程测试
```typescript
// tests/e2e/calculation.spec.ts

import { test, expect } from "@playwright/test";

test.describe("MFU Calculation Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("complete calculation flow", async ({ page }) => {
    // 1. 选择硬件
    await page.selectOption("#hardware-select", "NVIDIA A100 80GB");

    // 2. 选择模型
    await page.selectOption("#model-select", "llama-2-7b");

    // 3. 输入时延信息
    await page.fill("#first-token-latency", "50");
    await page.fill("#tpot", "10");

    // 4. 输入上下文信息
    await page.fill("#context-length", "2048");
    await page.fill("#generated-length", "128");

    // 5. 输入并发数
    await page.fill("#batch-size", "1");

    // 6. 选择精度
    await page.click('label:has-text("FP16")');

    // 7. 点击计算
    await page.click("text=开始计算");

    // 8. 验证结果显示
    await expect(page.locator("#mfu-result")).toBeVisible();
    await expect(page.locator("#bandwidth-result")).toBeVisible();

    // 9. 验证优化建议
    await expect(page.locator("#optimization-suggestions")).toBeVisible();
  });

  test("add result to comparison", async ({ page }) => {
    // 执行计算
    await performCalculation(page);

    // 添加到对比
    await page.click("text=添加到对比");

    // 验证对比列表
    await expect(page.locator("#comparison-table")).toContainText("NVIDIA A100 80GB");
  });
});
```

### 6.2 硬件管理测试
```typescript
// tests/e2e/hardware-management.spec.ts

test.describe("Hardware Management", () => {
  test("import hardware from Excel", async ({ page }) => {
    await page.goto("/management");
    await page.click("text=硬件管理");

    // 点击导入
    await page.click("text=导入Excel");

    // 上传文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles("tests/fixtures/hardware_template.xlsx");

    // 验证导入成功
    await expect(page.locator(".ant-message-success")).toBeVisible();

    // 验证数据展示
    await expect(page.locator("text=NVIDIA A100 80GB")).toBeVisible();
  });

  test("delete hardware", async ({ page }) => {
    await page.goto("/management");
    await page.click("text=硬件管理");

    // 点击删除
    await page.click('button:has-text("删除"):near(div:has-text("Test GPU"))');

    // 确认删除
    await page.click("text=确认");

    // 验证删除成功
    await expect(page.locator("text=Test GPU")).not.toBeVisible();
  });
});
```

### 6.3 模型管理测试
```typescript
// tests/e2e/model-management.spec.ts

test.describe("Model Management", () => {
  test("add model from Hugging Face", async ({ page }) => {
    await page.goto("/management");
    await page.click("text=模型管理");

    // 点击添加
    await page.click("text=从 Hugging Face 添加");

    // 输入模型 ID
    await page.fill("#hf-id-input", "TinyLlama/TinyLlama-1.1B-Chat-v1.0");

    // 点击获取预览
    await page.click("text=获取预览");

    // 验证预览信息
    await expect(page.locator("#model-preview")).toBeVisible();

    // 保存
    await page.click("text=保存");

    // 验证保存成功
    await expect(page.locator("text=TinyLlama")).toBeVisible();
  });
});
```

### 6.4 主题切换测试
```typescript
// tests/e2e/theme.spec.ts

test.describe("Theme Switching", () => {
  test("switch to dark theme", async ({ page }) => {
    await page.goto("/");

    // 点击主题切换
    await page.click("#theme-toggle");

    // 验证深色主题
    await expect(page.locator("html")).toHaveClass(/dark/);
  });
});
```

---

## 7. 测试运行命令

### 7.1 后端测试
```bash
# 运行所有测试
pytest

# 运行特定模块测试
pytest tests/test_mfu_calculator.py

# 运行并生成覆盖率报告
pytest --cov=app --cov-report=html

# 运行边界测试
pytest tests/test_boundary.py -v
```

### 7.2 前端测试
```bash
# 运行所有测试
npm test

# 运行并生成覆盖率报告
npm test -- --coverage

# 监听模式
npm test -- --watch

# 运行 E2E 测试
npx playwright test
```

---

## 8. 测试检查清单

### 8.1 功能测试清单
- [ ] 硬件创建、读取、更新、删除
- [ ] 模型创建、读取、更新、删除
- [ ] Hugging Face 模型获取
- [ ] Excel 硬件导入
- [ ] MFU 计算（多精度）
- [ ] 显存带宽计算
- [ ] 优化建议生成
- [ ] 结果对比功能
- [ ] 主题切换
- [ ] 响应式布局

### 8.2 边界测试清单
- [ ] batch_size = 1 (最小值)
- [ ] batch_size = 100+ (大批次)
- [ ] context_length = 1 (最小值)
- [ ] context_length = 100000+ (长上下文)
- [ ] generated_length = 1 (最小值)
- [ ] tpot = 0.001 (极小值)
- [ ] tpot = 10000 (极大值)
- [ ] 负值输入处理
- [ ] 空值输入处理
- [ ] 精度选择切换

### 8.3 验证测试清单
- [ ] Prefill FLOPs 公式正确性
- [ ] Decode FLOPs 公式正确性
- [ ] KV Cache 计算正确性
- [ ] MFU 百分比计算正确性
- [ ] 带宽使用率计算正确性
- [ ] 瓶颈类型判断正确性
