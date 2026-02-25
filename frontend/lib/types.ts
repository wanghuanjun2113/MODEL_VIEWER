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
  // Hybrid attention fields (for models like Qwen3.5)
  is_hybrid_attention?: boolean;
  full_attention_interval?: number;  // Every N layers is full attention
  num_full_attention_layers?: number;
  num_linear_attention_layers?: number;
  // Linear attention config
  linear_num_key_heads?: number;
  linear_num_value_heads?: number;
  linear_key_head_dim?: number;
  linear_value_head_dim?: number;
  linear_conv_kernel_dim?: number;  // Convolution kernel dimension for linear attention
  layer_types?: string[];  // Array of "full_attention" or "linear_attention"
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
  // 总体指标
  mfu: number;
  memory_bandwidth_utilization: number;
  // Prefill 阶段指标
  prefill_mfu: number;
  prefill_bandwidth_utilization: number;
  // Decode 阶段指标
  decode_mfu: number;
  decode_bandwidth_utilization: number;
  // 其他指标
  theoretical_flops: number;
  actual_flops: number;
  peak_flops: number;
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
  // Hybrid attention fields
  is_hybrid_attention?: boolean;
  full_attention_interval?: number;
  num_full_attention_layers?: number;
  num_linear_attention_layers?: number;
  linear_num_key_heads?: number;
  linear_num_value_heads?: number;
  linear_key_head_dim?: number;
  linear_value_head_dim?: number;
  linear_conv_kernel_dim?: number;
  layer_types?: string[];
}

// Concurrency calculator types
export interface ConcurrencyInput {
  hardware_id: string;
  model_id: string;
  gpu_count: number;  // Number of GPUs (1, 2, 4, 8, 16, 32)
  context_length: number;
  attention_precision: Precision;
  framework_overhead_gb: number;
  gpu_utilization: number;  // GPU utilization ratio (0-1), activation_reserve = (1 - gpu_utilization) * total_memory
}

export interface MemoryBreakdown {
  weight_memory_gb: number;
  framework_overhead_gb: number;
  kv_cache_memory_gb: number;
  activation_memory_gb: number;
  total_memory_gb: number;
}

export interface ConcurrencyResult {
  id: string;
  input: ConcurrencyInput;
  hardware: Hardware;
  model: Model;
  gpu_count: number;
  max_concurrency_without_pa: number;
  max_concurrency_with_pa: number;
  memory_breakdown: MemoryBreakdown;
  hardware_memory_gb: number;
  available_memory_gb: number;
  per_request_kv_cache_gb: number;  // KV cache per request (full context)
  per_request_activation_gb: number;  // Activation memory per request
  timestamp: string;
}

// Intermediate calculation result (without metadata)
export type ConcurrencyCalculation = Omit<ConcurrencyResult, 'id' | 'input' | 'hardware' | 'model' | 'timestamp'>;

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
