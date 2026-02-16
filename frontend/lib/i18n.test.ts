/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { act } from "react";
import { renderHook, cleanup } from "@testing-library/react";
import { useLanguageStore, translations, type Language, type TranslationKey } from "./i18n";

describe("i18n", () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
  });

  describe("useLanguageStore", () => {
    it("should have default language as English", () => {
      const { result } = renderHook(() => useLanguageStore());
      expect(result.current.language).toBe("en");
    });

    it("should switch language to Chinese", () => {
      const { result } = renderHook(() => useLanguageStore());

      act(() => {
        result.current.setLanguage("zh");
      });
      expect(result.current.language).toBe("zh");
    });

    it("should switch language back to English", () => {
      const { result } = renderHook(() => useLanguageStore());

      act(() => {
        result.current.setLanguage("zh");
      });
      expect(result.current.language).toBe("zh");

      act(() => {
        result.current.setLanguage("en");
      });
      expect(result.current.language).toBe("en");
    });
  });

  describe("translations", () => {
    it("should have translations for English", () => {
      expect(translations.en).toBeDefined();
      expect(translations.en.mfuCalculator).toBe("MFU Calculator");
      expect(translations.en.calculate).toBeUndefined(); // Key doesn't exist
    });

    it("should have translations for Chinese", () => {
      expect(translations.zh).toBeDefined();
      expect(translations.zh.mfuCalculator).toBe("MFU 计算器");
    });

    it("should have the same keys in both languages", () => {
      const enKeys = Object.keys(translations.en) as TranslationKey[];
      const zhKeys = Object.keys(translations.zh) as TranslationKey[];

      expect(enKeys.sort()).toEqual(zhKeys.sort());
    });

    it("should have all required keys", () => {
      const requiredKeys: TranslationKey[] = [
        "mfuCalculator",
        "calculateMfuDescription",
        "hardware",
        "model",
        "precision",
        "calculateMfu",
        "results",
        "save",
        "cancel",
        "delete",
        "language",
        "english",
        "chinese",
      ];

      requiredKeys.forEach((key) => {
        expect(translations.en[key]).toBeDefined();
        expect(translations.zh[key]).toBeDefined();
      });
    });
  });

  describe("t function", () => {
    it("should translate key to English by default", () => {
      const { result } = renderHook(() => useLanguageStore());

      expect(result.current.t("mfuCalculator")).toBe("MFU Calculator");
      expect(result.current.t("hardware")).toBe("Hardware");
    });

    it("should translate key to Chinese when language is set to zh", () => {
      const { result } = renderHook(() => useLanguageStore());

      act(() => {
        result.current.setLanguage("zh");
      });

      expect(result.current.t("mfuCalculator")).toBe("MFU 计算器");
      expect(result.current.t("hardware")).toBe("硬件");
    });

    it("should return key itself if translation not found", () => {
      const { result } = renderHook(() => useLanguageStore());

      const unknownKey = "unknownKey12345" as TranslationKey;
      expect(result.current.t(unknownKey)).toBe(unknownKey);
    });

    it("should handle params replacement", () => {
      const { result } = renderHook(() => useLanguageStore());

      act(() => {
        result.current.setLanguage("zh");
      });
      const text = result.current.t("importHardwareSuccess", { count: 5 });
      expect(text).toBe("成功导入 5 条硬件配置");
    });

    it("should handle numeric params", () => {
      const { result } = renderHook(() => useLanguageStore());

      act(() => {
        result.current.setLanguage("zh");
      });
      const text = result.current.t("importHardwareSuccess", { count: 100 });
      expect(text).toBe("成功导入 100 条硬件配置");
    });

    it("should preserve English translations when switching language back", () => {
      const { result } = renderHook(() => useLanguageStore());

      // Set to Chinese
      act(() => {
        result.current.setLanguage("zh");
      });
      expect(result.current.t("mfuCalculator")).toBe("MFU 计算器");

      // Switch back to English
      act(() => {
        result.current.setLanguage("en");
      });
      expect(result.current.t("mfuCalculator")).toBe("MFU Calculator");
    });
  });

  describe("Language type", () => {
    it("should accept valid language values", () => {
      const { result } = renderHook(() => useLanguageStore());

      act(() => {
        result.current.setLanguage("en");
      });
      expect(result.current.language).toBe("en");

      act(() => {
        result.current.setLanguage("zh");
      });
      expect(result.current.language).toBe("zh");
    });
  });
});
