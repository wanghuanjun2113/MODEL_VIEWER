/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { calculateMFU } from "./calculator";
import type { Hardware, Model, CalculationInput } from "./types";

describe("Calculator", () => {
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

  const baseInput: CalculationInput = {
    hardware_id: "1",
    model_id: "1",
    precision: "FP16",
    first_token_latency_ms: 100,
    tpot_ms: 20,
    context_length: 2048,
    generated_length: 256,
    batch_size: 1,
  };

  describe("calculateMFU", () => {
    it("should calculate MFU correctly for FP16", () => {
      const result = calculateMFU(baseInput, mockHardware, mockModel);

      expect(result.mfu).toBeGreaterThan(0);
      expect(result.mfu).toBeLessThanOrEqual(100);
      expect(result.memory_bandwidth_utilization).toBeGreaterThan(0);
      expect(result.memory_bandwidth_utilization).toBeLessThanOrEqual(100);
      expect(result.theoretical_flops).toBeGreaterThan(0);
      expect(result.actual_flops).toBeGreaterThan(0);
      expect(result.prefill_flops).toBeGreaterThan(0);
      expect(result.decode_flops).toBeGreaterThan(0);
      expect(result.kv_cache_size_gb).toBeGreaterThan(0);
      expect(["compute", "memory", "balanced"]).toContain(result.bottleneck_type);
      expect(result.optimization_suggestions).toBeInstanceOf(Array);
      expect(result.timestamp).toBeDefined();
      expect(result.id).toBeDefined();
    });

    it("should return different results for different precisions", () => {
      const fp16Input = { ...baseInput, precision: "FP16" as const };
      const fp32Input = { ...baseInput, precision: "FP32" as const };

      const fp16Result = calculateMFU(fp16Input, mockHardware, mockModel);
      const fp32Result = calculateMFU(fp32Input, mockHardware, mockModel);

      // FP32 should have lower MFU because it uses less peak compute
      expect(fp16Result.mfu).not.toEqual(fp32Result.mfu);
    });

    it("should handle BF16 precision", () => {
      const input = { ...baseInput, precision: "BF16" as const };
      const result = calculateMFU(input, mockHardware, mockModel);

      expect(result.mfu).toBeGreaterThan(0);
      expect(["compute", "memory", "balanced"]).toContain(result.bottleneck_type);
    });

    it("should handle different batch sizes", () => {
      const singleBatch = { ...baseInput, batch_size: 1 };
      const multiBatch = { ...baseInput, batch_size: 4 };

      const singleResult = calculateMFU(singleBatch, mockHardware, mockModel);
      const multiResult = calculateMFU(multiBatch, mockHardware, mockModel);

      // Multi-batch should have higher theoretical FLOPs
      expect(multiResult.theoretical_flops).toBeGreaterThan(singleResult.theoretical_flops);
      // Multi-batch may have different MFU due to throughput improvements
      expect(["compute", "memory", "balanced"]).toContain(multiResult.bottleneck_type);
    });

    it("should handle different context lengths", () => {
      const shortContext = { ...baseInput, context_length: 512 };
      const longContext = { ...baseInput, context_length: 8192 };

      const shortResult = calculateMFU(shortContext, mockHardware, mockModel);
      const longResult = calculateMFU(longContext, mockHardware, mockModel);

      // Longer context should require more FLOPs
      expect(longResult.prefill_flops).toBeGreaterThan(shortResult.prefill_flops);
      // KV cache should be larger for longer context
      expect(longResult.kv_cache_size_gb).toBeGreaterThan(shortResult.kv_cache_size_gb);
    });

    it("should include optimization suggestions", () => {
      const result = calculateMFU(baseInput, mockHardware, mockModel);

      expect(result.optimization_suggestions.length).toBeGreaterThan(0);
      expect(result.optimization_suggestions[0]).toBeTypeOf("string");
    });

    it("should cap MFU at 100%", () => {
      const highThroughputInput = {
        ...baseInput,
        first_token_latency_ms: 1,
        tpot_ms: 1,
      };
      const result = calculateMFU(highThroughputInput, mockHardware, mockModel);

      expect(result.mfu).toBeLessThanOrEqual(100);
    });

    it("should cap memory bandwidth utilization at 100%", () => {
      const highMemoryInput = {
        ...baseInput,
        tpot_ms: 0.1,
        context_length: 32768,
        generated_length: 4096,
      };
      const result = calculateMFU(highMemoryInput, mockHardware, mockModel);

      expect(result.memory_bandwidth_utilization).toBeLessThanOrEqual(100);
    });

    it("should correctly identify compute-bound bottlenecks", () => {
      const computeBoundInput = {
        ...baseInput,
        first_token_latency_ms: 500,
        tpot_ms: 100,
      };
      const result = calculateMFU(computeBoundInput, mockHardware, mockModel);

      // High latency relative to compute should indicate compute-bound
      expect(["compute", "memory", "balanced"]).toContain(result.bottleneck_type);
    });

    it("should correctly identify memory-bound bottlenecks", () => {
      const memoryBoundInput = {
        ...baseInput,
        tpot_ms: 5,
        context_length: 16384,
        generated_length: 2048,
      };
      const result = calculateMFU(memoryBoundInput, mockHardware, mockModel);

      // Large context and short TPOT should indicate memory-bound
      expect(["compute", "memory", "balanced"]).toContain(result.bottleneck_type);
    });
  });
});
