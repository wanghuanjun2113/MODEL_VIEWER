/// <reference types="vitest" />
import "@testing-library/jest-dom";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});

// Mock window.crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: () => Math.random().toString(36).substring(2, 15),
  },
  writable: true,
});
