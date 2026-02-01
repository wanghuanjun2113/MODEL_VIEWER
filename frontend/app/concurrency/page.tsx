"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { ConcurrencyForm } from "@/components/concurrency/concurrency-form";
import { ConcurrencyResults } from "@/components/concurrency/concurrency-results";
import { useLanguageStore } from "@/lib/i18n";
import type { ConcurrencyResult } from "@/lib/types";

export default function ConcurrencyPage() {
  const { t } = useLanguageStore();
  const [result, setResult] = useState<ConcurrencyResult | null>(null);
  const [key, setKey] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCalculate = (newResult: ConcurrencyResult) => {
    setResult(newResult);
    setKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-balance">
            {mounted ? t("concurrencyCalculator") : "Concurrency Calculator"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {mounted ? t("concurrencyCalculatorDescription") : "Calculate maximum concurrent requests based on memory constraints"}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="space-y-8">
            <ConcurrencyForm onCalculate={handleCalculate} />
          </div>
          <aside key={key} className="lg:sticky lg:top-20 lg:h-fit">
            <ConcurrencyResults result={result} />
          </aside>
        </div>
      </main>
    </div>
  );
}
