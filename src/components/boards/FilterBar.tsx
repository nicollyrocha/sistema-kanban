"use client";

import * as React from "react";
import { PRIORITIES, PRIORITY_LABELS, PRIORITY_EMOJI } from "@/lib/priority";
import { CARD_TYPES, CARD_TYPE_LABELS, CARD_TYPE_EMOJI } from "@/lib/card-type";
import type { LabelData } from "@/lib/board-types";
import type { CardFilters } from "@/lib/card-filters";

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-muted-foreground">{label}:</span>
      {children}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
  style,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      style={style}
      className={`rounded-full border px-2 py-1 transition-colors ${
        active
          ? "border-ring bg-accent text-foreground"
          : "border-border text-muted-foreground hover:border-ring/40"
      }`}
    >
      {children}
    </button>
  );
}

export function FilterBar({
  boardLabels,
  filters,
  onTogglePriority,
  onToggleType,
  onToggleLabel,
  onClear,
}: {
  boardLabels: LabelData[];
  filters: CardFilters;
  onTogglePriority: (priority: string) => void;
  onToggleType: (type: string) => void;
  onToggleLabel: (labelId: string) => void;
  onClear: () => void;
}) {
  const hasActiveFilters =
    filters.priorities.length > 0 || filters.types.length > 0 || filters.labelIds.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-white/5 p-3 text-xs">
      <FilterGroup label="Prioridade">
        {PRIORITIES.map((p) => (
          <FilterChip key={p} active={filters.priorities.includes(p)} onClick={() => onTogglePriority(p)}>
            <span aria-hidden="true">{PRIORITY_EMOJI[p]}</span> {PRIORITY_LABELS[p]}
          </FilterChip>
        ))}
      </FilterGroup>
      <FilterGroup label="Tipo">
        {CARD_TYPES.map((t) => (
          <FilterChip key={t} active={filters.types.includes(t)} onClick={() => onToggleType(t)}>
            <span aria-hidden="true">{CARD_TYPE_EMOJI[t]}</span> {CARD_TYPE_LABELS[t]}
          </FilterChip>
        ))}
      </FilterGroup>
      {boardLabels.length > 0 && (
        <FilterGroup label="Etiqueta">
          {boardLabels.map((l) => {
            const active = filters.labelIds.includes(l.id);
            return (
              <FilterChip
                key={l.id}
                active={active}
                onClick={() => onToggleLabel(l.id)}
                style={active ? { backgroundColor: l.color, borderColor: l.color, color: "#000" } : undefined}
              >
                {l.name}
              </FilterChip>
            );
          })}
        </FilterGroup>
      )}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClear}
          className="text-muted-foreground underline transition-colors hover:text-foreground"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
