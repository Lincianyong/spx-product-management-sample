"use client";

import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

// shadcn-style chart wrapper around recharts.
// One ChartContainer establishes the config (label + color per series),
// theming, and the responsive bounds. Charts inside use the series keys
// from config to render colors and tooltip labels consistently.

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    color?: string;
    icon?: React.ComponentType;
  };
};

type ChartContextValue = { config: ChartConfig };
const ChartContext = React.createContext<ChartContextValue | null>(null);

function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("useChart must be used inside <ChartContainer>");
  return ctx;
}

export function ChartContainer({
  id,
  config,
  className,
  children,
}: {
  id?: string;
  config: ChartConfig;
  className?: string;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${(id ?? uniqueId).replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "w-full h-full text-[12px]",
          // Style recharts internals to match the editorial palette
          "[&_.recharts-cartesian-axis-tick_text]:fill-[var(--ink-3)]",
          "[&_.recharts-cartesian-grid_line]:stroke-[var(--rule-soft)]",
          "[&_.recharts-reference-line_line]:stroke-[var(--warn)]",
          "[&_.recharts-tooltip-cursor]:fill-[var(--accent-soft)] [&_.recharts-tooltip-cursor]:opacity-50",
          "[&_.recharts-default-tooltip]:!bg-[var(--bg-card)] [&_.recharts-default-tooltip]:!border-[var(--rule)] [&_.recharts-default-tooltip]:!shadow-lg",
          "[&_.recharts-active-dot]:stroke-[var(--bg-card)]",
          className
        )}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const entries = Object.entries(config).filter(([, c]) => c.color);
  if (entries.length === 0) return null;
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          [data-chart=${id}] {
            ${entries.map(([key, c]) => `--color-${key}: ${c.color};`).join("\n")}
          }
        `,
      }}
    />
  );
}

export const ChartTooltip = RechartsPrimitive.Tooltip;

export function ChartTooltipContent({
  active,
  payload,
  label,
  hideLabel = false,
  hideIndicator = false,
  indicator = "dot",
  className,
  labelFormatter,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number | string; color?: string; dataKey?: string; payload?: Record<string, unknown> }>;
  label?: string | number;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: "dot" | "line";
  className?: string;
  labelFormatter?: (label: unknown, payload: unknown[]) => React.ReactNode;
  formatter?: (value: unknown, name: unknown, item: unknown) => React.ReactNode;
}) {
  const { config } = useChart();
  if (!active || !payload?.length) return null;

  const labelNode = hideLabel
    ? null
    : labelFormatter
    ? labelFormatter(label, payload)
    : label;

  return (
    <div
      className={cn(
        "rounded-[8px] border border-rule bg-bg-card px-3 py-2 shadow-lg text-[12px] min-w-[140px]",
        className
      )}
    >
      {labelNode != null && (
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 mb-1.5">
          {labelNode}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((item, i) => {
          const key = (item.dataKey as string) ?? item.name ?? String(i);
          const c = config[key as keyof typeof config];
          const itemColor = item.color ?? c?.color ?? "var(--accent)";
          return (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {!hideIndicator && (
                  indicator === "dot" ? (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: itemColor }}
                    />
                  ) : (
                    <span
                      className="w-3 h-[2px] shrink-0"
                      style={{ background: itemColor }}
                    />
                  )
                )}
                <span className="text-ink-2">{c?.label ?? item.name ?? key}</span>
              </div>
              <span className="font-mono text-ink tabular-nums">
                {formatter ? formatter(item.value, item.name, item) : String(item.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ChartLegend = RechartsPrimitive.Legend;

export function ChartLegendContent({
  payload,
  className,
}: {
  payload?: Array<{ value?: string; color?: string; dataKey?: string }>;
  className?: string;
}) {
  const { config } = useChart();
  if (!payload?.length) return null;
  return (
    <div className={cn("flex items-center justify-center gap-4 flex-wrap pt-2", className)}>
      {payload.map((item, i) => {
        const key = item.dataKey ?? item.value ?? String(i);
        const c = config[key];
        return (
          <div key={i} className="flex items-center gap-1.5 text-[11px] text-ink-3 font-mono uppercase tracking-[0.06em]">
            <span
              className="w-2 h-2 rounded-[2px]"
              style={{ background: item.color ?? c?.color ?? "var(--accent)" }}
            />
            <span>{c?.label ?? item.value}</span>
          </div>
        );
      })}
    </div>
  );
}
