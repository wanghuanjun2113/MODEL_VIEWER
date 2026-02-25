"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/header";
import { CalculatorForm } from "@/components/calculator/calculator-form";
import { ResultsPanel } from "@/components/calculator/results-panel";
import { ComparisonTable } from "@/components/calculator/comparison-table";
import { useLanguageStore } from "@/lib/i18n";

export default function CalculatorPage() {
  const { t } = useLanguageStore();
  const [key, setKey] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCalculate = () => {
    setKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-balance">
            {mounted ? t("mfuCalculator") : "MFU Calculator"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {mounted ? t("calculateMfuDescription") : "Calculate Model FLOPs Utilization and memory bandwidth usage for LLM inference"}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[60%_40%]">
          <div className="space-y-8">
            <CalculatorForm onCalculate={handleCalculate} />
            <ComparisonTable />
          </div>
          <aside key={key} className="lg:sticky lg:top-20 lg:h-fit">
            <ResultsPanel />
          </aside>
        </div>
      </main>
    </div>
  );
}
