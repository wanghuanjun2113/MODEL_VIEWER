import type {
  Hardware,
  Model,
  ConcurrencyInput,
  ConcurrencyResult,
  MemoryBreakdown,
  Precision,
} from "./types";

// Paged Attention memory savings factor
const PAGED_ATTENTION_FACTOR = 2.3;

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

// Calculate KV cache memory for a single request in GB
function calculateKVCacheMemory(
  model: Model,
  contextLength: number,
  precision: Precision
): number {
  const bytesPerElement = getBytesPerElement(precision);
  // KV cache = 2 * num_layers * num_attention_heads * head_dim * context_length * precision_bytes
  // Note: Using num_attention_heads (not num_key_value_heads) because full KV is needed for inference
  const kvMemory =
    2 *
    model.num_layers *
    model.num_attention_heads *
    model.head_dim *
    contextLength *
    bytesPerElement;
  return kvMemory / (1024 * 1024 * 1024); // Convert to GB
}

// Calculate activation memory for a single request in GB
function calculateActivationMemory(
  model: Model,
  contextLength: number,
  precision: Precision
): number {
  const bytesPerElement = getBytesPerElement(precision);
  // Activation memory estimation: 2 * num_layers * context_length * hidden_size * precision_bytes
  const activationMemory =
    2 * model.num_layers * contextLength * model.hidden_size * bytesPerElement;
  return activationMemory / (1024 * 1024 * 1024); // Convert to GB
}

// Calculate memory breakdown for a single request
function calculateMemoryBreakdown(
  model: Model,
  contextLength: number,
  precision: Precision,
  frameworkOverheadGb: number
): MemoryBreakdown {
  const weightMemory = calculateModelWeightMemory(model, precision);
  const kvCacheMemory = calculateKVCacheMemory(model, contextLength, precision);
  const activationMemory = calculateActivationMemory(model, contextLength, precision);

  const totalMemory =
    weightMemory + frameworkOverheadGb + kvCacheMemory + activationMemory;

  return {
    weight_memory_gb: weightMemory,
    framework_overhead_gb: frameworkOverheadGb,
    kv_cache_memory_gb: kvCacheMemory,
    activation_memory_gb: activationMemory,
    total_memory_gb: totalMemory,
  };
}

// Main calculation function for concurrency
export function calculateMaxConcurrency(
  input: ConcurrencyInput,
  hardware: Hardware,
  model: Model
): ConcurrencyResult {
  // Available memory after framework overhead
  const availableMemory = hardware.memory_size_gb - input.framework_overhead_gb;

  // Calculate memory breakdown for a single request
  const memoryBreakdown = calculateMemoryBreakdown(
    model,
    input.context_length,
    input.precision,
    input.framework_overhead_gb
  );

  // Calculate max concurrency without Paged Attention
  const maxConcurrencyWithoutPA = Math.floor(
    availableMemory / memoryBreakdown.total_memory_gb
  );

  // Calculate max concurrency with Paged Attention (memory savings factor)
  // With Paged Attention, KV cache memory is reduced by the factor
  const memoryWithPA =
    memoryBreakdown.weight_memory_gb +
    memoryBreakdown.framework_overhead_gb +
    memoryBreakdown.kv_cache_memory_gb / PAGED_ATTENTION_FACTOR +
    memoryBreakdown.activation_memory_gb;

  const maxConcurrencyWithPA = Math.floor(availableMemory / memoryWithPA);

  return {
    max_concurrency_without_pa: Math.max(0, maxConcurrencyWithoutPA),
    max_concurrency_with_pa: Math.max(0, maxConcurrencyWithPA),
    memory_breakdown: memoryBreakdown,
    hardware_memory_gb: hardware.memory_size_gb,
    available_memory_gb: Math.max(0, availableMemory),
  };
}

// Calculate memory breakdown with specific concurrency count
export function calculateMemoryWithConcurrency(
  result: ConcurrencyResult,
  concurrency: number
): MemoryBreakdown {
  return {
    weight_memory_gb: result.memory_breakdown.weight_memory_gb,
    framework_overhead_gb: result.memory_breakdown.framework_overhead_gb,
    kv_cache_memory_gb: result.memory_breakdown.kv_cache_memory_gb * concurrency,
    activation_memory_gb: result.memory_breakdown.activation_memory_gb * concurrency,
    total_memory_gb:
      result.memory_breakdown.weight_memory_gb +
      result.memory_breakdown.framework_overhead_gb +
      result.memory_breakdown.kv_cache_memory_gb * concurrency +
      result.memory_breakdown.activation_memory_gb * concurrency,
  };
}
