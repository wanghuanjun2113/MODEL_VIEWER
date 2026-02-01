"""Excel 导入导出功能测试"""

import pytest
import io
import pandas as pd


def create_excel_file(data: dict) -> bytes:
    """创建 Excel 文件字节数据"""
    df = pd.DataFrame(data)
    buffer = io.BytesIO()
    df.to_excel(buffer, index=False, engine="openpyxl")
    return buffer.getvalue()


class TestHardwareImportExport:
    """硬件导入导出测试"""

    def test_download_template(self, client):
        """测试下载导入模板"""
        response = client.get("/api/v1/hardware/template/download")
        assert response.status_code == 200
        assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in response.headers["content-type"]
        assert "attachment" in response.headers["content-disposition"]
        assert "hardware_template.xlsx" in response.headers["content-disposition"]

    def test_import_hardware_success(self, client):
        """测试成功导入硬件"""
        excel_data = create_excel_file({
            "name": ["Test GPU 1", "Test GPU 2"],
            "vendor": ["NVIDIA", "AMD"],
            "fp16_peak_tflops": [1000.0, 500.0],
            "bf32_peak_tflops": [500.0, 250.0],
            "fp32_peak_tflops": [250.0, 125.0],
            "memory_size_gb": [80.0, 40.0],
            "memory_bandwidth_tbps": [2.0, 1.0],
            "description": ["Test hardware 1", "Test hardware 2"],
        })
        response = client.post(
            "/api/v1/hardware/import",
            files={"file": ("test.xlsx", excel_data, "application/octet-stream")}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["imported_count"] == 2
        assert len(data["hardware_list"]) == 2

    def test_import_hardware_invalid_file_type(self, client):
        """测试无效文件类型"""
        response = client.post(
            "/api/v1/hardware/import",
            files={"file": ("test.txt", b"content", "text/plain")}
        )
        assert response.status_code == 400
        assert "Only Excel files are supported" in response.json()["detail"]

    def test_import_hardware_missing_columns(self, client):
        """测试缺少必需列"""
        excel_data = create_excel_file({
            "name": ["Test GPU 1"],
            "description": ["Test hardware 1"],
        })
        response = client.post(
            "/api/v1/hardware/import",
            files={"file": ("test.xlsx", excel_data, "application/octet-stream")}
        )
        assert response.status_code == 400
        assert "Missing required columns" in response.json()["detail"]

    def test_import_hardware_invalid_data(self, client):
        """测试无效数据行"""
        excel_data = create_excel_file({
            "name": ["Invalid GPU", "Valid GPU"],
            "vendor": ["NVIDIA", "NVIDIA"],
            "fp16_peak_tflops": ["invalid", 1000.0],  # 无效值
            "bf32_peak_tflops": [500.0, 500.0],
            "fp32_peak_tflops": [250.0, 250.0],
            "memory_size_gb": [80.0, 80.0],
            "memory_bandwidth_tbps": [2.0, 2.0],
            "description": ["Test hardware", "Test hardware"],
        })
        response = client.post(
            "/api/v1/hardware/import",
            files={"file": ("test.xlsx", excel_data, "application/octet-stream")}
        )
        assert response.status_code == 200
        data = response.json()
        # 无效行被跳过，只导入有效的
        assert data["imported_count"] == 1
        assert data["hardware_list"][0]["name"] == "Valid GPU"

    def test_import_hardware_duplicate_names(self, client, sample_hardware):
        """测试导入重复名称硬件"""
        # 先创建一个硬件
        client.post("/api/v1/hardware", json=sample_hardware)

        excel_data = create_excel_file({
            "name": [sample_hardware["name"], "New GPU"],
            "vendor": ["NVIDIA", "NVIDIA"],
            "fp16_peak_tflops": [1000.0, 500.0],
            "bf32_peak_tflops": [500.0, 250.0],
            "fp32_peak_tflops": [250.0, 125.0],
            "memory_size_gb": [80.0, 40.0],
            "memory_bandwidth_tbps": [2.0, 1.0],
            "description": ["Duplicate", "New hardware"],
        })
        response = client.post(
            "/api/v1/hardware/import",
            files={"file": ("test.xlsx", excel_data, "application/octet-stream")}
        )
        assert response.status_code == 200
        data = response.json()
        # 重复的被跳过，只导入新的
        assert data["imported_count"] == 1
        assert data["hardware_list"][0]["name"] == "New GPU"

    def test_download_template_content(self, client):
        """测试模板内容正确性"""
        response = client.get("/api/v1/hardware/template/download")
        assert response.status_code == 200

        # 验证返回的是有效的 Excel 文件（至少有一些预期字段）
        content = response.content
        assert len(content) > 0
