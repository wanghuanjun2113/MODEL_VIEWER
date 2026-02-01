"""优化建议引擎测试"""

import pytest
from app.services.optimizer import OptimizationEngine, get_optimization_suggestions


class TestOptimizationEngine:
    """优化建议引擎测试"""

    @pytest.fixture
    def engine(self):
        """创建优化引擎实例"""
        return OptimizationEngine()

    def test_compute_bottleneck_suggestions(self, engine):
        """测试计算瓶颈建议"""
        # 使用较低的 mfu 来触发 Hardware Upgrade 建议
        mfu = 40.0
        bandwidth_utilization = 30.0
        bottleneck_type = "compute"

        suggestions = engine.generate_suggestions(
            mfu, bandwidth_utilization, None, None, bottleneck_type
        )

        assert len(suggestions) > 0
        # mfu < 50 时会有 Precision Optimization 建议
        assert any(s.category == "Precision Optimization" for s in suggestions)

    def test_compute_bottleneck_very_low_mfu(self, engine):
        """测试极低 MFU 的计算瓶颈建议"""
        suggestions = engine.generate_suggestions(
            mfu=20.0,
            bandwidth_utilization=30.0,
            bottleneck_type="compute",
        )

        # 应该有高优先级建议
        high_priority = [s for s in suggestions if s.priority == "high"]
        assert len(high_priority) >= 2

    def test_memory_bottleneck_suggestions(self, engine):
        """测试访存瓶颈建议"""
        mfu = 20.0
        bandwidth_utilization = 95.0  # 使用 >90 来触发 Batch Optimization
        bottleneck_type = "memory"

        suggestions = engine.generate_suggestions(
            mfu, bandwidth_utilization, None, None, bottleneck_type
        )

        assert len(suggestions) > 0
        assert any(s.category == "Batch Optimization" for s in suggestions)

    def test_memory_bottleneck_very_high_bandwidth(self, engine):
        """测试极高带宽使用率的建议"""
        suggestions = engine.generate_suggestions(
            mfu=20.0,
            bandwidth_utilization=95.0,
            bottleneck_type="memory",
        )

        # 应该有高优先级建议
        high_priority = [s for s in suggestions if s.priority == "high"]
        assert len(high_priority) >= 2

    def test_balanced_suggestions(self, engine):
        """测试平衡状态建议"""
        suggestions = engine.generate_suggestions(
            mfu=50.0,
            bandwidth_utilization=50.0,
            bottleneck_type="balanced",
        )

        assert len(suggestions) > 0
        # 平衡状态下应该没有高优先级建议
        high_priority = [s for s in suggestions if s.priority == "high"]
        assert len(high_priority) == 0

    def test_get_bottleneck_description(self, engine):
        """测试瓶颈描述获取"""
        assert "计算" in engine.get_bottleneck_description("compute")
        assert "显存" in engine.get_bottleneck_description("memory")
        assert "平衡" in engine.get_bottleneck_description("balanced")

    def test_suggestion_structure(self, engine):
        """测试建议结构"""
        suggestions = engine.generate_suggestions(
            mfu=80.0,
            bandwidth_utilization=30.0,
            bottleneck_type="compute",
        )

        for suggestion in suggestions:
            assert hasattr(suggestion, "category")
            assert hasattr(suggestion, "priority")
            assert hasattr(suggestion, "suggestion")
            assert hasattr(suggestion, "impact")
            assert suggestion.priority in ["high", "medium", "low"]

    def test_hardware_info_in_suggestions(self, engine):
        """测试硬件信息对建议的影响"""
        hardware_info = {"fp16_peak_tflops": 4000.0}  # H100

        suggestions = engine.generate_suggestions(
            mfu=20.0,
            bandwidth_utilization=30.0,
            hardware_info=hardware_info,
            bottleneck_type="compute",
        )

        # 应该包含批处理优化建议
        batch_suggestions = [s for s in suggestions if "批处理" in s.suggestion]
        assert len(batch_suggestions) > 0

    def test_model_info_in_suggestions(self, engine):
        """测试模型信息对建议的影响"""
        model_info = {"num_layers": 80}  # 70B 模型

        suggestions = engine.generate_suggestions(
            mfu=80.0,
            bandwidth_utilization=30.0,
            model_info=model_info,
            bottleneck_type="compute",
        )

        # 应该包含模型优化建议
        model_suggestions = [s for s in suggestions if "Model Optimization" in s.category]
        assert len(model_suggestions) > 0


class TestGetOptimizationSuggestions:
    """便捷函数测试"""

    def test_get_suggestions_returns_dicts(self):
        """测试返回字典列表"""
        suggestions = get_optimization_suggestions(
            mfu=80.0,
            bandwidth_utilization=30.0,
            bottleneck_type="compute",
        )

        assert isinstance(suggestions, list)
        for s in suggestions:
            assert isinstance(s, dict)
            assert "category" in s
            assert "priority" in s
            assert "suggestion" in s
            assert "impact" in s
