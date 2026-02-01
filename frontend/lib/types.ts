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
