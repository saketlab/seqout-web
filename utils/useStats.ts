import { getJson } from "@/utils/api";
import type {
  EnrichedCoverage,
  EnrichedCrosstab,
  LastUpdated,
  ProjectOverlap,
  PentimentoOverview,
  ScQuality,
  ScQualitySamples,
  SingleCellOverview,
  SourceTotals,
  TissueMicrobes,
} from "@/utils/types";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

const ONE_DAY = 24 * 60 * 60 * 1000;

export function useSourceTotals() {
  return useQuery({
    queryKey: ["source-totals"],
    queryFn: () => getJson<SourceTotals>("/stats/source-totals"),
    staleTime: ONE_DAY,
  });
}

export function useProjectOverlap() {
  return useQuery({
    queryKey: ["project-overlap"],
    queryFn: () => getJson<ProjectOverlap>("/stats/project-overlap"),
    staleTime: ONE_DAY,
  });
}

export function useLastUpdated() {
  return useQuery({
    queryKey: ["last-updated"],
    queryFn: () => getJson<LastUpdated>("/stats/last-updated"),
    staleTime: ONE_DAY,
  });
}

export function useSingleCellOverview() {
  return useQuery({
    queryKey: ["single-cell-overview"],
    queryFn: () => getJson<SingleCellOverview>("/stats/single-cell"),
    staleTime: ONE_DAY,
  });
}

export function usePentimentoOverview() {
  return useQuery({
    queryKey: ["pentimento-overview"],
    queryFn: () => getJson<PentimentoOverview>("/stats/pentimento"),
    staleTime: ONE_DAY,
  });
}

export function useTissueMicrobes() {
  return useQuery({
    queryKey: ["tissue-microbes"],
    queryFn: () => getJson<TissueMicrobes>("/stats/tissue-microbes"),
    staleTime: ONE_DAY,
  });
}

export function useScQuality() {
  return useQuery({
    queryKey: ["sc-quality"],
    queryFn: () => getJson<ScQuality>("/stats/sc-quality"),
    staleTime: ONE_DAY,
  });
}

export function useScQualitySamples(enabled: boolean) {
  return useQuery({
    queryKey: ["sc-quality-samples"],
    queryFn: () => getJson<ScQualitySamples>("/stats/sc-quality/samples"),
    staleTime: ONE_DAY,
    enabled,
  });
}

export function useEnrichedCoverage(limit = 25) {
  return useQuery({
    queryKey: ["enriched-coverage", limit],
    queryFn: () =>
      getJson<EnrichedCoverage>(`/stats/enriched/coverage?limit=${limit}`),
    staleTime: ONE_DAY,
  });
}

export function useEnrichedCrosstab(group: string, breakdown: string) {
  return useQuery({
    queryKey: ["enriched-crosstab", group, breakdown],
    queryFn: () =>
      getJson<EnrichedCrosstab>(
        `/stats/enriched/crosstab?group=${group}&breakdown=${breakdown}`,
      ),
    enabled: group !== breakdown,
    staleTime: ONE_DAY,
  });
}

export interface SexCounts {
  stated_male: number;
  stated_female: number;
  stated_missing: number;
  reads_male: number;
  reads_female: number;
}

export interface DiseaseSummary extends SexCounts {
  studies: number;
  samples: number;
  cells: number;
  studies_cells_measured: number;
  studies_human_primary: number;
  studies_cell_line: number;
  studies_with_ancestry: number;
}

export interface DiseaseFacetValue {
  value: string;
  studies: number;
}

export interface DiseaseProject {
  study_accession: string;
  title: string | null;
  organisms: string[] | null;
  n_samples: number;
  n_diseases: number;
  cells: number | null;
  assay_category: string | null;
  stated_male: number;
  stated_female: number;
  stated_missing: number;
  reads_male: number;
  reads_female: number;
  diseases: string[] | null;
  mondo_ids: string[] | null;
  catalogue_diseases: string[] | null;
  catalogue_diseases_direct: string[] | null;
  ancestors: string[] | null;
  n_samples_in_scope: number;
  ancestries: string[] | null;
  inheritance: string[] | null;
  has_fastq: boolean | null;
  has_sra: boolean | null;
  n_fastq_runs: number | null;
  n_sra_runs: number | null;
}

export interface LongReadSummary {
  studies: number;
  experiments: number | null;
  samples: number | null;
  studies_pacbio: number;
  studies_nanopore: number;
  studies_both: number;
  studies_long_read_only: number;
  studies_hybrid: number;
  studies_human: number;
  studies_with_fastq: number;
  studies_single_cell: number;
  studies_exact_chemistry: number;
  first_year: number | null;
  last_year: number | null;
}

export interface LongReadProject {
  study_accession: string;
  accessions: string[];
  archives: string[];
  technologies: string[];
  platforms: string[];
  instrument_models: string[] | null;
  library_strategies: string[] | null;
  n_experiments: number;
  n_experiments_total: number | null;
  long_read_only: boolean | null;
  title: string | null;
  organism: string | null;
  organisms: string[] | null;
  n_samples: number | null;
  assay_l1: string | null;
  is_single_cell: boolean | null;
  country: string | null;
  pmid: string | null;
  first_published: string | null;
  year: number | null;
  has_fastq: boolean | null;
  has_sra: boolean | null;
  n_runs: number | null;
  n_fastq_runs: number | null;
  n_sra_runs: number | null;
  chemistries: string[] | null;
  n_chemistry_exact: number | null;
}

export function useLongReadSummary() {
  return useQuery({
    queryKey: ["longread-summary"],
    queryFn: ({ signal }) =>
      getJson<LongReadSummary>("/longread/summary", signal),
    staleTime: ONE_DAY,
  });
}

export function useLongReadFacets() {
  return useQuery({
    queryKey: ["longread-facets"],
    queryFn: ({ signal }) => getJson<DiseaseFacets>("/longread/facets", signal),
    staleTime: ONE_DAY,
  });
}

export function useLongReadProjects(
  filters: DiseaseFilters,
  sort: DiseaseSort,
) {
  const active = useMemo(
    () => Object.entries(filters).sort(([a], [b]) => a.localeCompare(b)),
    [filters],
  );
  return useQuery({
    queryKey: ["longread-projects", active, sort],
    queryFn: ({ signal }) => {
      const qs = new URLSearchParams([
        ["limit", "100"],
        ["sort", sort.key],
        ["order", sort.order],
        ...active,
      ]);
      return getJson<{ total: number; results: LongReadProject[] }>(
        `/longread/projects?${qs.toString()}`,
        signal,
      );
    },
    placeholderData: (prev) => prev,
    staleTime: ONE_DAY,
  });
}

export function useDiseaseSummary(collection: string) {
  return useQuery({
    queryKey: ["disease-summary", collection],
    queryFn: ({ signal }) =>
      getJson<DiseaseSummary>(`/disease/${collection}/summary`, signal),
    staleTime: ONE_DAY,
  });
}

export type DiseaseFacets = Record<string, DiseaseFacetValue[]>;

export type DiseaseFilters = Record<string, string>;

export type DiseaseScope =
  "human_primary" | "patient_derived_model" | "cell_line" | "all";

export interface DiseaseSort {
  key: string;
  order: "asc" | "desc";
}

export function useDiseaseFacets(collection: string) {
  return useQuery({
    queryKey: ["disease-facets", collection],
    queryFn: ({ signal }) =>
      getJson<DiseaseFacets>(`/disease/${collection}/facets`, signal),
    staleTime: ONE_DAY,
  });
}

export function useDiseaseProjects(
  collection: string,
  filters: DiseaseFilters,
  sort: DiseaseSort,
  scope: DiseaseScope,
) {
  const active = useMemo(
    () => Object.entries(filters).sort(([a], [b]) => a.localeCompare(b)),
    [filters],
  );
  return useQuery({
    queryKey: ["disease-projects", collection, active, sort, scope],
    queryFn: ({ signal }) => {
      const qs = new URLSearchParams([
        ["limit", "100"],
        ["sort", sort.key],
        ["order", sort.order],
        ["scope", scope],
        ...active,
      ]);
      return getJson<{ total: number; results: DiseaseProject[] }>(
        `/disease/${collection}/projects?${qs.toString()}`,
        signal,
      );
    },
    placeholderData: (prev) => prev,
    staleTime: ONE_DAY,
  });
}
