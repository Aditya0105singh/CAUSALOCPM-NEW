"use client";
import { useState } from "react";
import { clsx } from "clsx";
import {
  BarChart3,
  Bot,
  Database,
  LayoutGrid,
  Lightbulb,
  Search,
  Settings as SettingsIcon,
} from "lucide-react";
import type { CausalFixture, DomainId } from "@/lib/engine/types";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { OverviewTab } from "./tabs/OverviewTab";
import { DataDiscoveryTab } from "./tabs/DataDiscoveryTab";
import { ModelPerformanceTab } from "./tabs/ModelPerformanceTab";
import { CaseInspectorTab } from "./tabs/CaseInspectorTab";
import { DecisionIntelligenceTab } from "./tabs/DecisionIntelligenceTab";
import { CopilotTab } from "./tabs/CopilotTab";
import { SettingsTab } from "./tabs/SettingsTab";

const TABS = [
  { id: "overview", label: "Overview", sub: "Process summary", icon: LayoutGrid },
  { id: "data", label: "Data & Discovery", sub: "Explore your data", icon: Database },
  { id: "model", label: "Model Performance", sub: "Causal analysis", icon: BarChart3 },
  { id: "case", label: "Case Inspector", sub: "Drill into one case", icon: Search },
  { id: "decision", label: "Decision Intelligence", sub: "Insights to action", icon: Lightbulb },
  { id: "copilot", label: "Copilot", sub: "AI assistant", icon: Bot },
  { id: "settings", label: "Settings", sub: "Scenario & data", icon: SettingsIcon },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function Console({ fixtures }: { fixtures: Record<DomainId, CausalFixture> }) {
  const [domain, setDomain] = useState<DomainId>("manufacturing");
  const [tab, setTab] = useState<TabId>("overview");
  const f = fixtures[domain];

  return (
    <div className="mx-auto flex min-h-screen max-w-[1400px]">
      <Sidebar fixtures={fixtures} domain={domain} onDomain={setDomain} />

      <main className="flex-1 px-5 py-6 sm:px-8">
        <TopBar f={f} domain={domain} />

        {/* mobile domain switch */}
        <div className="mb-4 flex gap-2 lg:hidden">
          {(Object.keys(fixtures) as DomainId[]).map((d) => (
            <button
              key={d}
              onClick={() => setDomain(d)}
              className={clsx(
                "rounded-lg border px-3 py-1.5 text-sm capitalize",
                d === domain ? "border-forest/40 bg-sage text-forest-deep" : "border-line bg-card text-muted",
              )}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="scroll-slim -mx-1 mb-5 flex gap-1 overflow-x-auto border-b border-line px-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  "flex shrink-0 items-center gap-2 px-3 py-2.5 text-left",
                  active ? "tab-underline" : "",
                )}
              >
                <Icon size={15} className={active ? "text-forest" : "text-muted"} />
                <span>
                  <span className={clsx("block text-[13px]", active ? "font-semibold text-ink" : "text-muted")}>
                    {t.label}
                  </span>
                  <span className="block text-[10px] text-muted">{t.sub}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div key={domain + tab}>
          {tab === "overview" && <OverviewTab f={f} />}
          {tab === "data" && <DataDiscoveryTab f={f} />}
          {tab === "model" && <ModelPerformanceTab f={f} />}
          {tab === "case" && <CaseInspectorTab f={f} />}
          {tab === "decision" && <DecisionIntelligenceTab f={f} />}
          {tab === "copilot" && <CopilotTab f={f} domain={domain} />}
          {tab === "settings" && <SettingsTab f={f} />}
        </div>

        <footer className="mt-10 border-t border-line pt-4 text-[11px] text-muted">
          CausalOCPM · A Causal Audit Layer for Agentic AI Decisions · Object-Centric Process Mining × Structural Causal Models
        </footer>
      </main>
    </div>
  );
}
