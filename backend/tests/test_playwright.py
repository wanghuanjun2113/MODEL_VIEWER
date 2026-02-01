"""Playwright 浏览器 E2E 测试

测试场景：
1. API 文档页面 (Swagger UI)
2. 健康检查页面
3. 硬件管理 API 测试
4. 模型管理 API 测试
5. MFU 计算 API 测试

注意：需要先启动后端服务器
"""

import pytest


@pytest.fixture(scope="session")
def live_server_url():
    """返回服务器 URL"""
    return "http://localhost:8080"


class TestAPIDocumentation:
    """API 文档页面测试"""

    def test_swagger_ui_loads(self, page, live_server_url):
        """测试 Swagger UI 页面加载"""
        response = page.goto(f"{live_server_url}/docs")
        assert response.status == 200

        # 验证 Swagger UI 标题
        assert "Swagger" in page.title() or "API" in page.title()

    def test_re_docs_loads(self, page, live_server_url):
        """测试 ReDoc 页面加载"""
        response = page.goto(f"{live_server_url}/redoc")
        assert response.status == 200

    def test_health_endpoint_via_browser(self, page, live_server_url):
        """测试健康检查端点 (通过浏览器访问)"""
        response = page.goto(f"{live_server_url}/health")
        assert response.status == 200


class TestHardwareManagementBrowser:
    """硬件管理浏览器测试 (通过 Swagger UI)"""

    def test_swagger_hardware_endpoint_exists(self, page, live_server_url):
        """测试 Swagger UI 中硬件端点存在"""
        page.goto(f"{live_server_url}/docs")

        # 查找硬件相关的端点
        swagger_op = page.get_by_text("Hardware").first
        assert swagger_op.is_visible()


class TestModelManagementBrowser:
    """模型管理浏览器测试"""

    def test_swagger_model_endpoint_exists(self, page, live_server_url):
        """测试 Swagger UI 中模型端点存在"""
        page.goto(f"{live_server_url}/docs")

        # 查找模型相关的端点
        swagger_op = page.get_by_text("Model").first
        assert swagger_op.is_visible()


class TestMFUCalculationBrowser:
    """MFU 计算浏览器测试"""

    def test_swagger_calculation_endpoint_exists(self, page, live_server_url):
        """测试 Swagger UI 中计算端点存在"""
        page.goto(f"{live_server_url}/docs")

        # 查找计算相关的端点
        swagger_op = page.get_by_text("Calculation").first
        assert swagger_op.is_visible()

    def test_root_page_shows_info(self, page, live_server_url):
        """测试根页面显示应用信息"""
        page.goto(f"{live_server_url}/")

        # 验证页面内容
        content = page.content()
        assert "MFU" in content or "mfu" in content.lower() or "calculator" in content.lower()


class TestBottleneckDetectionBrowser:
    """瓶颈检测浏览器测试"""

    def test_bottleneck_description_page(self, page, live_server_url):
        """测试瓶颈描述页面"""
        page.goto(f"{live_server_url}/redoc")

        # ReDoc 应该加载
        page.wait_for_load_state("networkidle")


class TestPageNavigation:
    """页面导航测试"""

    def test_navigation_between_pages(self, page, live_server_url):
        """测试页面间导航"""
        # 访问根页面
        response = page.goto(f"{live_server_url}/")
        assert response.status == 200

        # 访问 Swagger 文档
        response = page.goto(f"{live_server_url}/docs")
        assert response.status == 200

        # 访问 ReDoc
        response = page.goto(f"{live_server_url}/redoc")
        assert response.status == 200

    def test_page_load_performance(self, page, live_server_url):
        """测试页面加载性能"""
        import time

        # 测试根页面加载时间
        start = time.time()
        page.goto(f"{live_server_url}/")
        elapsed = time.time() - start

        # 页面应在 3 秒内加载完成
        assert elapsed < 3.0


class TestErrorPages:
    """错误页面测试"""

    def test_404_page(self, page, live_server_url):
        """测试 404 页面"""
        page.goto(f"{live_server_url}/nonexistent-page")

        # 应该返回 404 状态码
        response = page.goto(f"{live_server_url}/api/v1/hardware/99999")
        assert response.status == 404


class TestAPIAccessibility:
    """API 可访问性测试"""

    def test_api_endpoints_accessible_via_fetch(self, page, live_server_url):
        """测试 API 端点可通过 fetch 访问"""
        page.goto(f"{live_server_url}/")

        # 使用 JavaScript 检查 API 是否可访问
        result = page.evaluate("""
            async () => {
                try {
                    const response = await fetch('/health');
                    const data = await response.json();
                    return { status: response.status, data };
                } catch (e) {
                    return { error: e.message };
                }
            }
        """)

        assert result["status"] == 200
        assert result["data"]["status"] == "healthy"

    def test_hardware_list_via_fetch(self, page, live_server_url):
        """测试获取硬件列表 (通过 fetch)"""
        page.goto(f"{live_server_url}/")

        result = page.evaluate("""
            async () => {
                try {
                    const response = await fetch('/api/v1/hardware');
                    const data = await response.json();
                    return { status: response.status, count: data.length };
                } catch (e) {
                    return { error: e.message };
                }
            }
        """)

        assert result["status"] == 200
        assert "count" in result


class TestModelAPI:
    """模型 API 测试 (通过浏览器 fetch)"""

    def test_get_model_list(self, page, live_server_url):
        """测试获取模型列表"""
        page.goto(f"{live_server_url}/")

        result = page.evaluate("""
            async () => {
                try {
                    const response = await fetch('/api/v1/models');
                    const data = await response.json();
                    return { status: response.status, count: data.length, hasData: data.length > 0 };
                } catch (e) {
                    return { error: e.message };
                }
            }
        """)

        assert result["status"] == 200
        assert "count" in result
        assert result["hasData"] is True  # 应该有预设数据

    def test_model_endpoint_exists(self, page, live_server_url):
        """测试模型 API 端点存在"""
        page.goto(f"{live_server_url}/docs")

        # 查找模型相关的端点
        swagger_op = page.get_by_text("Model").first
        assert swagger_op.is_visible()


class TestHardwareAPI:
    """硬件 API 测试 (通过浏览器 fetch)"""

    def test_get_hardware_list(self, page, live_server_url):
        """测试获取硬件列表"""
        page.goto(f"{live_server_url}/")

        result = page.evaluate("""
            async () => {
                try {
                    const response = await fetch('/api/v1/hardware');
                    const data = await response.json();
                    return { status: response.status, count: data.length, hasData: data.length > 0 };
                } catch (e) {
                    return { error: e.message };
                }
            }
        """)

        assert result["status"] == 200
        assert "count" in result
        assert result["hasData"] is True  # 应该有预设数据

    def test_hardware_endpoint_exists(self, page, live_server_url):
        """测试硬件 API 端点存在"""
        page.goto(f"{live_server_url}/docs")

        # 查找硬件相关的端点
        swagger_op = page.get_by_text("Hardware").first
        assert swagger_op.is_visible()
