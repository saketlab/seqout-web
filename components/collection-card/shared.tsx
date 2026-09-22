"use client";

import { humanize } from "@/utils/format";
import type {
  DiseaseFacetValue,
  DiseaseFilters,
  DiseaseSort,
} from "@/utils/useStats";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Popover,
  Select,
  Table,
  Text,
  TextField,
} from "@radix-ui/themes";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useState } from "react";

export const ALL = "__all__";
const TAG_PREVIEW = 2;
const DEFAULT_MAX_OPTIONS = 40;

export type BadgeColor = ComponentProps<typeof Badge>["color"];

export function TagList({
  values,
  color,
  colorFor,
  labelFor,
}: {
  values: string[] | null;
  color?: BadgeColor;
  colorFor?: (v: string) => BadgeColor;
  labelFor?: (v: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const list = values ?? [];
  if (list.length === 0) {
    return (
      <Text size="1" color="gray">
        —
      </Text>
    );
  }
  const hidden = list.length - TAG_PREVIEW;
  return (
    <Flex align="center" gap="1" wrap="wrap">
      {(expanded ? list : list.slice(0, TAG_PREVIEW)).map((v) => (
        <Badge
          key={v}
          size="1"
          variant="soft"
          color={colorFor ? colorFor(v) : color}
        >
          {labelFor ? labelFor(v) : v}
        </Badge>
      ))}
      {hidden > 0 ? (
        <Badge
          size="1"
          color="gray"
          role="button"
          tabIndex={0}
          title={expanded ? "Show fewer" : `Show all ${list.length}`}
          onClick={() => setExpanded((v) => !v)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setExpanded((v) => !v);
            }
          }}
          style={{ cursor: "pointer", userSelect: "none" }}
        >
          {expanded ? "show less" : `+${hidden}`}
        </Badge>
      ) : null}
    </Flex>
  );
}

// one empty-state dash covers the whole cell
export function TagGroups({
  groups,
}: {
  groups: { values: string[] | null; color?: BadgeColor; prefix?: string }[];
}) {
  const nonEmpty = groups.filter((g) => g.values && g.values.length > 0);
  if (nonEmpty.length === 0) {
    return (
      <Text size="1" color="gray">
        —
      </Text>
    );
  }
  return (
    <Flex direction="column" gap="1">
      {nonEmpty.map((g, i) =>
        g.prefix ? (
          <Flex key={i} align="center" gap="1" wrap="wrap">
            <Text size="1" color="gray">
              {g.prefix}
            </Text>
            <TagList values={g.values} color={g.color} />
          </Flex>
        ) : (
          <TagList key={i} values={g.values} color={g.color} />
        ),
      )}
    </Flex>
  );
}

export function ColumnInfo({ text }: { text: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger>
        <Text
          size="1"
          color="gray"
          tabIndex={0}
          role="button"
          aria-label={text}
          style={{
            cursor: "help",
            // invisible padding widens tap target to ~44px; negative margins cancel its layout impact so the glyph doesn't shift
            padding: 15,
            marginTop: -15,
            marginRight: -15,
            marginBottom: -15,
            marginLeft: 3 - 15,
          }}
        >
          ⓘ
        </Text>
      </Popover.Trigger>
      <Popover.Content size="1" maxWidth="260px">
        <Text size="1">{text}</Text>
      </Popover.Content>
    </Popover.Root>
  );
}

export function Availability({
  have,
  runs,
}: {
  have: boolean | null;
  runs: number | null;
}) {
  if (have == null) {
    return (
      <Text size="1" color="gray">
        —
      </Text>
    );
  }
  return have ? (
    <Badge size="1" color="green" variant="soft">
      yes{runs ? ` (${humanize(runs)})` : ""}
    </Badge>
  ) : (
    <Badge size="1" color="gray" variant="soft">
      no
    </Badge>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card size="1">
      <Flex direction="column" gap="1">
        <Text size="1" color="gray">
          {label}
        </Text>
        <Text size="4" weight="bold">
          {value}
        </Text>
      </Flex>
    </Card>
  );
}

export function FacetSelect({
  label,
  value,
  onChange,
  options,
  maxOptions = DEFAULT_MAX_OPTIONS,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
  options: DiseaseFacetValue[];
  maxOptions?: number;
}) {
  return (
    <Flex align="center" gap="2">
      <Text size="1" color="gray">
        {label}
      </Text>
      <Select.Root
        value={value ?? ALL}
        onValueChange={(v) => onChange(v === ALL ? null : v)}
        size={{ initial: "2", md: "1" }}
      >
        <Select.Trigger />
        <Select.Content>
          <Select.Item value={ALL}>All</Select.Item>
          {options.slice(0, maxOptions).map((o) => (
            <Select.Item key={o.value} value={o.value}>
              {o.value} ({humanize(o.studies)})
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Root>
    </Flex>
  );
}

/** Debounced free-text search box; calls onChange 300ms after typing stops. */
export function SearchFilter({
  value,
  onChange,
  placeholder = "Search title or accession…",
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    const id = window.setTimeout(() => {
      onChange(draft.trim() || null);
    }, 300);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <TextField.Root
      size={{ initial: "2", md: "1" }}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      placeholder={placeholder}
      style={{ minWidth: 220 }}
    >
      <TextField.Slot>
        <MagnifyingGlassIcon />
      </TextField.Slot>
    </TextField.Root>
  );
}

// api returns facets alphabetically; lets a page pin a preferred order
export function orderedFacetKeys(
  facetData: Record<string, unknown>,
  order: readonly string[],
): string[] {
  return [
    ...order.filter((k) => k in facetData),
    ...Object.keys(facetData).filter((k) => !order.includes(k)),
  ];
}

export function useSortFilterState(
  defaultSort: DiseaseSort,
  initialFilters: DiseaseFilters = {},
) {
  const [filters, setFilters] = useState<DiseaseFilters>(initialFilters);
  const [sort, setSort] = useState<DiseaseSort>(defaultSort);

  const toggleSort = (key: string) =>
    setSort((s) =>
      s.key === key
        ? { key, order: s.order === "desc" ? "asc" : "desc" }
        : { key, order: "desc" },
    );

  const setFilter = (facet: string, v: string | null) =>
    setFilters((f) => {
      const next = { ...f };
      if (v) next[facet] = v;
      else delete next[facet];
      return next;
    });

  return { filters, sort, toggleSort, setFilter };
}

export interface ColumnDef<T> {
  label: string;
  render: (r: T) => ReactNode;
  info: string;
  sort?: string;
  align?: "right";
}

// only the table is shared; facet/scope controls and summary stats differ per page
export function CollectionTable<T extends { study_accession: string }>({
  columns,
  rows,
  total,
  isFetching,
  sort,
  toggleSort,
  hasMore,
  isFetchingMore,
  onLoadMore,
}: {
  columns: ColumnDef<T>[];
  rows: T[];
  total: number;
  isFetching: boolean;
  sort: DiseaseSort;
  toggleSort: (key: string) => void;
  hasMore?: boolean;
  isFetchingMore?: boolean;
  onLoadMore?: () => void;
}) {
  return (
    <>
      <Box style={{ overflowX: "auto" }}>
        <Table.Root size="1" variant="surface">
          <Table.Header>
            <Table.Row>
              {columns.map(({ label, sort: col, align, info }) => (
                <Table.ColumnHeaderCell key={label} align={align}>
                  <Text
                    size="1"
                    style={
                      col
                        ? { cursor: "pointer", userSelect: "none" }
                        : undefined
                    }
                    onClick={col ? () => toggleSort(col) : undefined}
                  >
                    {label}
                    {sort.key === col
                      ? sort.order === "desc"
                        ? " ↓"
                        : " ↑"
                      : ""}
                  </Text>
                  <ColumnInfo text={info} />
                </Table.ColumnHeaderCell>
              ))}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((r) => (
              <Table.Row key={r.study_accession}>
                {columns.map((c) => (
                  <Table.Cell key={c.label} align={c.align}>
                    {c.render(r)}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
      <Flex align="center" gap="3">
        <Text size="1" color="gray">
          {isFetching
            ? "Loading…"
            : total > rows.length
              ? `Showing ${humanize(rows.length)} of ${humanize(total)} studies`
              : `${humanize(rows.length)} studies`}
        </Text>
        {hasMore ? (
          <Button
            size={{ initial: "2", md: "1" }}
            variant="soft"
            disabled={isFetchingMore}
            onClick={onLoadMore}
          >
            {isFetchingMore ? "Loading…" : "Load more"}
          </Button>
        ) : null}
      </Flex>
    </>
  );
}
