"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { apiClient, toBackendHardware, toBackendModel } from "./api";
import type {
  Hardware,
  Model,
  CalculationResult,
  HardwareFormData,
  ModelFormData,
  CalculationInput,
  ConcurrencyInput,
  ConcurrencyResult,
} from "./types";

// Default hardware presets - 昇腾系列
const defaultHardware: Hardware[] = [
  {
    id: "1",
    name: "昇腾910B4 32G",
    fp16_peak_tflops: 280,
    bf16_peak_tflops: 140,
    int8_peak_tops: 560,
    memory_size_gb: 32,
    memory_bandwidth_tbps: 1.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    name: "昇腾910B4-1 64G",
    fp16_peak_tflops: 280,
    bf16_peak_tflops: 140,
    int8_peak_tops: 560,
    memory_size_gb: 64,
    memory_bandwidth_tbps: 1.2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    name: "昇腾300I Duo 96G",
    fp16_peak_tflops: 140,
    bf16_peak_tflops: 70,
    int8_peak_tops: 280,
    memory_size_gb: 96,
    memory_bandwidth_tbps: 0.408,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "4",
    name: "昇腾300v Pro 48G",
    fp16_peak_tflops: 140,
    bf16_peak_tflops: 70,
    int8_peak_tops: 280,
    memory_size_gb: 48,
    memory_bandwidth_tbps: 0.408,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Default model presets - Qwen3, DeepSeek, Magistral 系列
const defaultModels: Model[] = [
  {
    id: "1",
    name: "Qwen3-30B-A3B",
    huggingface_id: "Qwen/Qwen3-30B-A3B",
    params_billions: 30.5,
    num_layers: 48,
    hidden_size: 2048,
    num_attention_heads: 32,
    num_key_value_heads: 4,
    vocab_size: 151936,
    intermediate_size: 6144,
    head_dim: 128,
    max_position_embeddings: 32768,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Qwen3-32B",
    huggingface_id: "Qwen/Qwen3-32B",
    params_billions: 32,
    num_layers: 64,
    hidden_size: 5120,
    num_attention_heads: 40,
    num_key_value_heads: 8,
    vocab_size: 151936,
    intermediate_size: 27648,
    head_dim: 128,
    max_position_embeddings: 40960,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Qwen3-8B",
    huggingface_id: "Qwen/Qwen3-8B",
    params_billions: 8,
    num_layers: 36,
    hidden_size: 4096,
    num_attention_heads: 32,
    num_key_value_heads: 8,
    vocab_size: 151936,
    intermediate_size: 12288,
    head_dim: 128,
    max_position_embeddings: 32768,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "4",
    name: "DeepSeek-V3.2",
    huggingface_id: "deepseek-ai/DeepSeek-V3.2",
    params_billions: 685,
    num_layers: 61,
    hidden_size: 7168,
    num_attention_heads: 128,
    num_key_value_heads: 128,
    vocab_size: 129280,
    intermediate_size: 2048,
    head_dim: 128,
    max_position_embeddings: 163840,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "5",
    name: "Magistral-Small-2509",
    huggingface_id: "mistralai/Magistral-Small-2509",
    params_billions: 24,
    num_layers: 28,
    hidden_size: 6144,
    num_attention_heads: 48,
    num_key_value_heads: 8,
    vocab_size: 32768,
    intermediate_size: 16384,
    head_dim: 128,
    max_position_embeddings: 32768,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Default form input
const defaultFormInput: CalculationInput = {
  hardware_id: "",
  model_id: "",
  gpu_count: 1,
  precision: "FP16",
  attention_precision: "FP16",
  ffn_precision: "FP16",
  first_token_latency_ms: 100,
  tpot_ms: 20,
  context_length: 2048,
  generated_length: 256,
  batch_size: 1,
};

// Default concurrency form input
const defaultConcurrencyInput: ConcurrencyInput = {
  hardware_id: "",
  model_id: "",
  gpu_count: 1,
  context_length: 4096,
  attention_precision: "FP16",
  framework_overhead_gb: 8,  // 系统框架开销默认8G
  gpu_utilization: 0.9,  // 90% GPU utilization, 10% reserved for activations
};

interface MFUStore {
  // Configuration
  useApi: boolean;
  setUseApi: (useApi: boolean) => void;
  isLoading: boolean;

  // Version for migration
  version: number;

  // Form input state (persisted)
  formInput: CalculationInput;
  setFormInput: (input: Partial<CalculationInput>) => void;
  resetFormInput: () => void;

  // Concurrency form input state (persisted)
  concurrencyInput: ConcurrencyInput;
  setConcurrencyInput: (input: Partial<ConcurrencyInput>) => void;
  resetConcurrencyInput: () => void;

  // Hardware
  hardware: Hardware[];
  addHardware: (data: HardwareFormData) => Promise<void>;
  updateHardware: (id: string, data: HardwareFormData) => Promise<void>;
  deleteHardware: (id: string) => Promise<void>;
  importHardware: (items: Hardware[]) => void;
  fetchHardware: () => Promise<void>;

  // Models
  models: Model[];
  addModel: (data: ModelFormData) => Promise<void>;
  updateModel: (id: string, data: ModelFormData) => Promise<void>;
  deleteModel: (id: string) => Promise<void>;
  fetchModels: () => Promise<void>;

  // Calculation results
  results: CalculationResult[];
  addResult: (result: CalculationResult) => void;
  deleteResult: (id: string) => void;
  clearResults: () => void;

  // Concurrency results
  concurrencyResults: ConcurrencyResult[];
  addConcurrencyResult: (result: ConcurrencyResult) => void;
  deleteConcurrencyResult: (id: string) => void;
  clearConcurrencyResults: () => void;
}

export const useMFUStore = create<MFUStore>()(
  persist(
    (set, get) => ({
      // Configuration
      useApi: false,
      isLoading: false,
      setUseApi: (useApi) => set({ useApi }),

      // Version for migration
      version: 3,

      // Form input state
      formInput: defaultFormInput,
      setFormInput: (input) =>
        set((state) => ({
          formInput: { ...state.formInput, ...input },
        })),
      resetFormInput: () => set({ formInput: defaultFormInput }),

      // Concurrency form input state
      concurrencyInput: defaultConcurrencyInput,
      setConcurrencyInput: (input) =>
        set((state) => ({
          concurrencyInput: { ...state.concurrencyInput, ...input },
        })),
      resetConcurrencyInput: () => set({ concurrencyInput: defaultConcurrencyInput }),

      // Hardware
      hardware: defaultHardware,
      addHardware: async (data) => {
        const { useApi } = get();
        if (useApi) {
          try {
            set({ isLoading: true });
            const backendData = toBackendHardware(data);
            const created = await apiClient.createHardware(backendData);
            const newHardware = {
              id: String(created.id),
              ...data,
              bf16_peak_tflops: created.bf32_peak_tflops,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            set((state) => ({ hardware: [...state.hardware, newHardware], isLoading: false }));
          } catch {
            set({ isLoading: false });
            throw new Error("Failed to create hardware");
          }
        } else {
          set((state) => ({
            hardware: [
              ...state.hardware,
              {
                ...data,
                id: String(Date.now()),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          }));
        }
      },
      updateHardware: async (id, data) => {
        const { useApi } = get();
        if (useApi) {
          try {
            set({ isLoading: true });
            const backendData = toBackendHardware(data);
            await apiClient.updateHardware(Number(id), backendData);
            set((state) => ({
              hardware: state.hardware.map((h) =>
                h.id === id
                  ? { ...h, ...data, updated_at: new Date().toISOString() }
                  : h
              ),
              isLoading: false,
            }));
          } catch {
            set({ isLoading: false });
            throw new Error("Failed to update hardware");
          }
        } else {
          set((state) => ({
            hardware: state.hardware.map((h) =>
              h.id === id
                ? { ...h, ...data, updated_at: new Date().toISOString() }
                : h
            ),
          }));
        }
      },
      deleteHardware: async (id) => {
        const { useApi } = get();
        if (useApi) {
          try {
            set({ isLoading: true });
            await apiClient.deleteHardware(Number(id));
            set((state) => ({
              hardware: state.hardware.filter((h) => h.id !== id),
              isLoading: false,
            }));
          } catch {
            set({ isLoading: false });
            throw new Error("Failed to delete hardware");
          }
        } else {
          set((state) => ({
            hardware: state.hardware.filter((h) => h.id !== id),
          }));
        }
      },
      importHardware: (items) =>
        set((state) => ({
          hardware: [
            ...state.hardware,
            ...items.map((item) => ({
              ...item,
              id: String(Date.now() + Math.random()),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })),
          ],
        })),
      fetchHardware: async () => {
        const { useApi } = get();
        if (!useApi) return;
        try {
          set({ isLoading: true });
          const hardware = await apiClient.getHardware();
          set({
            hardware: hardware.map((h) => ({
              id: String(h.id),
              name: h.name,
              fp16_peak_tflops: h.fp16_peak_tflops,
              bf16_peak_tflops: h.bf32_peak_tflops,
              fp32_peak_tflops: h.fp32_peak_tflops,
              memory_size_gb: h.memory_size_gb,
              memory_bandwidth_tbps: h.memory_bandwidth_tbps,
              created_at: h.created_at || new Date().toISOString(),
              updated_at: h.updated_at || new Date().toISOString(),
            })),
            isLoading: false,
          });
        } catch {
          set({ isLoading: false });
        }
      },

      // Models
      models: defaultModels,
      addModel: async (data) => {
        const { useApi } = get();
        if (useApi) {
          try {
            set({ isLoading: true });
            const backendData = toBackendModel(data);
            const created = await apiClient.createModel(backendData);
            const newModel = {
              id: String(created.id),
              ...data,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            set((state) => ({ models: [...state.models, newModel], isLoading: false }));
          } catch {
            set({ isLoading: false });
            throw new Error("Failed to create model");
          }
        } else {
          set((state) => ({
            models: [
              ...state.models,
              {
                ...data,
                id: String(Date.now()),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          }));
        }
      },
      updateModel: async (id, data) => {
        const { useApi } = get();
        if (useApi) {
          try {
            set({ isLoading: true });
            const backendData = toBackendModel(data);
            await apiClient.updateModel(Number(id), backendData);
            set((state) => ({
              models: state.models.map((m) =>
                m.id === id
                  ? { ...m, ...data, updated_at: new Date().toISOString() }
                  : m
              ),
              isLoading: false,
            }));
          } catch {
            set({ isLoading: false });
            throw new Error("Failed to update model");
          }
        } else {
          set((state) => ({
            models: state.models.map((m) =>
              m.id === id
                ? { ...m, ...data, updated_at: new Date().toISOString() }
                : m
            ),
          }));
        }
      },
      deleteModel: async (id) => {
        const { useApi } = get();
        if (useApi) {
          try {
            set({ isLoading: true });
            await apiClient.deleteModel(Number(id));
            set((state) => ({
              models: state.models.filter((m) => m.id !== id),
              isLoading: false,
            }));
          } catch {
            set({ isLoading: false });
            throw new Error("Failed to delete model");
          }
        } else {
          set((state) => ({
            models: state.models.filter((m) => m.id !== id),
          }));
        }
      },
      fetchModels: async () => {
        const { useApi } = get();
        if (!useApi) return;
        try {
          set({ isLoading: true });
          const models = await apiClient.getModels();
          set({
            models: models.map((m) => ({
              id: String(m.id),
              name: m.name,
              huggingface_id: m.huggingface_id,
              params_billions: m.params_billions,
              num_layers: m.num_layers,
              hidden_size: m.hidden_size,
              num_attention_heads: m.num_attention_heads,
              num_key_value_heads: m.num_key_value_heads,
              vocab_size: m.vocab_size,
              intermediate_size: m.intermediate_size,
              head_dim: m.head_dim,
              max_position_embeddings: m.max_position_embeddings,
              created_at: m.created_at || new Date().toISOString(),
              updated_at: m.updated_at || new Date().toISOString(),
            })),
            isLoading: false,
          });
        } catch {
          set({ isLoading: false });
        }
      },

      // Results
      results: [],
      addResult: (result) =>
        set((state) => ({
          results: [result, ...state.results],
        })),
      deleteResult: (id) =>
        set((state) => ({
          results: state.results.filter((r) => r.id !== id),
        })),
      clearResults: () => set({ results: [] }),

      // Concurrency results
      concurrencyResults: [],
      addConcurrencyResult: (result) =>
        set((state) => ({
          concurrencyResults: [result, ...state.concurrencyResults],
        })),
      deleteConcurrencyResult: (id) =>
        set((state) => ({
          concurrencyResults: state.concurrencyResults.filter((r) => r.id !== id),
        })),
      clearConcurrencyResults: () => set({ concurrencyResults: [] }),
    }),
    {
      name: "mfu-calculator-storage",
      version: 3, // Increment this to trigger migration
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: unknown, storedVersion: number) => {
        // storedVersion is the version from localStorage (0 if not set)
        // Current version is 3, so if storedVersion < 3, we need to migrate
        console.log('Migrate called with storedVersion:', storedVersion);

        if (storedVersion < 3) {
          // Return a fresh state with new presets
          // This completely replaces hardware and models with new presets
          const oldState = persistedState as Record<string, unknown>;
          return {
            ...oldState,
            hardware: defaultHardware,
            models: defaultModels,
            version: 3,
            concurrencyInput: defaultConcurrencyInput,
          };
        }

        const state = persistedState as Record<string, unknown>;

        // Ensure concurrencyInput has gpu_utilization field (migration for old stored data)
        if (state?.concurrencyInput && typeof state.concurrencyInput === 'object') {
          const input = state.concurrencyInput as Record<string, unknown>;
          if (input.gpu_utilization === undefined) {
            input.gpu_utilization = 0.9; // Default to 90%
          }
          // Update framework_overhead_gb default to 8GB
          if (input.framework_overhead_gb === undefined || input.framework_overhead_gb === 2) {
            input.framework_overhead_gb = 8;
          }
        }
        return state;
      },
    }
  )
);
