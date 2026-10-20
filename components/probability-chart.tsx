"use client";

import { useMemo, useRef, useState } from "react";
import { formatCredits, formatPercent } from "@/lib/format";
import type { HistoryPoint } from "@/lib/market-history";

const RANGES = [
  { id: "1D", label: "1D", ms: 24 * 60 * 60 * 1000 },
  { id: "1W", label: "1W", ms: 7 * 24 * 60 * 60 * 1000 },
  { id: "ALL", label: "All", ms: null },
] as const;

type RangeId = (typeof RANGES)[number]["id"];

const WIDTH = 640;
const HEIGHT = 220;
const LEFT = 40;
const RIGHT = 12;
const TOP = 14;
const BOTTOM = 26;
const PLOT_WIDTH = WIDTH - LEFT - RIGHT;
const PLOT_HEIGHT = HEIGHT - TOP - BOTTOM;
const GRID_VALUES = [0, 25, 50, 75, 100];

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatAxisDate(value: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function ProbabilitySparkline({
  points,
  className = "",
}: {
  points: number[];
  className?: string;
}) {
  if (points.length < 2) {
    return null;
  }

  const first = points[0];
  const last = points[points.length - 1];
  const min = Math.min(...points);
  const max = Math.max(...points);
  const center = (min + max) / 2;
  const spread = Math.max(max - min, 12);
  const lo = Math.max(0, center - spread / 2 - 1);
  const hi = Math.min(100, center + spread / 2 + 1);
  const denominator = hi - lo || 1;

  const xFor = (index: number) =>
    3 + (index / (points.length - 1)) * (168 - 6);
  const yFor = (value: number) => 29 - ((value - lo) / denominator) * 26;

  const line = points
    .map(
      (value, index) =>
        `${index === 0 ? "M" : "L"}${xFor(index).toFixed(1)},${yFor(value).toFixed(1)}`,
    )
    .join(" ");

  return (
    <svg
      viewBox="0 0 168 32"
      className={className}
      role="img"
      aria-label={`Yes probability trend, ${Math.round(first)}% to ${Math.round(last)}%`}
    >
      <path
        d={line}
        fill="none"
        stroke="var(--color-yes)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={xFor(points.length - 1)}
        cy={yFor(last)}
        r="2.5"
        fill="var(--color-yes)"
        stroke="var(--color-paper)"
        strokeWidth="2"
      />
    </svg>
  );
}

export function ProbabilityChart({ points }: { points: HistoryPoint[] }) {
  const [range, setRange] = useState<RangeId>("ALL");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const filtered = useMemo(() => {
    const selected = RANGES.find((entry) => entry.id === range);

    if (!selected?.ms) {
      return points;
    }

    const cutoff = Date.now() - selected.ms;
    return points.filter(
      (point) => new Date(point.t).getTime() >= cutoff,
    );
  }, [points, range]);

  const geometry = useMemo(() => {
    if (filtered.length < 2) {
      return null;
    }

    const startTime = new Date(filtered[0].t).getTime();
    const endTime = new Date(filtered[filtered.length - 1].t).getTime();
    const span = endTime - startTime;

    const xFor = (point: HistoryPoint) => {
      if (span <= 0) {
        const index = filtered.indexOf(point);
        return LEFT + (index / (filtered.length - 1)) * PLOT_WIDTH;
      }
      return (
        LEFT + ((new Date(point.t).getTime() - startTime) / span) * PLOT_WIDTH
      );
    };
    const yFor = (value: number) =>
      TOP + (1 - value / 100) * PLOT_HEIGHT;

    const coordinates = filtered.map((point) => ({
      x: xFor(point),
      y: yFor(point.yesPercentage),
    }));

    const line = coordinates
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"}${point.x.toFixed(1)},${point.y.toFixed(1)}`,
      )
      .join(" ");

    const baseline = TOP + PLOT_HEIGHT;
    const area = `${line} L${coordinates[coordinates.length - 1].x.toFixed(1)},${baseline} L${coordinates[0].x.toFixed(1)},${baseline} Z`;

    return {
      coordinates,
      line,
      area,
      startTime,
      endTime,
      xFor,
      yFor,
    };
  }, [filtered]);

  const active =
    activeIndex !== null && filtered[activeIndex] ? filtered[activeIndex] : null;
  const activeCoordinate =
    geometry && activeIndex !== null ? geometry.coordinates[activeIndex] : null;

  function handlePointerMove(event: React.PointerEvent<SVGRectElement>) {
    if (!geometry || !svgRef.current) {
      return;
    }

    const bounds = svgRef.current.getBoundingClientRect();
    const pointerX =
      ((event.clientX - bounds.left) / bounds.width) * WIDTH;

    let nearest = 0;
    let distance = Number.POSITIVE_INFINITY;

    geometry.coordinates.forEach((coordinate, index) => {
      const delta = Math.abs(coordinate.x - pointerX);
      if (delta < distance) {
        distance = delta;
        nearest = index;
      }
    });

    setActiveIndex(nearest);
  }

  function handleKeyDown(event: React.KeyboardEvent<SVGSVGElement>) {
    if (filtered.length < 2) {
      return;
    }

    const lastIndex = filtered.length - 1;
    const current = activeIndex ?? lastIndex;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      setActiveIndex(Math.min(lastIndex, current + 1));
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setActiveIndex(Math.max(0, current - 1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(lastIndex);
    }
  }

  const tableRows = useMemo(() => {
    const stride = Math.max(1, Math.ceil(filtered.length / 40));
    const rows = filtered.filter((_, index) => index % stride === 0);
    const last = filtered[filtered.length - 1];

    if (last && rows[rows.length - 1] !== last) {
      rows.push(last);
    }

    return rows;
  }, [filtered]);

  return (
    <div className="border-t border-line px-5 py-5 sm:px-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          Probability history
        </h3>

        <div className="flex items-center gap-1" role="group" aria-label="Time range">
          {RANGES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={range === entry.id}
              onClick={() => {
                setRange(entry.id);
                setActiveIndex(null);
              }}
              className={`border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition-colors ${
                range === entry.id
                  ? "border-ink bg-ink text-paper"
                  : "border-line text-muted hover:border-ink hover:text-ink"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {!geometry ? (
        <div className="flex h-40 items-center justify-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
            {points.length < 2
              ? "Awaiting first trade"
              : "No trades in this range"}
          </p>
        </div>
      ) : (
        <div className="relative mt-4">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="h-auto w-full touch-none"
            role="img"
            aria-label={`Yes probability history from ${formatPercent(filtered[0].yesPercentage)} to ${formatPercent(filtered[filtered.length - 1].yesPercentage)}. Use arrow keys to inspect points.`}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            onFocus={() =>
              setActiveIndex((current) => current ?? filtered.length - 1)
            }
            onBlur={() => setActiveIndex(null)}
          >
            {GRID_VALUES.map((value) => {
              const y = geometry.yFor(value);
              return (
                <g key={value}>
                  <line
                    x1={LEFT}
                    x2={WIDTH - RIGHT}
                    y1={y}
                    y2={y}
                    stroke="var(--color-line)"
                    strokeWidth="1"
                  />
                  <text
                    x={LEFT - 8}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    fill="var(--color-muted)"
                    fontFamily="var(--font-plex-mono), monospace"
                    fontSize="9"
                  >
                    {value}%
                  </text>
                </g>
              );
            })}

            <path d={geometry.area} fill="var(--color-yes)" fillOpacity="0.1" />
            <path
              d={geometry.line}
              fill="none"
              stroke="var(--color-yes)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <text
              x={LEFT}
              y={HEIGHT - 6}
              textAnchor="start"
              fill="var(--color-muted)"
              fontFamily="var(--font-plex-mono), monospace"
              fontSize="9"
            >
              {formatAxisDate(geometry.startTime)}
            </text>
            {geometry.startTime !== geometry.endTime && (
              <>
                <text
                  x={LEFT + PLOT_WIDTH / 2}
                  y={HEIGHT - 6}
                  textAnchor="middle"
                  fill="var(--color-muted)"
                  fontFamily="var(--font-plex-mono), monospace"
                  fontSize="9"
                >
                  {formatAxisDate(
                    geometry.startTime +
                      (geometry.endTime - geometry.startTime) / 2,
                  )}
                </text>
                <text
                  x={WIDTH - RIGHT}
                  y={HEIGHT - 6}
                  textAnchor="end"
                  fill="var(--color-muted)"
                  fontFamily="var(--font-plex-mono), monospace"
                  fontSize="9"
                >
                  {formatAxisDate(geometry.endTime)}
                </text>
              </>
            )}

            <rect
              x={LEFT}
              y={TOP}
              width={PLOT_WIDTH}
              height={PLOT_HEIGHT}
              fill="transparent"
              onPointerMove={handlePointerMove}
              onPointerLeave={() => setActiveIndex(null)}
            />

            <circle
              cx={geometry.coordinates[geometry.coordinates.length - 1].x}
              cy={geometry.coordinates[geometry.coordinates.length - 1].y}
              r="4"
              fill="var(--color-yes)"
              stroke="var(--color-surface)"
              strokeWidth="2"
              pointerEvents="none"
            />

            {activeCoordinate && (
              <g pointerEvents="none">
                <line
                  x1={activeCoordinate.x}
                  x2={activeCoordinate.x}
                  y1={TOP}
                  y2={TOP + PLOT_HEIGHT}
                  stroke="var(--color-line-strong)"
                  strokeWidth="1"
                />
                <circle
                  cx={activeCoordinate.x}
                  cy={activeCoordinate.y}
                  r="4"
                  fill="var(--color-yes)"
                  stroke="var(--color-surface)"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>

          {active && activeCoordinate && (
            <div
              className="pointer-events-none absolute top-2 z-10 -translate-x-1/2 border border-line bg-surface px-2.5 py-2 whitespace-nowrap"
              style={{
                left: `${Math.min(86, Math.max(14, (activeCoordinate.x / WIDTH) * 100))}%`,
              }}
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted">
                {formatTimestamp(active.t)}
              </p>
              <p className="mt-1 flex items-center gap-1.5 font-mono text-xs text-ink">
                <span
                  className="inline-block h-0.5 w-3 bg-yes"
                  aria-hidden="true"
                />
                YES {formatPercent(active.yesPercentage)}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-muted">
                {formatCredits(active.total)} cr pool
              </p>
            </div>
          )}
        </div>
      )}

      {geometry && (
        <details className="mt-3 border-t border-line pt-2">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink">
            View data
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[320px] font-mono text-[10px] text-ink">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-1.5 pr-4 font-normal uppercase tracking-[0.1em]">
                    Time (UTC)
                  </th>
                  <th className="py-1.5 pr-4 text-right font-normal uppercase tracking-[0.1em]">
                    Yes
                  </th>
                  <th className="py-1.5 text-right font-normal uppercase tracking-[0.1em]">
                    Pool
                  </th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((point, index) => (
                  <tr
                    key={`${point.t}-${index}`}
                    className="border-b border-line/60 last:border-0"
                  >
                    <td className="py-1.5 pr-4">{formatTimestamp(point.t)}</td>
                    <td className="py-1.5 pr-4 text-right">
                      {formatPercent(point.yesPercentage)}
                    </td>
                    <td className="py-1.5 text-right">
                      {formatCredits(point.total)} cr
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  );
}
