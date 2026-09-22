import { getJson, getJsonOrNull } from "@/utils/api";
import { ONTOLOGY_DEFAULT_SORT } from "@/utils/ontology-kinds";
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
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

const ONE_DAY = 24 * 60 * 60 * 1000;
// Backend caps `limit` at 200; "load more" pages through with offset.
const COLLECTION_PAGE_SIZE = 200;

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

// disease needs an extra collection segment and a scope filter, so it keeps separate hooks
function useCollectionSummary<TSummary>(basePath: string, keyPrefix: string) {
  return useQuery({
    queryKey: [`${keyPrefix}-summary`],
    queryFn: ({ signal }) => getJson<TSummary>(`${basePath}/summary`, signal),
    staleTime: ONE_DAY,
  });
}

export function useCollectionFacets(basePath: string, keyPrefix: string) {
  return useQuery({
    queryKey: [`${keyPrefix}-facets`],
    queryFn: ({ signal }) =>
      getJson<DiseaseFacets>(`${basePath}/facets`, signal),
    staleTime: ONE_DAY,
  });
}

function useActiveFilters(filters: DiseaseFilters) {
  return useMemo(
    () => Object.entries(filters).sort(([a], [b]) => a.localeCompare(b)),
    [filters],
  );
}

function projectsQuery(
  active: [string, string][],
  sort: DiseaseSort,
  paging: [string, string][],
) {
  return new URLSearchParams([
    ["limit", String(COLLECTION_PAGE_SIZE)],
    ["sort", sort.key],
    ["order", sort.order],
    ...paging,
    ...active,
  ]);
}

function useCollectionProjects<TProject>(
  basePath: string,
  keyPrefix: string,
  filters: DiseaseFilters,
  sort: DiseaseSort,
) {
  const active = useActiveFilters(filters);
  return useInfiniteQuery({
    queryKey: [`${keyPrefix}-projects`, active, sort],
    queryFn: ({ signal, pageParam }) => {
      const qs = projectsQuery(active, sort, [["offset", String(pageParam)]]);
      return getJson<{ total: number; results: TProject[] }>(
        `${basePath}/projects?${qs.toString()}`,
        signal,
      );
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + p.results.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    placeholderData: (prev) => prev,
    staleTime: ONE_DAY,
  });
}

export const useLongReadSummary = () =>
  useCollectionSummary<LongReadSummary>("/longread", "longread");
export const useLongReadFacets = () =>
  useCollectionFacets("/longread", "longread");
export const useLongReadProjects = (
  filters: DiseaseFilters,
  sort: DiseaseSort,
) =>
  useCollectionProjects<LongReadProject>(
    "/longread",
    "longread",
    filters,
    sort,
  );

export interface SingleCellSummary {
  studies: number;
  samples: number | null;
  cells: number | null;
  studies_with_matrix: number;
  studies_with_fastq: number;
  studies_long_read: number;
  studies_with_perturbation: number;
  studies_human: number;
  n_modalities: number;
  first_year: number | null;
  last_year: number | null;
}

export interface SingleCellProject {
  study_accession: string;
  title: string | null;
  organism: string | null;
  organisms: string[] | null;
  tissues: string[] | null;
  single_cell_modality: string | null;
  chemistries: string[] | null;
  cell_or_nucleus: string[] | null;
  assay_l1: string | null;
  n_samples: number | null;
  has_matrix: boolean;
  n_cells: number | null;
  has_fastq: boolean | null;
  n_fastq_runs: number | null;
  has_sra: boolean | null;
  n_runs: number | null;
  is_long_read: boolean;
  perturbation_method: string[] | null;
  intervention_kind: string[] | null;
  is_pooled: boolean | null;
  country: string | null;
  pmid: string | null;
  year: number | null;
}

export const useSingleCellSummary = () =>
  useCollectionSummary<SingleCellSummary>("/single-cell", "singlecell");
export const useSingleCellFacets = () =>
  useCollectionFacets("/single-cell", "singlecell");
export const useSingleCellProjects = (
  filters: DiseaseFilters,
  sort: DiseaseSort,
) =>
  useCollectionProjects<SingleCellProject>(
    "/single-cell",
    "singlecell",
    filters,
    sort,
  );

export interface PerturbationSummary {
  studies: number;
  studies_high_medium: number;
  studies_high: number;
  studies_genetic: number;
  studies_chemical: number;
  studies_with_matrix: number;
  studies_with_fastq: number;
  studies_matrix_and_fastq: number;
  studies_human: number;
  samples: number | null;
  cells: number | null;
  first_year: number | null;
  last_year: number | null;
}

export type PerturbationType = "genetic" | "chemical" | "both" | "other";
export type PerturbationConfidence = "high" | "medium" | "low";
export type DataAvailability =
  "both" | "matrix_only" | "fastq_only" | "neither";

export interface PerturbationProject {
  study_accession: string;
  title: string | null;
  organism: string | null;
  organisms: string[] | null;
  tissues: string[] | null;
  single_cell_modality: string | null;
  is_long_read: boolean;
  assay_l1: string | null;
  readout_assays: string[] | null;
  cell_lines: string[] | null;
  sample_types: string[] | null;
  n_samples: number | null;
  n_cells: number | null;
  has_matrix: boolean;
  has_fastq: boolean | null;
  has_sra: boolean | null;
  n_fastq_runs: number | null;
  n_runs: number | null;
  data_availability: DataAvailability;
  perturbation_type: PerturbationType;
  confidence: PerturbationConfidence;
  genetic_confidence: "none" | PerturbationConfidence;
  chemical_confidence: "none" | PerturbationConfidence;
  genetic_subtypes: string[] | null;
  perturbation_methods: string[] | null;
  compounds: string[] | null;
  title_compounds: string[] | null;
  stimuli: string[] | null;
  has_control_arm: boolean;
  n_compound_values: number;
  is_pooled: boolean | null;
  evidence: string[];
  country: string | null;
  pmid: string | null;
  year: number | null;
}

export const usePerturbationSummary = () =>
  useCollectionSummary<PerturbationSummary>("/perturbation", "perturbation");
export const usePerturbationFacets = () =>
  useCollectionFacets("/perturbation", "perturbation");
export const usePerturbationProjects = (
  filters: DiseaseFilters,
  sort: DiseaseSort,
) =>
  useCollectionProjects<PerturbationProject>(
    "/perturbation",
    "perturbation",
    filters,
    sort,
  );

export interface SpatialSummary {
  studies: number;
  studies_named_platform: number;
  studies_single_cell_res: number;
  studies_spot_res: number;
  studies_roi_res: number;
  studies_with_matrix: number;
  studies_with_fastq: number;
  studies_matrix_and_fastq: number;
  studies_human: number;
  samples: number | null;
  cells: number | null;
  first_year: number | null;
  last_year: number | null;
}

export type SpatialResolution = "single-cell" | "spot" | "roi";
export type SpatialTechnology = "imaging" | "sequencing" | "hybrid";

export interface SpatialProject {
  study_accession: string;
  title: string | null;
  organism: string | null;
  organisms: string[] | null;
  tissues: string[] | null;
  single_cell_modality: string | null;
  is_long_read: boolean;
  assay_l1: string | null;
  readout_assays: string[] | null;
  cell_lines: string[] | null;
  sample_types: string[] | null;
  n_samples: number | null;
  n_cells: number | null;
  has_matrix: boolean;
  has_fastq: boolean | null;
  has_sra: boolean | null;
  n_fastq_runs: number | null;
  n_runs: number | null;
  data_availability: DataAvailability;
  platforms: string[] | null;
  resolution: SpatialResolution | null;
  technology: SpatialTechnology | null;
  country: string | null;
  pmid: string | null;
  year: number | null;
}

export const useSpatialSummary = () =>
  useCollectionSummary<SpatialSummary>("/spatial", "spatial");
export const useSpatialFacets = () =>
  useCollectionFacets("/spatial", "spatial");
export const useSpatialProjects = (
  filters: DiseaseFilters,
  sort: DiseaseSort,
) => useCollectionProjects<SpatialProject>("/spatial", "spatial", filters, sort);

export interface CountrySummary {
  studies: number;
  samples: number | null;
  experiments: number | null;
  studies_with_fastq: number;
  studies_with_sra: number;
  studies_human: number;
  studies_single_cell: number;
  studies_long_read: number;
  n_organisms: number;
  first_year: number | null;
  last_year: number | null;
}

export interface CountryProject {
  study_accession: string;
  title: string | null;
  organism: string | null;
  assay_l1: string | null;
  assay_l2: string | null;
  source: string;
  n_samples: number | null;
  n_experiments: number | null;
  is_single_cell: boolean;
  single_cell_modality: string | null;
  center_name: string | null;
  pmid: string | null;
  year: number | null;
  has_fastq: boolean | null;
  has_sra: boolean | null;
  n_runs: number | null;
  n_fastq_runs: number | null;
  n_sra_runs: number | null;
  has_matrix: boolean | null;
  n_cells: number | null;
  has_long_read: boolean;
  technologies: string[] | null;
}

export const useCountrySummary = (code: string) =>
  useCollectionSummary<CountrySummary>(`/country/${code}`, `country-${code}`);
export const useCountryFacets = (code: string) =>
  useCollectionFacets(`/country/${code}`, `country-${code}`);
export const useCountryProjects = (
  code: string,
  filters: DiseaseFilters,
  sort: DiseaseSort,
) =>
  useCollectionProjects<CountryProject>(
    `/country/${code}`,
    `country-${code}`,
    filters,
    sort,
  );

// /tissue/{term} and /disease/{term} for terms outside the curated GARD/NORD collections
// summary uses getJsonOrNull: an unresolved term 404s and means "no matches"

export interface OntologyTermSummary {
  studies: number;
  samples: number | null;
  experiments: number | null;
  matched_samples: number | null;
  studies_with_fastq: number;
  studies_with_sra: number;
  studies_human: number;
  studies_single_cell: number;
  studies_long_read: number;
  n_organisms: number;
  first_date: string | null;
  last_date: string | null;
  term: string;
  resolution: "exact" | "substring";
  matched_labels: string[];
}

export interface OntologyTermProject {
  study_accession: string;
  title: string | null;
  organism: string | null;
  assay_l1: string | null;
  assay_l2: string | null;
  source: string;
  journal: string | null;
  country_code_iso2: string | null;
  pub_date: string | null;
  n_samples: number | null;
  n_experiments: number | null;
  is_single_cell: boolean | null;
  single_cell_modality: string | null;
  n_samples_with_tissue?: number | null;
  n_samples_with_disease?: number | null;
  has_fastq: boolean | null;
  has_sra: boolean | null;
  n_runs: number | null;
  n_fastq_runs: number | null;
  n_sra_runs: number | null;
  is_long_read: boolean;
}

export function useOntologyTermSummary(
  basePath: string,
  keyPrefix: string,
  initialData?: OntologyTermSummary,
) {
  return useQuery({
    queryKey: [`${keyPrefix}-summary`],
    queryFn: ({ signal }) =>
      getJsonOrNull<OntologyTermSummary>(`${basePath}/summary`, signal),
    initialData,
    staleTime: ONE_DAY,
  });
}

interface OntologyTermCursor {
  sort_value: string | number;
  accession: string;
}

export interface OntologyTermProjectsPage<TProject> {
  total: number;
  count: number;
  sort: string;
  next_cursor: OntologyTermCursor | null;
  results: TProject[];
}

// keyset pagination: OFFSET rescans every earlier row on broad terms
export function useOntologyTermProjects<TProject>(
  basePath: string,
  keyPrefix: string,
  filters: DiseaseFilters,
  sort: DiseaseSort,
  // server-rendered first page; default sort and no filters only
  initialPage?: OntologyTermProjectsPage<TProject>,
) {
  const active = useActiveFilters(filters);
  const isDefault =
    active.length === 0 &&
    sort.key === ONTOLOGY_DEFAULT_SORT.key &&
    sort.order === ONTOLOGY_DEFAULT_SORT.order;
  return useInfiniteQuery({
    queryKey: [`${keyPrefix}-projects`, active, sort],
    queryFn: ({ signal, pageParam }) => {
      const qs = projectsQuery(
        active,
        sort,
        pageParam
          ? [
              ["cursor_sort", String(pageParam.sort_value)],
              ["cursor_acc", pageParam.accession],
            ]
          : [],
      );
      return getJson<OntologyTermProjectsPage<TProject>>(
        `${basePath}/projects?${qs.toString()}`,
        signal,
      );
    },
    initialPageParam: null as OntologyTermCursor | null,
    initialData:
      isDefault && initialPage
        ? { pages: [initialPage], pageParams: [null] }
        : undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor,
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
  return useInfiniteQuery({
    queryKey: ["disease-projects", collection, active, sort, scope],
    queryFn: ({ signal, pageParam }) => {
      const qs = new URLSearchParams([
        ["limit", String(COLLECTION_PAGE_SIZE)],
        ["offset", String(pageParam)],
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
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((n, p) => n + p.results.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
    placeholderData: (prev) => prev,
    staleTime: ONE_DAY,
  });
}
