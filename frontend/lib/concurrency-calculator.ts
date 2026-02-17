import type {
  Hardware,
  Model,
  ConcurrencyInput,
  ConcurrencyResult,
  ConcurrencyCalculation,
  MemoryBreakdown,
  Precision,
} from "./types";

// Get bytes per element based on precision
function getBytesPerElement(precision: Precision): number {
  switch (precision) {
    case "FP16":
    case "BF16":
      return 2;
    case "INT8":
      return 1;
  }
}

// Calculate model weight memory in GB
function calculateModelWeightMemory(model: Model, precision: Precision): number {
  const bytesPerElement = getBytesPerElement(precision);
  return (model.params_billions * 1e9 * bytesPerElement) / (1024 * 1024 * 1024);
}

// Calculate per-token KV cache memory in GB
function calculatePerTokenKVCacheMemory(
  model: Model,
  precision: Precision
): number {
  const bytesPerElement = getBytesPerElement(precision);

  // Check if this is a hybrid attention model (like Qwen3.5)
  if (model.is_hybrid_attention && model.num_full_attention_layers !== undefined) {
    // For hybrid models, only full attention layers have per-token KV cache
    // Linear attention layers use fixed-size state (not dependent on sequence length)
    const numFullAttnLayers = model.num_full_attention_layers;
    const numKvHeads = model.num_key_value_heads;
    const headDim = model.head_dim;

    const fullAttnPerTokenMemory =
      2 * numFullAttnLayers * numKvHeads * headDim * bytesPerElement;

    return fullAttnPerTokenMemory / (1024 * 1024 * 1024); // Convert to GB
  }

  // Standard model: KV cache per token = 2 * num_layers * num_kv_heads * head_dim * precision_bytes
  const perTokenMemory =
    2 *
    model.num_layers *
    model.num_key_value_heads *
    model.head_dim *
    bytesPerElement;
  return perTokenMemory / (1024 * 1024 * 1024); // Convert to GB
}

// Calculate fixed KV cache state for linear attention layers (in GB)
// This is a fixed overhead per request, not dependent on sequence length
function calculateLinearAttentionStateMemory(
  model: Model,
  precision: Precision
): number {
  // Only hybrid models have linear attention
  if (!model.is_hybrid_attention || !model.num_linear_attention_layers) {
    return 0;
  }

  const bytesPerElement = getBytesPerElement(precision);
  const numLinearLayers = model.num_linear_attention_layers;

  // Linear attention state consists of:
  // 1. Recurrent state (K^T * V accumulator): linear_num_key_heads * linear_key_head_dim * linear_value_head_dim
  // 2. Convolution buffer for keys: linear_num_key_heads * linear_key_head_dim * linear_conv_kernel_dim
  const linearKeyHeads = model.linear_num_key_heads || 0;
  const linearKeyHeadDim = model.linear_key_head_dim || 0;
  const linearValueHeads = model.linear_num_value_heads || 0;
  const linearValueHeadDim = model.linear_value_head_dim || 0;
  const linearConvKernelDim = model.linear_conv_kernel_dim || 1;  // Default to 1 if not specified

  // Recurrent state (K^T * V accumulator)
  const recurrentStateSize = linearKeyHeads * linearKeyHeadDim * linearValueHeadDim;
  // Convolution buffer for keys
  const convBufferSize = linearKeyHeads * linearKeyHeadDim * linearConvKernelDim;

  const stateSizePerLayer = recurrentStateSize + convBufferSize;
  const totalStateSize = stateSizePerLayer * numLinearLayers * bytesPerElement;

  return totalStateSize / (1024 * 1024 * 1024); // Convert to GB
}

// Calculate per-request activation memory in GB (single token context)
function calculatePerRequestActivationMemory(
  model: Model,
  precision: Precision
): number {
  const bytesPerElement = getBytesPerElement(precision);
  // Activation memory estimation: 2 * num_layers * hidden_size * precision_bytes
  const activationMemory =
    2 * model.num_layers * model.hidden_size * bytesPerElement;
  return activationMemory / (1024 * 1024 * 1024); // Convert to GB
}

// Main calculation function for concurrency
export function calculateMaxConcurrency(
  input: ConcurrencyInput,
  hardware: Hardware,
  model: Model
): ConcurrencyCalculation {
  // Total memory for multi-GPU setup
  const totalMemory = hardware.memory_size_gb * input.gpu_count;

  // Fixed memory allocations
  const weightMemory = calculateModelWeightMemory(model, input.attention_precision);
  const frameworkOverhead = input.framework_overhead_gb;
  // Activation reserve = (1 - gpu_utilization) * total_memory
  const activationReserve = (1 - input.gpu_utilization) * totalMemory;

  // Memory available for KV cache
  const kvCacheMemory = Math.max(
    0,
    totalMemory - weightMemory - frameworkOverhead - activationReserve
  );

  // Per-token KV cache memory (for full attention layers in hybrid models)
  const perTokenKVCache = calculatePerTokenKVCacheMemory(model, input.attention_precision);

  // Fixed linear attention state memory per request (not dependent on sequence length)
  const linearAttentionState = calculateLinearAttentionStateMemory(model, input.attention_precision);

  // Per-request KV cache memory for full context
  // For hybrid models: perTokenKVCache is only for full attention layers
  // Linear attention state is added as fixed overhead
  const perRequestKVCache = perTokenKVCache * input.context_length + linearAttentionState;

  // Per-request activation memory (for prefill)
  const perRequestActivation = calculatePerRequestActivationMemory(
    model,
    input.attention_precision
  );

  // Max concurrency (each request needs KV cache + activation for prefill)
  // Formula: available_kv_cache / (per_request_kv_cache + per_request_activation)
  const maxConcurrency = Math.floor(
    kvCacheMemory / (perRequestKVCache + perRequestActivation)
  );

  // Memory breakdown for display
  const memoryBreakdown: MemoryBreakdown = {
    weight_memory_gb: weightMemory,
    framework_overhead_gb: frameworkOverhead,
    kv_cache_memory_gb: kvCacheMemory,
    activation_memory_gb: activationReserve,
    total_memory_gb: totalMemory,
  };

  return {
    gpu_count: input.gpu_count,
    max_concurrency_without_pa: maxConcurrency,
    max_concurrency_with_pa: maxConcurrency, // Will be updated with PA factor
    memory_breakdown: memoryBreakdown,
    hardware_memory_gb: totalMemory,
    available_memory_gb: kvCacheMemory,
    per_request_kv_cache_gb: perRequestKVCache,
    per_request_activation_gb: perRequestActivation,
  };
}

// Calculate max concurrency with Paged Attention
export function calculateMaxConcurrencyWithPA(
  result: ConcurrencyCalculation,
  pagedAttentionFactor: number = 2.3
): number {
  // With Paged Attention, effective KV cache memory is reduced
  // We need to recalculate based on the available KV cache memory
  const availableKVCache = result.memory_breakdown.kv_cache_memory_gb;

  // With PA, we can fit more requests in the same KV cache memory
  // The PA factor reduces the effective memory per request
  const effectivePerRequestKVCache = result.per_request_kv_cache_gb / pagedAttentionFactor;

  return Math.floor(
    availableKVCache / (effectivePerRequestKVCache + result.per_request_activation_gb)
  );
}

// Calculate memory breakdown with specific concurrency count
export function calculateMemoryWithConcurrency(
  result: ConcurrencyCalculation,
  concurrency: number
): MemoryBreakdown {
  return {
    weight_memory_gb: result.memory_breakdown.weight_memory_gb,
    framework_overhead_gb: result.memory_breakdown.framework_overhead_gb,
    kv_cache_memory_gb: result.per_request_kv_cache_gb * concurrency,
    activation_memory_gb: result.per_request_activation_gb * concurrency,
    total_memory_gb:
      result.memory_breakdown.weight_memory_gb +
      result.memory_breakdown.framework_overhead_gb +
      result.per_request_kv_cache_gb * concurrency +
      result.per_request_activation_gb * concurrency,
  };
}
