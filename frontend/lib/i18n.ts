import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState, useMemo } from "react";

export type Language = "en" | "zh";

export const translations = {
  en: {
    // Page title
    mfuCalculator: "MFU Calculator",
    calculateMfuDescription: "Calculate Model FLOPs Utilization and memory bandwidth usage for LLM inference",

    // Navigation
    hardwareUtilization: "Hardware Utilization",
    concurrency: "Concurrency",
    management: "Management",
    managementDesc: "Manage hardware configurations and model specifications",

    // Form labels
    inputParameters: "Input Parameters",
    hardware: "Hardware",
    selectHardware: "Select hardware",
    model: "Model",
    selectModel: "Select model",
    gpuCount: "GPU Count",
    latencyInformation: "Latency Information",
    firstTokenLatency: "First Token Latency (ms)",
    tpot: "TPOT (ms)",
    contextInformation: "Context Information",
    contextLength: "Context Length (tokens)",
    generatedLength: "Generated Length (tokens)",
    batchSize: "Batch Size / Concurrency",
    precision: "Precision",
    attentionPrecision: "Attention Precision",
    ffnPrecision: "FFN Precision",
    calculateMfu: "Calculate MFU",
    calculating: "Calculating...",

    // Concurrency calculator
    concurrencyCalculator: "Concurrency Calculator",
    concurrencyCalculatorDescription: "Calculate maximum concurrent requests based on memory constraints",
    calculateMaxConcurrency: "Calculate Max Concurrency",
    frameworkOverhead: "Framework Overhead",
    frameworkPreset: "Framework Preset",
    overheadGb: "Overhead (GB)",
    activationReserve: "Activation Reserve",
    gpuUtilization: "GPU Utilization",
    maxConcurrency: "Max Concurrency",
    withoutPagedAttention: "Without Paged Attention",
    withPagedAttention: "With Paged Attention",
    withoutPA: "Without PA",
    withPA: "With PA",
    requests: "requests",
    memoryBreakdown: "Memory Breakdown",
    item: "Item",
    singleRequest: "Single Request",
    total: "Total",
    weightMemory: "Weight Memory",
    kvCacheMemory: "KV Cache Memory",
    activationMemory: "Activation Memory",
    hardwareMemory: "Hardware Memory",
    usedMemory: "Used Memory",
    availableMemory: "Available Memory",
    runCalculationToSeeDetails: "Run a calculation to see memory details",

    // Messages
    pleaseSelectHardwareModel: "Please select hardware and model",
    invalidSelection: "Invalid hardware or model selection",
    calculationCompleted: "Calculation completed",
    calculationFailed: "Calculation failed",

    // Results
    results: "Results",
    comparison: "Comparison",
    mfu: "MFU",
    memoryBandwidthUtilization: "Memory Bandwidth Utilization",
    bottleneck: "Bottleneck",
    theoreticalFlops: "Theoretical FLOPS",
    actualFlops: "Actual FLOPS",
    optimizationSuggestions: "Optimization Suggestions",
    computeLimited: "Compute Limited",
    memoryLimited: "Memory Limited",
    balanced: "Balanced",

    // Hardware management
    hardwareManagement: "Hardware Management",
    addHardware: "Add Hardware",
    addHardwareDesc: "Add a new hardware configuration for MFU calculations.",
    editHardware: "Edit Hardware",
    editHardwareDesc: "Update hardware configuration for MFU calculations.",
    deleteHardware: "Delete Hardware",
    deleteHardwareConfirm: "Are you sure you want to delete this hardware? This action cannot be undone.",
    name: "Name",
    fp16PeakTflops: "FP16 Peak (TFLOPS)",
    bf16PeakTflops: "BF32 Peak (TFLOPS)",
    int8PeakTops: "INT8 Peak (TOPS)",
    memorySize: "Memory Size (GB)",
    memoryBandwidth: "Memory Bandwidth (TB/s)",

    // Messages
    nameRequired: "Name is required",
    hardwareAdded: "Hardware added",
    hardwareUpdated: "Hardware updated",
    hardwareDeleted: "Hardware deleted",
    templateDownloaded: "Template downloaded",
    importHardwareSuccess: "Imported {count} hardware entries",
    importHardwareFailed: "Failed to parse CSV file",
    modelAdded: "Model added",
    modelUpdated: "Model updated",
    modelDeleted: "Model deleted",
    hfIdRequired: "Please enter a Hugging Face model ID",
    fetchConfigFailed: "Failed to fetch model config from Hugging Face",
    fetchConfigSuccess: "Model config fetched successfully",
    reviewBeforeSaving: "Review and edit before saving",

    // Model management
    modelManagement: "Model Management",
    addModel: "Add Model",
    editModel: "Edit Model",
    editModelDesc: "Update model configuration.",
    huggingfaceId: "Hugging Face ID",
    paramsBillions: "Parameters (Billion)",
    numLayers: "Layers",
    hiddenSize: "Hidden Size",
    numAttentionHeads: "Attention Heads",
    numKeyValueHeads: "KV Heads",
    vocabSize: "Vocab Size",
    intermediateSize: "Intermediate Size",
    headDim: "Head Dim",
    maxPositionEmbeddings: "Max Position Embeddings",
    importFromHf: "Import from Hugging Face",
    preview: "Preview",

    // Actions
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    clear: "Clear",
    clearAll: "Clear All",
    export: "Export",
    import: "Import",
    downloadTemplate: "Download Template",
    importHardware: "Import Hardware",
    importModels: "Import Models",
    manualEntry: "Manual Entry",
    actions: "Actions",

    // Theme
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    system: "System",

    // Language
    language: "Language",
    english: "English",
    chinese: "中文",

    // Management page descriptions
    hardwareConfigDesc: "Manage GPU and accelerator specifications for MFU calculations. You can download the template, fill in your hardware specs, and import via CSV.",
    modelConfigDesc: "Manage model specifications. You can fetch model configurations directly from Hugging Face or enter them manually.",

    // Optimization suggestions
    optHigherComputeHardware: "System is compute-bound. Consider using higher compute hardware.",
    optTensorCoreOpt: "Low MFU detected. Enable Tensor Core optimizations if available.",
    optUseQuantization: "Consider using quantization (INT8/INT4) to reduce compute requirements.",
    optFlashAttention: "Consider using Flash Attention for better compute efficiency.",
    optHigherMemoryBandwidth: "System is memory-bandwidth-bound. Consider using hardware with higher memory bandwidth.",
    optReduceBatchSize: "Memory bandwidth is saturated. Reduce batch size or use model compression.",
    optKVCacheQuant: "Consider using KV cache quantization to reduce memory traffic.",
    optContinuousBatching: "Consider using continuous batching to improve memory efficiency.",
    optBalanced: "System is balanced between compute and memory. Current configuration is efficient.",
    optScaleBatchSize: "Good utilization. Consider scaling up batch size for higher throughput.",

    // Hardware info card
    hardwareInfo: "Hardware Info",
    hardwareInfoTip: "Total GPU memory available for model loading",
    totalMemory: "Total Memory",

    // Concurrency memory breakdown
    gpuInfo: "GPU Info",
    singleGpuMemory: "Single GPU Memory",
    fixedMemory: "Fixed Memory Usage",
    kvCacheInfo: "KVCache Info",
    availableKvCacheMemory: "Available KVCache Memory",
    singleTokenKvCache: "Single Token KVCache",
    singleConcurrencyKvCache: "Single Concurrency KVCache",
    maxConcurrencyLabel: "Max Concurrency",
    kvCacheFormulas: "KVCache Formulas by Architecture",
    linearModels: "Linear / SSM Models",
    linearModelsNote: "Fixed state size, no per-token KV cache growth",
    hybridModels: "Hybrid Models",
    hybridModelsNote: "Combines multiple attention mechanisms, calculation varies by layer",

    // Status indicators
    statusGood: "Good",
    statusWarning: "Warning",
    statusLow: "Low",
  },
  zh: {
    // Page title
    mfuCalculator: "MFU 计算器",
    calculateMfuDescription: "计算 LLM 推理的模型 FLOPs 利用率和显存带宽使用率",

    // Navigation
    hardwareUtilization: "硬件利用率",
    concurrency: "并发计算",
    management: "管理",
    managementDesc: "管理硬件配置和模型规格",

    // Form labels
    inputParameters: "输入参数",
    hardware: "硬件",
    selectHardware: "选择硬件",
    model: "模型",
    selectModel: "选择模型",
    gpuCount: "卡数",
    latencyInformation: "延迟信息",
    firstTokenLatency: "首 Token 延迟 (ms)",
    tpot: "TPOT (ms)",
    contextInformation: "上下文信息",
    contextLength: "上下文长度 (tokens)",
    generatedLength: "生成长度 (tokens)",
    batchSize: "批大小 / 并发数",
    precision: "精度",
    attentionPrecision: "Attention 精度",
    ffnPrecision: "FFN 精度",
    calculateMfu: "计算 MFU",
    calculating: "计算中...",

    // Concurrency calculator
    concurrencyCalculator: "并发计算器",
    concurrencyCalculatorDescription: "基于显存限制计算最大并发请求数",
    calculateMaxConcurrency: "计算最大并发",
    frameworkOverhead: "框架开销",
    frameworkPreset: "框架预设",
    overheadGb: "开销 (GB)",
    activationReserve: "激活预留",
    gpuUtilization: "GPU 利用率",
    maxConcurrency: "最大并发数",
    withoutPagedAttention: "不考虑 Paged Attention",
    withPagedAttention: "考虑 Paged Attention",
    withoutPA: "不考虑PA",
    withPA: "考虑PA",
    requests: "个请求",
    memoryBreakdown: "显存占用明细",
    item: "项目",
    singleRequest: "单并发",
    total: "总占用",
    weightMemory: "权重占用",
    kvCacheMemory: "KVCache 占用",
    activationMemory: "激活预留",
    hardwareMemory: "硬件显存",
    usedMemory: "已用显存",
    availableMemory: "可用显存",
    runCalculationToSeeDetails: "运行计算以查看显存详情",

    // Messages
    pleaseSelectHardwareModel: "请选择硬件和模型",
    invalidSelection: "无效的硬件或模型选择",
    calculationCompleted: "计算完成",
    calculationFailed: "计算失败",

    // Results
    results: "结果",
    comparison: "对比",
    mfu: "MFU",
    memoryBandwidthUtilization: "显存带宽使用率",
    bottleneck: "瓶颈",
    theoreticalFlops: "理论 FLOPS",
    actualFlops: "实际 FLOPS",
    optimizationSuggestions: "优化建议",
    computeLimited: "计算受限",
    memoryLimited: "访存受限",
    balanced: "平衡",

    // Hardware management
    hardwareManagement: "硬件管理",
    addHardware: "添加硬件",
    addHardwareDesc: "添加新的硬件配置用于 MFU 计算。",
    editHardware: "编辑硬件",
    editHardwareDesc: "更新用于 MFU 计算的硬件配置。",
    deleteHardware: "删除硬件",
    deleteHardwareConfirm: "确定要删除此硬件吗？此操作无法撤销。",
    name: "名称",
    fp16PeakTflops: "FP16 峰值 (TFLOPS)",
    bf16PeakTflops: "BF32 峰值 (TFLOPS)",
    int8PeakTops: "INT8 峰值 (TOPS)",
    memorySize: "显存大小 (GB)",
    memoryBandwidth: "显存带宽 (TB/s)",

    // Messages
    nameRequired: "名称不能为空",
    hardwareAdded: "硬件已添加",
    hardwareUpdated: "硬件已更新",
    hardwareDeleted: "硬件已删除",
    templateDownloaded: "模板已下载",
    importHardwareSuccess: "成功导入 {count} 条硬件配置",
    importHardwareFailed: "解析 CSV 文件失败",
    modelAdded: "模型已添加",
    modelUpdated: "模型已更新",
    modelDeleted: "模型已删除",
    hfIdRequired: "请输入 Hugging Face 模型 ID",
    fetchConfigFailed: "从 Hugging Face 获取模型配置失败",
    fetchConfigSuccess: "模型配置获取成功",
    reviewBeforeSaving: "保存前请检查配置",

    // Model management
    modelManagement: "模型管理",
    addModel: "添加模型",
    editModel: "编辑模型",
    editModelDesc: "更新模型配置参数。",
    huggingfaceId: "Hugging Face ID",
    paramsBillions: "参数量 (Billion)",
    numLayers: "层数",
    hiddenSize: "隐藏层维度",
    numAttentionHeads: "注意力头数",
    numKeyValueHeads: "KV 头数",
    vocabSize: "词表大小",
    intermediateSize: "中间层维度",
    headDim: "注意力头维度",
    maxPositionEmbeddings: "最大位置编码长度",
    importFromHf: "从 Hugging Face 导入",
    preview: "预览",

    // Actions
    save: "保存",
    cancel: "取消",
    delete: "删除",
    edit: "编辑",
    clear: "清除",
    clearAll: "全部清除",
    export: "导出",
    import: "导入",
    downloadTemplate: "下载模板",
    importHardware: "导入硬件",
    importModels: "导入模型",
    manualEntry: "手动输入",
    actions: "操作",

    // Theme
    theme: "主题",
    light: "浅色",
    dark: "深色",
    system: "系统",

    // Language
    language: "语言",
    english: "English",
    chinese: "中文",

    // Management page descriptions
    hardwareConfigDesc: "管理用于 MFU 计算的 GPU 和加速器规格。您可以下载模板，填写硬件规格，然后通过 CSV 导入。",
    modelConfigDesc: "管理模型规格。您可以直接从 Hugging Face 获取模型配置，也可以手动输入。",

    // Optimization suggestions
    optHigherComputeHardware: "系统受计算限制。考虑使用更高算力的硬件。",
    optTensorCoreOpt: "检测到 MFU 较低。启用 Tensor Core 优化（如可用）。",
    optUseQuantization: "考虑使用量化 (INT8/INT4) 减少计算需求。",
    optFlashAttention: "考虑使用 Flash Attention 以提高计算效率。",
    optHigherMemoryBandwidth: "系统受显存带宽限制。考虑使用更高带宽的硬件。",
    optReduceBatchSize: "显存带宽已饱和。减小批大小或使用模型压缩。",
    optKVCacheQuant: "考虑使用 KV Cache 量化以减少内存流量。",
    optContinuousBatching: "考虑使用连续批处理以提高内存效率。",
    optBalanced: "系统在计算和内存之间平衡。当前配置高效。",
    optScaleBatchSize: "利用率良好。考虑增大批大小以提高吞吐量。",

    // Hardware info card
    hardwareInfo: "硬件信息",
    hardwareInfoTip: "可用于模型加载的 GPU 显存总量",
    totalMemory: "总显存",

    // Concurrency memory breakdown
    gpuInfo: "GPU 信息",
    singleGpuMemory: "单卡显存",
    fixedMemory: "固定显存占用",
    kvCacheInfo: "KVCache 信息",
    availableKvCacheMemory: "KVCache 可用显存",
    singleTokenKvCache: "单Token KVCache",
    singleConcurrencyKvCache: "单并发 KVCache",
    maxConcurrencyLabel: "最大并发数",
    kvCacheFormulas: "不同架构的 KVCache 计算公式",
    linearModels: "线性 / SSM 模型",
    linearModelsNote: "固定状态大小，无随序列长度增长的 KVCache",
    hybridModels: "混合模型",
    hybridModelsNote: "结合多种注意力机制，计算方式因层而异",

    // Status indicators
    statusGood: "良好",
    statusWarning: "警告",
    statusLow: "过低",
  },
} as const;

type TranslationKey = keyof typeof translations.en;

interface LanguageStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

// Detect if we're on the client side
const isClient = typeof window !== "undefined";

// Get initial language from localStorage or use default
function getInitialLanguage(): Language {
  if (!isClient) return "en";
  try {
    const stored = localStorage.getItem("language-storage");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.state && parsed.state.language) {
        return parsed.state.language;
      }
    }
  } catch {
    // ignore
  }
  return "en";
}

// Direct translation function that doesn't depend on store
function translate(key: TranslationKey, language: Language): string {
  const translationSet = translations[language] || translations.en;
  return (translationSet as Record<string, string>)[key] || key;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set, get) => ({
      language: isClient ? getInitialLanguage() : "en",
      setLanguage: (language) => set({ language }),
      t: (key: TranslationKey, params?: Record<string, string | number>): string => {
        const { language } = get();
        const translationSet = translations[language] || translations.en;
        let text = (translationSet as Record<string, string>)[key] || key;
        if (params) {
          Object.entries(params).forEach(([k, v]) => {
            text = text.replace(`{${k}}`, String(v));
          });
        }
        return text;
      },
    }),
    {
      name: "language-storage",
      storage: createJSONStorage(() => (isClient ? localStorage : {})),
    }
  )
);

// Hook to detect if component has mounted (for hydration safety)
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}

// Hook for language with hydration safety - returns placeholder during SSR
export function useLanguage(): {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  isHydrated: boolean;
} {
  const store = useLanguageStore();
  const mounted = useHasMounted();

  const t = useMemo(() => {
    if (!mounted) {
      // During SSR, return a function that returns the key itself
      return (key: TranslationKey) => key;
    }
    return store.t;
  }, [store.t, mounted]);

  return {
    language: store.language,
    setLanguage: store.setLanguage,
    t,
    isHydrated: mounted,
  };
}

// Safe translation hook - returns translated text only after hydration
export function useTranslation(key: TranslationKey): string {
  const { t, isHydrated } = useLanguage();
  return t(key);
}

// Get translation by key and language (static, doesn't cause re-renders)
export function getTranslation(key: TranslationKey, language: Language): string {
  return translate(key, language);
}
