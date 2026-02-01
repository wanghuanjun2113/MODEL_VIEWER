/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { act } from "react";
import { renderHook, cleanup } from "@testing-library/react";
import { useMFUStore } from "./store";
import type { CalculationResult } from "./types";

describe("MFU Store", () => {
  beforeEach(() => {
    cleanup();
    // Reset store to default state
    localStorage.clear();
  });

  describe("initial state", () => {
    it("should have default hardware presets", () => {
      const { result } = renderHook(() => useMFUStore());
      expect(result.current.hardware.length).toBeGreaterThan(0);
      expect(result.current.hardware.some((h) => h.name.includes("A100"))).toBe(true);
    });

    it("should have default model presets", () => {
      const { result } = renderHook(() => useMFUStore());
      expect(result.current.models.length).toBeGreaterThan(0);
      expect(result.current.models.some((m) => m.name.includes("Llama"))).toBe(true);
    });

    it("should start with empty results", () => {
      const { result } = renderHook(() => useMFUStore());
      expect(result.current.results).toEqual([]);
    });

    it("should start with useApi disabled", () => {
      const { result } = renderHook(() => useMFUStore());
      expect(result.current.useApi).toBe(false);
    });
  });

  describe("results operations", () => {
    it("should add calculation result", () => {
      const { result } = renderHook(() => useMFUStore());

      const mockResult: CalculationResult = {
        id: "test-result-1",
        input: {
          hardware_id: "1",
          model_id: "1",
          precision: "FP16",
          first_token_latency_ms: 100,
          tpot_ms: 20,
          context_length: 2048,
          generated_length: 256,
          batch_size: 1,
        },
        hardware: result.current.hardware[0],
        model: result.current.models[0],
        mfu: 45.5,
        memory_bandwidth_utilization: 30.2,
        theoretical_flops: 100,
        actual_flops: 45.5,
        bottleneck_type: "balanced",
        prefill_flops: 50,
        decode_flops: 50,
        kv_cache_size_gb: 1.5,
        optimization_suggestions: ["Test suggestion"],
        timestamp: new Date().toISOString(),
      };

      const initialLength = result.current.results.length;
      act(() => {
        result.current.addResult(mockResult);
      });

      expect(result.current.results.length).toBe(initialLength + 1);
    });

    it("should toggle API mode", () => {
      const { result } = renderHook(() => useMFUStore());

      expect(result.current.useApi).toBe(false);

      act(() => {
        result.current.setUseApi(true);
      });

      expect(result.current.useApi).toBe(true);

      act(() => {
        result.current.setUseApi(false);
      });

      expect(result.current.useApi).toBe(false);
    });
  });
});
