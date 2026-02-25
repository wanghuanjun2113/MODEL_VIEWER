import type {
  Hardware,
  Model,
  CalculationInput,
  CalculationResult,
  Precision,
  BottleneckType,
} from "./types";
import { generateUUID } from "./utils";

// Get peak TFLOPS based on precision
function getPeakTflops(hardware: Hardware, precision: Precision): number {
  switch (precision) {
    case "FP16":
      return hardware.fp16_peak_tflops;
    case "BF16":
      return hardware.bf16_peak_tflops;
    case "INT8":
      return hardware.int8_peak_tops;
  }
}

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

// Get precision scaling factor (relative to FP32)
function getPrecisionScale(precision: Precision): number {
  switch (precision) {
    case "FP16":
    case "BF16":
      return 1;  // FP16/BF16 is 2 bytes, same as FP32 ops ratio
    case "INT8":
      return 2;  // INT8 has 2x throughput of FP16 on most tensor cores
  }
}

// Calculate prefill phase FLOPs with separate attention and FFN precision
function calculatePrefillFlops(
  model: Model,
  contextLength: number,
  batchSize: number,
  attentionPrecision: Precision,
  ffnPrecision: Precision
): number {
  const L = model.num_layers;
  const d = model.hidden_size;
  const n = model.vocab_size;
  const h = model.num_attention_heads;
  const headDim = model.head_dim;
  const intermediateSize = model.intermediate_size;
  const kvHeads = model.num_key_value_heads;

  // Attention: Q, K, V projections + attention scores + output projection
  // Apply precision scaling for attention
  const attentionScale = getPrecisionScale(attentionPrecision);
  const qkvProj = 2 * d * (d + 2 * (kvHeads * headDim)) * contextLength * attentionScale;
  const attnScores = 2 * h * contextLength * contextLength * headDim * attentionScale;
  const attnOutput = 2 * d * d * contextLength * attentionScale;
  const attnTotal = qkvProj + attnScores + attnOutput;

  // FFN: up projection + down projection (with SwiGLU)
  // Apply precision scaling for FFN
  const ffnScale = getPrecisionScale(ffnPrecision);
  const ffnFlops = 2 * 3 * d * intermediateSize * contextLength * ffnScale;

  // Total per layer
  const perLayerFlops = attnTotal + ffnFlops;

  // Embedding and LM head (use attention precision as default)
  const embeddingFlops = 2 * d * n * contextLength * attentionScale;

  return (L * perLayerFlops + embeddingFlops) * batchSize;
}

// Calculate decode phase FLOPs (per token) with separate precision
function calculateDecodeFlopsPerToken(
  model: Model,
  contextLength: number,
  batchSize: number,
  attentionPrecision: Precision,
  ffnPrecision: Precision
): number {
  const L = model.num_layers;
  const d = model.hidden_size;
  const n = model.vocab_size;
  const h = model.num_attention_heads;
  const headDim = model.head_dim;
  const intermediateSize = model.intermediate_size;
  const kvHeads = model.num_key_value_heads;

  // Attention for single token
  const attentionScale = getPrecisionScale(attentionPrecision);
  const qkvProj = 2 * d * (d + 2 * (kvHeads * headDim)) * attentionScale;
  const attnScores = 2 * h * contextLength * headDim * attentionScale;
  const attnOutput = 2 * d * d * attentionScale;
  const attnTotal = qkvProj + attnScores + attnOutput;

  // FFN with precision scaling
  const ffnScale = getPrecisionScale(ffnPrecision);
  const ffnFlops = 2 * 3 * d * intermediateSize * ffnScale;

  // Total per layer
  const perLayerFlops = attnTotal + ffnFlops;

  // LM head
  const lmHeadFlops = 2 * d * n * attentionScale;

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
    suggestions.push("optHigherComputeHardware");
    if (mfu < 30) {
      suggestions.push("optTensorCoreOpt");
      suggestions.push("optUseQuantization");
    }
    suggestions.push("optFlashAttention");
  } else if (bottleneckType === "memory") {
    suggestions.push("optHigherMemoryBandwidth");
    if (memoryBandwidthUtilization > 80) {
      suggestions.push("optReduceBatchSize");
      suggestions.push("optKVCacheQuant");
    }
    suggestions.push("optContinuousBatching");
  } else {
    suggestions.push("optBalanced");
    if (mfu > 50 && memoryBandwidthUtilization > 50) {
      suggestions.push("optScaleBatchSize");
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
  // Use attention precision for peak FLOPs by default, multiply by GPU count
  const peakTflops = getPeakTflops(hardware, input.attention_precision) * input.gpu_count;

  // Calculate FLOPs for prefill phase with separate precisions
  const prefillFlops = calculatePrefillFlops(
    model,
    input.context_length,
    input.batch_size,
    input.attention_precision,
    input.ffn_precision
  );

  // Calculate FLOPs for decode phase (all generated tokens)
  const avgContextLength =
    input.context_length + input.generated_length / 2;
  const decodeFlopsPerToken = calculateDecodeFlopsPerToken(
    model,
    avgContextLength,
    input.batch_size,
    input.attention_precision,
    input.ffn_precision
  );
  const totalDecodeFlops = decodeFlopsPerToken * input.generated_length;

  // Total theoretical FLOPs
  const totalFlops = prefillFlops + totalDecodeFlops;

  // Calculate time for each phase
  const prefillTime = input.first_token_latency_ms / 1000; // Convert to seconds
  const decodeTime = (input.tpot_ms * input.generated_length) / 1000;
  const totalTime = prefillTime + decodeTime;

  // Calculate Prefill MFU
  const prefillActualTflops = prefillFlops / 1e12 / prefillTime;
  const prefillMfu = (prefillActualTflops / peakTflops) * 100;

  // Calculate Decode MFU
  const decodeActualTflops = totalDecodeFlops / 1e12 / decodeTime;
  const decodeMfu = (decodeActualTflops / peakTflops) * 100;

  // Calculate total MFU
  const actualTflops = totalFlops / 1e12 / totalTime;
  const mfu = (actualTflops / peakTflops) * 100;

  // Calculate memory bandwidth utilization
  // Use the larger precision (more bytes) for conservative estimate
  const modelPrecision = input.attention_precision === "INT8" || input.ffn_precision === "INT8"
    ? "INT8"
    : input.attention_precision === "BF16" || input.ffn_precision === "BF16"
      ? "BF16"
      : "FP16";
  const modelSizeGB = calculateModelSize(model, modelPrecision as Precision);
  const kvCacheSizeGB = calculateKVCacheSize(
    model,
    input.context_length + input.generated_length,
    input.batch_size,
    input.attention_precision as Precision
  );

  // Prefill bandwidth utilization (mainly reading model weights)
  const prefillBandwidth = modelSizeGB / prefillTime; // GB/s
  const prefillBandwidthUtilization =
    (prefillBandwidth / (hardware.memory_bandwidth_tbps * input.gpu_count * 1000)) * 100;

  // Decode bandwidth utilization (model weights + average KV cache per token)
  const avgKvPerToken = kvCacheSizeGB / input.generated_length;
  const decodeMemoryPerToken = modelSizeGB + avgKvPerToken;
  const decodeBandwidth = decodeMemoryPerToken / (input.tpot_ms / 1000); // GB/s
  const decodeBandwidthUtilization =
    (decodeBandwidth / (hardware.memory_bandwidth_tbps * input.gpu_count * 1000)) * 100;

  // Total memory bandwidth utilization
  const memoryReadPerToken = modelSizeGB + kvCacheSizeGB / input.generated_length;
  const requiredBandwidth = memoryReadPerToken / (input.tpot_ms / 1000);
  const memoryBandwidthUtilization =
    (requiredBandwidth / (hardware.memory_bandwidth_tbps * input.gpu_count * 1000)) * 100;

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
    id: generateUUID(),
    input,
    hardware,
    model,
    // 总体指标
    mfu: Math.min(mfu, 100),
    memory_bandwidth_utilization: Math.min(memoryBandwidthUtilization, 100),
    // Prefill 阶段指标
    prefill_mfu: Math.min(prefillMfu, 100),
    prefill_bandwidth_utilization: Math.min(prefillBandwidthUtilization, 100),
    // Decode 阶段指标
    decode_mfu: Math.min(decodeMfu, 100),
    decode_bandwidth_utilization: Math.min(decodeBandwidthUtilization, 100),
    // 其他指标
    theoretical_flops: totalFlops / 1e12,
    actual_flops: actualTflops,
    peak_flops: peakTflops,
    bottleneck_type: bottleneckType,
    prefill_flops: prefillFlops / 1e12,
    decode_flops: totalDecodeFlops / 1e12,
    kv_cache_size_gb: kvCacheSizeGB,
    optimization_suggestions: optimizationSuggestions,
    timestamp: new Date().toISOString(),
  };
}
