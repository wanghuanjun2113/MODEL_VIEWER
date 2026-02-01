/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient, toBackendHardware, toBackendModel, toFrontendHardware, toFrontendModel } from "./api";

describe("API Service", () => {
  describe("toBackendHardware", () => {
    it("should convert frontend hardware to backend format", () => {
      const frontend = {
        name: "NVIDIA A100 80GB",
        fp16_peak_tflops: 312,
        bf16_peak_tflops: 312,
        fp32_peak_tflops: 156,
        memory_size_gb: 80,
        memory_bandwidth_tbps: 2.039,
      };

      const backend = toBackendHardware(frontend);

      expect(backend).toEqual({
        name: "NVIDIA A100 80GB",
        vendor: "",
        fp16_peak_tflops: 312,
        bf32_peak_tflops: 312,
        fp32_peak_tflops: 156,
        memory_size_gb: 80,
        memory_bandwidth_tbps: 2.039,
        description: "",
      });
    });
  });

  describe("toBackendModel", () => {
    it("should convert frontend model to backend format", () => {
      const frontend = {
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
      };

      const backend = toBackendModel(frontend);

      expect(backend).toEqual({
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
        model_type: "llama",
        description: "",
      });
    });
  });

  describe("toFrontendHardware", () => {
    it("should convert backend hardware to frontend format", () => {
      const backend = {
        id: 1,
        name: "NVIDIA A100 80GB",
        vendor: "NVIDIA",
        fp16_peak_tflops: 312,
        bf32_peak_tflops: 312,
        fp32_peak_tflops: 156,
        memory_size_gb: 80,
        memory_bandwidth_tbps: 2.039,
        description: "Test GPU",
        is_preset: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const frontend = toFrontendHardware(backend);

      expect(frontend).toEqual({
        id: "1",
        name: "NVIDIA A100 80GB",
        fp16_peak_tflops: 312,
        bf16_peak_tflops: 312,
        fp32_peak_tflops: 156,
        memory_size_gb: 80,
        memory_bandwidth_tbps: 2.039,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });
    });
  });

  describe("toFrontendModel", () => {
    it("should convert backend model to frontend format", () => {
      const backend = {
        id: 1,
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
        model_type: "llama",
        description: "Test model",
        is_preset: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const frontend = toFrontendModel(backend);

      expect(frontend).toEqual({
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
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });
    });
  });
});

describe("API Client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe("healthCheck", () => {
    it("should return health status", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ status: "healthy" }),
      } as Response);

      const result = await apiClient.healthCheck();

      expect(result).toEqual({ status: "healthy" });
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe("getHardware", () => {
    it("should fetch hardware list", async () => {
      const mockHardware = [
        { id: 1, name: "A100", fp16_peak_tflops: 312, bf32_peak_tflops: 312, fp32_peak_tflops: 156, memory_size_gb: 80, memory_bandwidth_tbps: 2.039, vendor: "", description: "", is_preset: true, created_at: null, updated_at: null },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockHardware,
      } as Response);

      const result = await apiClient.getHardware();

      expect(result).toEqual(mockHardware);
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe("getModels", () => {
    it("should fetch models list", async () => {
      const mockModels = [
        { id: 1, name: "Llama 2 7B", huggingface_id: "meta-llama/Llama-2-7b-hf", params_billions: 7, num_layers: 32, hidden_size: 4096, num_attention_heads: 32, num_key_value_heads: 32, vocab_size: 32000, intermediate_size: 11008, head_dim: 128, max_position_embeddings: 4096, model_type: "llama", description: "", is_preset: true, created_at: null, updated_at: null },
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockModels,
      } as Response);

      const result = await apiClient.getModels();

      expect(result).toEqual(mockModels);
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe("calculateMFU", () => {
    it("should send calculation request to API", async () => {
      const mockResponse = {
        success: true,
        result: {
          mfu: 45.5,
          memory_bandwidth_utilization: 30.2,
          theoretical_flops: 100,
          actual_flops: 45.5,
          peak_flops: 100,
          prefill_flops: 50,
          decode_flops: 50,
          kv_cache_bytes: 1024,
          model_memory_bytes: 2048,
          bottleneck_type: "balanced",
          tokens_per_second: 50,
          total_time_ms: 100,
        },
        suggestions: [
          { category: "test", priority: "medium", suggestion: "Test suggestion", impact: "positive" },
        ],
      };

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await apiClient.calculateMFU({
        hardware_id: "1",
        model_id: "1",
        precision: "FP16",
        first_token_latency_ms: 100,
        tpot_ms: 20,
        context_length: 2048,
        generated_length: 256,
        batch_size: 1,
      });

      expect(result).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should throw error on failed request", async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: async () => ({ detail: "Hardware not found" }),
      } as Response);

      await expect(apiClient.getHardwareById(999)).rejects.toThrow("Hardware not found");
    });
  });
});
