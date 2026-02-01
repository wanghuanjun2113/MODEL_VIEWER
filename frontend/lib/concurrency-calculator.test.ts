/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { calculateMaxConcurrency, calculateMemoryWithConcurrency } from "./concurrency-calculator";
import type { Hardware, Model, ConcurrencyInput, ConcurrencyResult } from "./types";

describe("Concurrency Calculator", () => {
  const mockHardware: Hardware = {
    id: "1",
    name: "NVIDIA A100 80GB",
    fp16_peak_tflops: 312,
    bf16_peak_tflops: 312,
    fp32_peak_tflops: 156,
    memory_size_gb: 80,
    memory_bandwidth_tbps: 2.039,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockModel: Model = {
    id: "1",
    name: "Llama 2 7B",
    huggingface_id: "meta-llama/Llama-2-7b-hf",
    params_billions: 7,
    num_layers: 32,
    hidden_size: 4096,
    num_attention_heads: 32,
    num_key_value_heads: 32,
    vocab_size: 32000,
    intermediate_size: 11008,
    head_dim: 128,
    max_position_embeddings: 4096,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const baseInput: ConcurrencyInput = {
    hardware_id: "1",
    model_id: "1",
    gpu_count: 1,
    context_length: 4096,
    precision: "FP16",
    framework_overhead_gb: 2,
  };

  describe("calculateMaxConcurrency", () => {
    it("should calculate max concurrency correctly", () => {
      const result = calculateMaxConcurrency(baseInput, mockHardware, mockModel);

      expect(result.gpu_count).toBe(1);
      expect(result.max_concurrency_without_pa).toBeGreaterThanOrEqual(0);
      expect(result.max_concurrency_with_pa).toBeGreaterThanOrEqual(0);
      expect(result.hardware_memory_gb).toBe(mockHardware.memory_size_gb);
      expect(result.available_memory_gb).toBe(mockHardware.memory_size_gb - baseInput.framework_overhead_gb);
    });

    it("should include memory breakdown", () => {
      const result = calculateMaxConcurrency(baseInput, mockHardware, mockModel);

      expect(result.memory_breakdown).toBeDefined();
      expect(result.memory_breakdown.weight_memory_gb).toBeGreaterThan(0);
      expect(result.memory_breakdown.framework_overhead_gb).toBe(baseInput.framework_overhead_gb);
      expect(result.memory_breakdown.kv_cache_memory_gb).toBeGreaterThan(0);
      expect(result.memory_breakdown.activation_memory_gb).toBeGreaterThan(0);
      expect(result.memory_breakdown.total_memory_gb).toBeGreaterThan(0);
    });

    it("should have higher concurrency with Paged Attention", () => {
      // Use larger context to make KV cache savings more significant
      const largeContextInput = { ...baseInput, context_length: 8192 };
      const result = calculateMaxConcurrency(largeContextInput, mockHardware, mockModel);

      // Paged Attention should allow higher or equal concurrency
      expect(result.max_concurrency_with_pa).toBeGreaterThanOrEqual(result.max_concurrency_without_pa);
    });

    it("should calculate correct weight memory for FP16", () => {
      const result = calculateMaxConcurrency(baseInput, mockHardware, mockModel);

      // 7B model in FP16 = approximately 13-14GB
      expect(result.memory_breakdown.weight_memory_gb).toBeGreaterThan(13);
      expect(result.memory_breakdown.weight_memory_gb).toBeLessThan(15);
    });

    it("should calculate correct weight memory for INT8", () => {
      const int8Input = { ...baseInput, precision: "INT8" as const };
      const result = calculateMaxConcurrency(int8Input, mockHardware, mockModel);

      // 7B model in INT8 = approximately 6.5-7GB
      expect(result.memory_breakdown.weight_memory_gb).toBeGreaterThan(6);
      expect(result.memory_breakdown.weight_memory_gb).toBeLessThan(8);
    });

    it("should calculate correct weight memory for FP32", () => {
      const fp32Input = { ...baseInput, precision: "FP32" as const };
      const result = calculateMaxConcurrency(fp32Input, mockHardware, mockModel);

      // 7B model in FP32 = approximately 26-28GB
      expect(result.memory_breakdown.weight_memory_gb).toBeGreaterThan(26);
      expect(result.memory_breakdown.weight_memory_gb).toBeLessThan(30);
    });
  });

  describe("Multi-GPU concurrency calculations", () => {
    it("should increase available memory with GPU count", () => {
      const singleGPU = { ...baseInput, gpu_count: 1 };
      const eightGPU = { ...baseInput, gpu_count: 8 };

      const singleResult = calculateMaxConcurrency(singleGPU, mockHardware, mockModel);
      const eightResult = calculateMaxConcurrency(eightGPU, mockHardware, mockModel);

      // 8 GPU should have 8x hardware memory
      expect(eightResult.hardware_memory_gb).toBe(singleResult.hardware_memory_gb * 8);

      // 8 GPU should have 8x available memory minus fixed framework overhead
      // Single: 80 - 2 = 78
      // 8 GPU: 80*8 - 2 = 638
      expect(eightResult.available_memory_gb).toBe(638);
    });

    it("should increase max concurrency with GPU count", () => {
      const gpuCounts = [1, 2, 4, 8];
      let prevConcurrency = 0;

      for (const gpuCount of gpuCounts) {
        const input = { ...baseInput, gpu_count: gpuCount };
        const result = calculateMaxConcurrency(input, mockHardware, mockModel);

        // Max concurrency should increase with GPU count
        expect(result.max_concurrency_without_pa).toBeGreaterThanOrEqual(prevConcurrency);
        prevConcurrency = result.max_concurrency_without_pa;
      }
    });

    it("should handle all GPU count options", () => {
      const gpuCounts = [1, 2, 4, 8, 16, 32];

      for (const gpuCount of gpuCounts) {
        const input = { ...baseInput, gpu_count: gpuCount };
        const result = calculateMaxConcurrency(input, mockHardware, mockModel);

        expect(result.gpu_count).toBe(gpuCount);
        expect(result.hardware_memory_gb).toBe(mockHardware.memory_size_gb * gpuCount);
      }
    });

    it("should scale memory breakdown correctly", () => {
      const singleGPU = { ...baseInput, gpu_count: 1 };
      const eightGPU = { ...baseInput, gpu_count: 8 };

      const singleResult = calculateMaxConcurrency(singleGPU, mockHardware, mockModel);
      const eightResult = calculateMaxConcurrency(eightGPU, mockHardware, mockModel);

      // Weight and framework overhead are per-GPU, but concurrency distributes across all GPUs
      // So the memory breakdown per request should remain the same
      expect(eightResult.memory_breakdown.weight_memory_gb).toBe(singleResult.memory_breakdown.weight_memory_gb);
      expect(eightResult.memory_breakdown.framework_overhead_gb).toBe(singleResult.memory_breakdown.framework_overhead_gb);
    });
  });

  describe("calculateMemoryWithConcurrency", () => {
    it("should calculate memory for specific concurrency level", () => {
      const result = calculateMaxConcurrency(baseInput, mockHardware, mockModel);
      const concurrency = 4;

      const memory = calculateMemoryWithConcurrency(result, concurrency);

      expect(memory.kv_cache_memory_gb).toBe(result.memory_breakdown.kv_cache_memory_gb * concurrency);
      expect(memory.activation_memory_gb).toBe(result.memory_breakdown.activation_memory_gb * concurrency);
      expect(memory.total_memory_gb).toBe(
        result.memory_breakdown.weight_memory_gb +
        result.memory_breakdown.framework_overhead_gb +
        result.memory_breakdown.kv_cache_memory_gb * concurrency +
        result.memory_breakdown.activation_memory_gb * concurrency
      );
    });

    it("should handle zero concurrency", () => {
      const result = calculateMaxConcurrency(baseInput, mockHardware, mockModel);
      const memory = calculateMemoryWithConcurrency(result, 0);

      expect(memory.kv_cache_memory_gb).toBe(0);
      expect(memory.activation_memory_gb).toBe(0);
    });

    it("should handle single concurrency", () => {
      const result = calculateMaxConcurrency(baseInput, mockHardware, mockModel);
      const memory = calculateMemoryWithConcurrency(result, 1);

      expect(memory).toEqual(result.memory_breakdown);
    });
  });

  describe("Edge cases", () => {
    it("should handle zero framework overhead", () => {
      const input = { ...baseInput, framework_overhead_gb: 0 };
      const result = calculateMaxConcurrency(input, mockHardware, mockModel);

      expect(result.available_memory_gb).toBe(mockHardware.memory_size_gb);
      expect(result.memory_breakdown.framework_overhead_gb).toBe(0);
    });

    it("should handle small context length", () => {
      const input = { ...baseInput, context_length: 1 };
      const result = calculateMaxConcurrency(input, mockHardware, mockModel);

      expect(result.max_concurrency_without_pa).toBeGreaterThan(0);
      expect(result.memory_breakdown.kv_cache_memory_gb).toBeGreaterThan(0);
    });

    it("should handle very large context length", () => {
      const input = { ...baseInput, context_length: 32768 };
      const result = calculateMaxConcurrency(input, mockHardware, mockModel);

      // With large context, KV cache is large, concurrency should be low or zero
      expect(result.memory_breakdown.kv_cache_memory_gb).toBeGreaterThan(0);
    });

    it("should handle framework overhead larger than GPU memory", () => {
      const input = { ...baseInput, framework_overhead_gb: 100 };
      const result = calculateMaxConcurrency(input, mockHardware, mockModel);

      // Available memory would be negative, but we clamp to 0
      expect(result.available_memory_gb).toBe(0);
      expect(result.max_concurrency_without_pa).toBe(0);
      expect(result.max_concurrency_with_pa).toBe(0);
    });
  });
});
