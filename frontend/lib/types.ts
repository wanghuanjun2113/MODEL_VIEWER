// Hardware types
export interface Hardware {
  id: string;
  name: string;
  fp16_peak_tflops: number;
  bf16_peak_tflops: number;
  int8_peak_tops: number;
  memory_size_gb: number;
  memory_bandwidth_tbps: number;
  created_at: string;
  updated_at: string;
}

// Model types
export interface Model {
  id: string;
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
  created_at: string;
  updated_at: string;
}

// Precision type
export type Precision = "FP16" | "BF16" | "INT8";

// Calculation input
export interface CalculationInput {
  hardware_id: string;
  model_id: string;
  gpu_count: number;  // Number of GPUs (1, 2, 4, 8, 16, 32)
  precision: Precision;  // General precision (backward compatibility)
  attention_precision: Precision;  // Attention layer precision
  ffn_precision: Precision;  // FFN layer precision
  first_token_latency_ms: number;
  tpot_ms: number;
  context_length: number;
  generated_length: number;
  batch_size: number;
}

// Bottleneck type
export type BottleneckType = "compute" | "memory" | "balanced";

// Calculation result
export interface CalculationResult {
  id: string;
  input: CalculationInput;
  hardware: Hardware;
  model: Model;
  mfu: number;
  memory_bandwidth_utilization: number;
  theoretical_flops: number;
  actual_flops: number;
  bottleneck_type: BottleneckType;
  prefill_flops: number;
  decode_flops: number;
  kv_cache_size_gb: number;
  optimization_suggestions: string[];
  timestamp: string;
}

// Form state for hardware
export interface HardwareFormData {
  name: string;
  fp16_peak_tflops: number;
  bf16_peak_tflops: number;
  int8_peak_tops: number;
  memory_size_gb: number;
  memory_bandwidth_tbps: number;
}

// Form state for model
export interface ModelFormData {
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
}

// Concurrency calculator types
export interface ConcurrencyInput {
  hardware_id: string;
  model_id: string;
  gpu_count: number;  // Number of GPUs (1, 2, 4, 8, 16, 32)
  context_length: number;
  attention_precision: Precision;
  framework_overhead_gb: number;
  activation_reserve_gb: number;  // Reserved memory for activations
}

export interface MemoryBreakdown {
  weight_memory_gb: number;
  framework_overhead_gb: number;
  kv_cache_memory_gb: number;
  activation_memory_gb: number;
  total_memory_gb: number;
}

export interface ConcurrencyResult {
  gpu_count: number;
  max_concurrency_without_pa: number;
  max_concurrency_with_pa: number;
  memory_breakdown: MemoryBreakdown;
  hardware_memory_gb: number;
  available_memory_gb: number;
  per_request_kv_cache_gb: number;  // KV cache per request (full context)
  per_request_activation_gb: number;  // Activation memory per request
}

// GPU count options for multi-GPU support
export const GPU_COUNT_OPTIONS = [
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 4, label: "4" },
  { value: 8, label: "8" },
  { value: 16, label: "16" },
  { value: 32, label: "32" },
] as const;

export type GpuCount = typeof GPU_COUNT_OPTIONS[number]["value"];
