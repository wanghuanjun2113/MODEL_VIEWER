import type {
  Hardware,
  Model,
  CalculationInput,
  CalculationResult,
  Precision,
  BottleneckType,
} from "./types";

// Get peak TFLOPS based on precision
function getPeakTflops(hardware: Hardware, precision: Precision): number {
  switch (precision) {
    case "FP16":
      return hardware.fp16_peak_tflops;
    case "BF16":
      return hardware.bf16_peak_tflops;
    case "FP32":
      return hardware.fp32_peak_tflops;
  }
}

// Get bytes per element based on precision
function getBytesPerElement(precision: Precision): number {
  switch (precision) {
    case "FP16":
    case "BF16":
      return 2;
    case "FP32":
      return 4;
  }
}

// Calculate prefill phase FLOPs
function calculatePrefillFlops(
  model: Model,
  contextLength: number,
  batchSize: number
): number {
  const L = model.num_layers;
  const d = model.hidden_size;
  const n = model.vocab_size;
  const h = model.num_attention_heads;
  const headDim = model.head_dim;
  const intermediateSize = model.intermediate_size;
  const kvHeads = model.num_key_value_heads;

  // Attention: Q, K, V projections + attention scores + output projection
  const qkvProj = 2 * d * (d + 2 * (kvHeads * headDim)) * contextLength;
  const attnScores = 2 * h * contextLength * contextLength * headDim;
  const attnOutput = 2 * d * d * contextLength;
  const attnTotal = qkvProj + attnScores + attnOutput;

  // FFN: up projection + down projection (with SwiGLU)
  const ffnFlops = 2 * 3 * d * intermediateSize * contextLength;

  // Total per layer
  const perLayerFlops = attnTotal + ffnFlops;

  // Embedding and LM head
  const embeddingFlops = 2 * d * n * contextLength;

  return (L * perLayerFlops + embeddingFlops) * batchSize;
}

// Calculate decode phase FLOPs (per token)
function calculateDecodeFlopsPerToken(
  model: Model,
  contextLength: number,
  batchSize: number
): number {
  const L = model.num_layers;
  const d = model.hidden_size;
  const n = model.vocab_size;
  const h = model.num_attention_heads;
  const headDim = model.head_dim;
  const intermediateSize = model.intermediate_size;
  const kvHeads = model.num_key_value_heads;

  // Attention for single token
  const qkvProj = 2 * d * (d + 2 * (kvHeads * headDim));
  const attnScores = 2 * h * contextLength * headDim;
  const attnOutput = 2 * d * d;
  const attnTotal = qkvProj + attnScores + attnOutput;

  // FFN
  const ffnFlops = 2 * 3 * d * intermediateSize;

  // Total per layer
  const perLayerFlops = attnTotal + ffnFlops;

  // LM head
  const lmHeadFlops = 2 * d * n;

  return (L * perLayerFlops + lmHeadFlops) * batchSize;
}

// Calculate KV cache size
function calculateKVCacheSize(
  model: Model,
  contextLength: number,
  batchSize: number,
  precision: Precision
): number {
  const bytesPerElement = getBytesPerElement(precision);
  const kvSize =
    2 *
    model.num_layers *
    model.num_key_value_heads *
    model.head_dim *
    contextLength *
    batchSize *
    bytesPerElement;
  return kvSize / (1024 * 1024 * 1024); // Convert to GB
}

// Calculate model size in GB
function calculateModelSize(model: Model, precision: Precision): number {
  const bytesPerElement = getBytesPerElement(precision);
  return (model.params_billions * 1e9 * bytesPerElement) / (1024 * 1024 * 1024);
}

// Generate optimization suggestions
function generateOptimizationSuggestions(
  mfu: number,
  memoryBandwidthUtilization: number,
  bottleneckType: BottleneckType
): string[] {
  const suggestions: string[] = [];

  if (bottleneckType === "compute") {
    suggestions.push("System is compute-bound. Consider using higher compute hardware.");
    if (mfu < 30) {
      suggestions.push("Low MFU detected. Enable Tensor Core optimizations if available.");
      suggestions.push("Consider using quantization (INT8/INT4) to reduce compute requirements.");
    }
    suggestions.push("Consider using Flash Attention for better compute efficiency.");
  } else if (bottleneckType === "memory") {
    suggestions.push("System is memory-bandwidth-bound. Consider using hardware with higher memory bandwidth.");
    if (memoryBandwidthUtilization > 80) {
      suggestions.push("Memory bandwidth is saturated. Reduce batch size or use model compression.");
      suggestions.push("Consider using KV cache quantization to reduce memory traffic.");
    }
    suggestions.push("Consider using continuous batching to improve memory efficiency.");
  } else {
    suggestions.push("System is balanced between compute and memory. Current configuration is efficient.");
    if (mfu > 50 && memoryBandwidthUtilization > 50) {
      suggestions.push("Good utilization. Consider scaling up batch size for higher throughput.");
    }
  }

  return suggestions;
}

// Main calculation function
export function calculateMFU(
  input: CalculationInput,
  hardware: Hardware,
  model: Model
): CalculationResult {
  const peakTflops = getPeakTflops(hardware, input.precision);

  // Calculate FLOPs for prefill phase
  const prefillFlops = calculatePrefillFlops(
    model,
    input.context_length,
    input.batch_size
  );

  // Calculate FLOPs for decode phase (all generated tokens)
  const avgContextLength =
    input.context_length + input.generated_length / 2;
  const decodeFlopsPerToken = calculateDecodeFlopsPerToken(
    model,
    avgContextLength,
    input.batch_size
  );
  const totalDecodeFlops = decodeFlopsPerToken * input.generated_length;

  // Total theoretical FLOPs
  const totalFlops = prefillFlops + totalDecodeFlops;

  // Calculate actual time spent
  const prefillTime = input.first_token_latency_ms / 1000; // Convert to seconds
  const decodeTime = (input.tpot_ms * input.generated_length) / 1000;
  const totalTime = prefillTime + decodeTime;

  // Calculate actual TFLOPS achieved
  const actualTflops = totalFlops / 1e12 / totalTime;

  // Calculate MFU
  const mfu = (actualTflops / peakTflops) * 100;

  // Calculate memory bandwidth utilization
  const modelSizeGB = calculateModelSize(model, input.precision);
  const kvCacheSizeGB = calculateKVCacheSize(
    model,
    input.context_length + input.generated_length,
    input.batch_size,
    input.precision
  );

  // Memory read per token during decode (simplified: model weights + KV cache)
  const memoryReadPerToken = modelSizeGB + kvCacheSizeGB / input.generated_length;
  const requiredBandwidth = memoryReadPerToken / (input.tpot_ms / 1000);
  const memoryBandwidthUtilization =
    (requiredBandwidth / (hardware.memory_bandwidth_tbps * 1000)) * 100;

  // Determine bottleneck type
  let bottleneckType: BottleneckType;
  const computeIntensity = mfu / 100;
  const memoryIntensity = memoryBandwidthUtilization / 100;

  if (computeIntensity > memoryIntensity * 1.2) {
    bottleneckType = "compute";
  } else if (memoryIntensity > computeIntensity * 1.2) {
    bottleneckType = "memory";
  } else {
    bottleneckType = "balanced";
  }

  // Generate optimization suggestions
  const optimizationSuggestions = generateOptimizationSuggestions(
    mfu,
    memoryBandwidthUtilization,
    bottleneckType
  );

  return {
    id: crypto.randomUUID(),
    input,
    hardware,
    model,
    mfu: Math.min(mfu, 100),
    memory_bandwidth_utilization: Math.min(memoryBandwidthUtilization, 100),
    theoretical_flops: totalFlops / 1e12,
    actual_flops: actualTflops,
    bottleneck_type: bottleneckType,
    prefill_flops: prefillFlops / 1e12,
    decode_flops: totalDecodeFlops / 1e12,
    kv_cache_size_gb: kvCacheSizeGB,
    optimization_suggestions: optimizationSuggestions,
    timestamp: new Date().toISOString(),
  };
}
