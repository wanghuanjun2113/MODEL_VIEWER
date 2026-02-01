/**
 * MFU Calculator API Service
 * Handles all communication with the backend API
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

// Types matching backend schemas
export interface ApiHardware {
  id: number;
  name: string;
  vendor: string;
  fp16_peak_tflops: number;
  bf32_peak_tflops: number;
  fp32_peak_tflops: number;
  memory_size_gb: number;
  memory_bandwidth_tbps: number;
  description: string;
  is_preset: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ApiModel {
  id: number;
  name: string;
  huggingface_id: string;
  params_billions: number;
  num_layers: number;
  hidden_size: number;
  num_attention_heads: number;
  num_key_value_heads: number;
  vocab_size: number;
  intermediate_size: number;
  head_dim: number;
  max_position_embeddings: number;
  model_type: string;
  description: string;
  is_preset: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export type ApiPrecision = "fp16" | "bf16" | "fp32";

export interface ApiCalculationInput {
  hardware_id: number;
  model_id: number;
  precision: ApiPrecision;
  first_token_latency_ms: number;
  tpot_ms: number;
  context_length: number;
  generated_length: number;
  batch_size: number;
}

export type ApiBottleneckType = "compute" | "memory" | "balanced";

export interface ApiCalculationResult {
  mfu: number;
  memory_bandwidth_utilization: number;
  theoretical_flops: number;
  actual_flops: number;
  peak_flops: number;
  prefill_flops: number;
  decode_flops: number;
  kv_cache_bytes: number;
  model_memory_bytes: number;
  bottleneck_type: ApiBottleneckType;
  tokens_per_second: number;
  total_time_ms: number;
}

export interface ApiOptimizationSuggestion {
  category: string;
  priority: "high" | "medium" | "low";
  suggestion: string;
  impact: string;
}

export interface ApiCalculationResponse {
  success: boolean;
  result: ApiCalculationResult | null;
  error: string | null;
  suggestions: ApiOptimizationSuggestion[];
}

// Convert backend Hardware to frontend format (map id: number -> string)
export function toFrontendHardware(hardware: ApiHardware) {
  return {
    id: String(hardware.id),
    name: hardware.name,
    fp16_peak_tflops: hardware.fp16_peak_tflops,
    bf16_peak_tflops: hardware.bf32_peak_tflops,
    fp32_peak_tflops: hardware.fp32_peak_tflops,
    memory_size_gb: hardware.memory_size_gb,
    memory_bandwidth_tbps: hardware.memory_bandwidth_tbps,
    created_at: hardware.created_at || new Date().toISOString(),
    updated_at: hardware.updated_at || new Date().toISOString(),
  };
}

// Convert frontend Hardware to backend format (map id: string -> number)
export function toBackendHardware(data: {
  name: string;
  fp16_peak_tflops: number;
  bf16_peak_tflops: number;
  fp32_peak_tflops: number;
  memory_size_gb: number;
  memory_bandwidth_tbps: number;
}) {
  return {
    name: data.name,
    vendor: "",
    fp16_peak_tflops: data.fp16_peak_tflops,
    bf32_peak_tflops: data.bf16_peak_tflops,
    fp32_peak_tflops: data.fp32_peak_tflops,
    memory_size_gb: data.memory_size_gb,
    memory_bandwidth_tbps: data.memory_bandwidth_tbps,
    description: "",
  };
}

// Convert backend Model to frontend format
export function toFrontendModel(model: ApiModel) {
  return {
    id: String(model.id),
    name: model.name,
    huggingface_id: model.huggingface_id,
    params_billions: model.params_billions,
    num_layers: model.num_layers,
    hidden_size: model.hidden_size,
    num_attention_heads: model.num_attention_heads,
    num_key_value_heads: model.num_key_value_heads,
    vocab_size: model.vocab_size,
    intermediate_size: model.intermediate_size,
    head_dim: model.head_dim,
    max_position_embeddings: model.max_position_embeddings,
    created_at: model.created_at || new Date().toISOString(),
    updated_at: model.updated_at || new Date().toISOString(),
  };
}

// Convert frontend Model to backend format
export function toBackendModel(data: {
  name: string;
  huggingface_id: string;
  params_billions: number;
  num_layers: number;
  hidden_size: number;
  num_attention_heads: number;
  num_key_value_heads: number;
  vocab_size: number;
  intermediate_size: number;
  head_dim: number;
  max_position_embeddings: number;
}) {
  return {
    name: data.name,
    huggingface_id: data.huggingface_id,
    params_billions: data.params_billions,
    num_layers: data.num_layers,
    hidden_size: data.hidden_size,
    num_attention_heads: data.num_attention_heads,
    num_key_value_heads: data.num_key_value_heads,
    vocab_size: data.vocab_size,
    intermediate_size: data.intermediate_size,
    head_dim: data.head_dim,
    max_position_embeddings: data.max_position_embeddings,
    model_type: "llama",
    description: "",
  };
}

// API Client
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `HTTP error ${response.status}`);
    }

    return response.json();
  }

  // Hardware endpoints
  async getHardware(): Promise<ApiHardware[]> {
    return this.request<ApiHardware[]>("/hardware");
  }

  async getHardwareById(id: number): Promise<ApiHardware> {
    return this.request<ApiHardware>(`/hardware/${id}`);
  }

  async createHardware(data: ReturnType<typeof toBackendHardware>): Promise<ApiHardware> {
    return this.request<ApiHardware>("/hardware", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateHardware(
    id: number,
    data: Partial<ReturnType<typeof toBackendHardware>>
  ): Promise<ApiHardware> {
    return this.request<ApiHardware>(`/hardware/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteHardware(id: number): Promise<void> {
    await this.request(`/hardware/${id}`, { method: "DELETE" });
  }

  // Model endpoints
  async getModels(): Promise<ApiModel[]> {
    return this.request<ApiModel[]>("/models");
  }

  async getModelById(id: number): Promise<ApiModel> {
    return this.request<ApiModel>(`/models/${id}`);
  }

  async createModel(data: ReturnType<typeof toBackendModel>): Promise<ApiModel> {
    return this.request<ApiModel>("/models", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createModelFromHF(hfId: string): Promise<ApiModel> {
    return this.request<ApiModel>("/models/from-hf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hf_id: hfId }),
    });
  }

  async previewModelFromHF(hfId: string): Promise<ApiModel> {
    return this.request<ApiModel>(`/models/hf/${hfId}`);
  }

  async updateModel(
    id: number,
    data: Partial<ReturnType<typeof toBackendModel>>
  ): Promise<ApiModel> {
    return this.request<ApiModel>(`/models/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteModel(id: number): Promise<void> {
    await this.request(`/models/${id}`, { method: "DELETE" });
  }

  // Calculation endpoint
  async calculateMFU(input: ApiCalculationInput): Promise<ApiCalculationResponse> {
    const precisionMap: Record<string, ApiPrecision> = {
      FP16: "fp16",
      BF16: "bf16",
      FP32: "fp32",
    };

    const backendInput = {
      hardware_id: Number(input.hardware_id),
      model_id: Number(input.model_id),
      precision: precisionMap[input.precision] || "fp16",
      first_token_latency_ms: input.first_token_latency_ms,
      tpot_ms: input.tpot_ms,
      context_length: input.context_length,
      generated_length: input.generated_length,
      batch_size: input.batch_size,
    };

    return this.request<ApiCalculationResponse>("/calculate/mfu", {
      method: "POST",
      body: JSON.stringify(backendInput),
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    return this.request("/health");
  }
}

export const apiClient = new ApiClient();
