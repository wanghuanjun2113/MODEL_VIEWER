"use client";

import { useState } from "react";
import { Header } from "@/components/header";
import { CalculatorForm } from "@/components/calculator/calculator-form";
import { ResultsPanel } from "@/components/calculator/results-panel";
import { ComparisonTable } from "@/components/calculator/comparison-table";

export default function CalculatorPage() {
  const [key, setKey] = useState(0);

  const handleCalculate = () => {
    setKey((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-balance">
            MFU Calculator
          </h1>
          <p className="mt-1 text-muted-foreground">
            Calculate Model FLOPs Utilization and memory bandwidth usage for LLM inference
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
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
