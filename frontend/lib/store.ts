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
} from "./types";

// Default hardware presets
const defaultHardware: Hardware[] = [
  {
    id: "1",
    name: "NVIDIA A100 40GB",
    fp16_peak_tflops: 312,
    bf16_peak_tflops: 312,
    int8_peak_tops: 624,
    memory_size_gb: 40,
    memory_bandwidth_tbps: 1.555,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    name: "NVIDIA A100 80GB",
    fp16_peak_tflops: 312,
    bf16_peak_tflops: 312,
    int8_peak_tops: 624,
    memory_size_gb: 80,
    memory_bandwidth_tbps: 2.039,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    name: "NVIDIA H100 SXM",
    fp16_peak_tflops: 1979,
    bf16_peak_tflops: 1979,
    int8_peak_tops: 3958,
    memory_size_gb: 80,
    memory_bandwidth_tbps: 3.35,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "4",
    name: "NVIDIA RTX 4090",
    fp16_peak_tflops: 330,
    bf16_peak_tflops: 330,
    int8_peak_tops: 660,
    memory_size_gb: 24,
    memory_bandwidth_tbps: 1.008,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "5",
    name: "NVIDIA L40S",
    fp16_peak_tflops: 362,
    bf16_peak_tflops: 362,
    int8_peak_tops: 724,
    memory_size_gb: 48,
    memory_bandwidth_tbps: 0.864,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "6",
    name: "NVIDIA T4",
    fp16_peak_tflops: 65,
    bf16_peak_tflops: 65,
    int8_peak_tops: 130,
    memory_size_gb: 16,
    memory_bandwidth_tbps: 0.32,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Default model presets
const defaultModels: Model[] = [
  {
    id: "1",
    name: "Llama 2 7B",
    huggingface_id: "meta-llama/Llama-2-7b-hf",
    params_billions: 7,
    num_layers: 32,
    hidden_size: 4096,
    num_attention_heads: 32,
    num_key_value_heads: 32,
    vocab_size: 32000,
    intermediate_size: 11008,
    head_dim: 128,
    max_position_embeddings: 4096,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    name: "Llama 2 13B",
    huggingface_id: "meta-llama/Llama-2-13b-hf",
    params_billions: 13,
    num_layers: 40,
    hidden_size: 5120,
    num_attention_heads: 40,
    num_key_value_heads: 40,
    vocab_size: 32000,
    intermediate_size: 13824,
    head_dim: 128,
    max_position_embeddings: 4096,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    name: "Llama 2 70B",
    huggingface_id: "meta-llama/Llama-2-70b-hf",
    params_billions: 70,
    num_layers: 80,
    hidden_size: 8192,
    num_attention_heads: 64,
    num_key_value_heads: 8,
    vocab_size: 32000,
    intermediate_size: 28672,
    head_dim: 128,
    max_position_embeddings: 4096,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "4",
    name: "Qwen 2 7B",
    huggingface_id: "Qwen/Qwen2-7B",
    params_billions: 7,
    num_layers: 28,
    hidden_size: 3584,
    num_attention_heads: 28,
    num_key_value_heads: 4,
    vocab_size: 152064,
    intermediate_size: 18944,
    head_dim: 128,
    max_position_embeddings: 131072,
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
  framework_overhead_gb: 2,
  activation_reserve_gb: 5,
};

interface MFUStore {
  // Configuration
  useApi: boolean;
  setUseApi: (useApi: boolean) => void;
  isLoading: boolean;

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
}

export const useMFUStore = create<MFUStore>()(
  persist(
    (set, get) => ({
      // Configuration
      useApi: false,
      isLoading: false,
      setUseApi: (useApi) => set({ useApi }),

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
    }),
    {
      name: "mfu-calculator-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
