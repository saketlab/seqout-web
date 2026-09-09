"use client";
import {
  EnrichedMetadataBadges,
  EnrichedMetadataGrid,
  exportEnrichedCsv,
  useEnrichedMetadata,
} from "@/components/enriched-metadata-card";
import { FirstVisitPing, useFirstVisit } from "@/components/first-visit-ping";
import LongReadChemistryCard from "@/components/longread-chemistry-card";
import SectionAnchor from "@/components/section-anchor";
import SingleCellCard from "@/components/single-cell-card";
import { useToast } from "@/components/toast-provider";
import { WrapTextToggle } from "@/components/wrap-text-toggle";
import { buildCombinedRows, combinedHeaders } from "@/utils/combinedCsv";
import { downloadCsv } from "@/utils/exportCsv";
import { SERVER_URL } from "@/utils/constants";
import { buildSectionHash, parseSectionHash } from "@/utils/sectionHash";
import { copySectionLink } from "@/utils/shareSectionLink";
import {
  ArchiveIcon,
  DownloadIcon,
  Link2Icon,
  LayersIcon,
  MagicWandIcon,
  MixIcon,
} from "@radix-ui/react-icons";
import {
  AlertDialog,
  Button,
  Flex,
  Heading,
  Spinner,
  Tabs,
  Text,
} from "@radix-ui/themes";
import { useEffect, useState, type ReactNode } from "react";

type TabValue = "original" | "enriched" | "pentimento" | "longread";

function TabShareIcon({
  sectionId,
  sectionTitle,
  tab,
  label,
  onSelect,
}: {
  sectionId: string;
  sectionTitle: string;
  tab: TabValue;
  label: string;
  onSelect: (tab: TabValue) => void;
}) {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [hovered, setHovered] = useState(false);

  const share = async () => {
    onSelect(tab);
    const didCopy = await copySectionLink(buildSectionHash(sectionId, tab));
    setCopied(didCopy);
    window.setTimeout(() => setCopied(false), 1500);
    if (didCopy) showToast(`Link to ${label} table copied`);
  };

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`Copy link to ${sectionTitle} ${label} table`}
      title={copied ? "Copied table link" : `Copy link to ${label} table`}
      onClick={(e) => {
        e.stopPropagation();
        void share();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          void share();
        }
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: copied ? "var(--accent-11)" : "inherit",
        opacity: copied ? 1 : hovered ? 1 : 0.55,
        transition: "opacity 150ms, color 150ms",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Link2Icon />
    </span>
  );
}

export default function MetadataTableTabs({
  accession,
  sectionId,
  sectionTitle,
  titleBadge,
  hasEnriched,
  hasPentimento,
  hasLongRead,
  originalContent,
  onExportOriginalCsv,
  combinedExport,
}: {
  accession: string;
  sectionId: string;
  sectionTitle: string;
  titleBadge?: ReactNode;
  hasEnriched?: boolean;
  hasPentimento?: boolean;
  hasLongRead?: boolean;
  originalContent: ReactNode;
  onExportOriginalCsv: () => void;
  combinedExport?: {
    noun: string;
    sraAccessions: string[];
    geoAccession: string | null;
    hasSupplementary: boolean;
  };
}) {
  const [seenEnriched, markEnrichedSeen] = useFirstVisit(
    "seqout-enriched-tab-clicked",
  );
  const tabExists: Record<TabValue, boolean> = {
    original: true,
    enriched: !!hasEnriched,
    pentimento: !!hasPentimento,
    longread: !!hasLongRead,
  };
  const hasExtraTab = Object.entries(tabExists).some(
    ([key, exists]) => key !== "original" && exists,
  );
  const [tab, setTab] = useState<TabValue>(() => {
    if (typeof window === "undefined") return "original";
    const { id, tab: hashTab } = parseSectionHash(window.location.hash);
    return id === sectionId && tabExists[hashTab as TabValue]
      ? (hashTab as TabValue)
      : "original";
  });
  const showEnriched = !!hasEnriched && tab === "enriched";
  const {
    data: enriched,
    isLoading: isEnrichedLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useEnrichedMetadata(accession, showEnriched);

  useEffect(() => {
    const { id } = parseSectionHash(window.location.hash);
    if (id === sectionId) {
      document.getElementById(sectionId)?.scrollIntoView();
    }
  }, [sectionId]);

  const activeTab: TabValue = tabExists[tab] ? tab : "original";

  const [askCombined, setAskCombined] = useState(false);
  const [combining, setCombining] = useState(false);
  const { showToast } = useToast();

  const canCombine =
    !!combinedExport &&
    (combinedExport.sraAccessions.length > 0 ||
      combinedExport.hasSupplementary);

  const downloadCombined = async () => {
    if (!combinedExport) return;
    setCombining(true);
    try {
      const { rows, truncated } = await buildCombinedRows({
        accession,
        sraAccessions: combinedExport.sraAccessions,
        geoAccession: combinedExport.geoAccession,
      });
      if (rows.length === 0) {
        showToast("No combined metadata to download");
        return;
      }
      downloadCsv(rows, combinedHeaders(rows), `${accession}_combined.csv`);
      if (truncated) {
        showToast("Export hit the server row limit — some rows are missing");
      }
    } catch (error) {
      console.error("Combined metadata export failed:", error);
      showToast("Couldn't build the combined CSV");
    } finally {
      setCombining(false);
      setAskCombined(false);
    }
  };

  return (
    <>
      <Flex id={sectionId} justify="between" align="center" gap="2" wrap="wrap">
        <Flex align="center" gap="2">
          <Heading as="h2" weight="medium" size="6">
            {sectionTitle}
          </Heading>
          {!showEnriched && titleBadge}
          {activeTab === "enriched" && enriched && (
            <EnrichedMetadataBadges data={enriched} />
          )}
          <SectionAnchor id={sectionId} />
        </Flex>
        <Flex align="center" gap="3">
          {hasExtraTab && (
            <Tabs.Root
              value={activeTab}
              onValueChange={(value) => {
                if (value === "enriched") markEnrichedSeen();
                setTab(value as TabValue);
              }}
            >
              <Tabs.List size="2">
                <Tabs.Trigger value="original">
                  <Flex gap={"2"} align={"center"}>
                    <ArchiveIcon />
                    <span>Original</span>
                    <TabShareIcon
                      sectionId={sectionId}
                      sectionTitle={sectionTitle}
                      tab="original"
                      label="Original"
                      onSelect={setTab}
                    />
                  </Flex>
                </Tabs.Trigger>
                {hasEnriched && (
                  <Tabs.Trigger
                    value="enriched"
                    style={{ position: "relative" }}
                  >
                    <Flex gap={"2"} align={"center"}>
                      <MagicWandIcon />
                      <span>Enriched</span>
                      <TabShareIcon
                        sectionId={sectionId}
                        sectionTitle={sectionTitle}
                        tab="enriched"
                        label="Enriched"
                        onSelect={setTab}
                      />
                    </Flex>
                    {!seenEnriched && activeTab === "original" && (
                      <FirstVisitPing
                        style={{ top: "4px", right: "4px", left: "auto" }}
                      />
                    )}
                  </Tabs.Trigger>
                )}
                {hasPentimento && (
                  <Tabs.Trigger value="pentimento">
                    <Flex gap={"2"} align={"center"}>
                      <LayersIcon />
                      <span>Pentimento</span>
                      <TabShareIcon
                        sectionId={sectionId}
                        sectionTitle={sectionTitle}
                        tab="pentimento"
                        label="Pentimento"
                        onSelect={setTab}
                      />
                    </Flex>
                  </Tabs.Trigger>
                )}
                {hasLongRead && (
                  <Tabs.Trigger value="longread">
                    <Flex gap={"2"} align={"center"}>
                      <MixIcon />
                      <span>Long-read chemistry</span>
                      <TabShareIcon
                        sectionId={sectionId}
                        sectionTitle={sectionTitle}
                        tab="longread"
                        label="Long-read chemistry"
                        onSelect={setTab}
                      />
                    </Flex>
                  </Tabs.Trigger>
                )}
              </Tabs.List>
            </Tabs.Root>
          )}
          <WrapTextToggle size="2" />
          {(activeTab === "original" || activeTab === "pentimento") && (
            <Button
              onClick={() => {
                if (activeTab === "pentimento") {
                  window.location.href = `${SERVER_URL}/project/${accession}/pentimento.csv`;
                } else if (showEnriched && enriched) {
                  void exportEnrichedCsv(accession);
                } else if (canCombine) {
                  setAskCombined(true);
                } else {
                  onExportOriginalCsv();
                }
              }}
            >
              <DownloadIcon /> CSV
            </Button>
          )}
        </Flex>
      </Flex>
      <AlertDialog.Root open={askCombined} onOpenChange={setAskCombined}>
        <AlertDialog.Content maxWidth="480px">
          <AlertDialog.Title>
            Download combined metadata from all sources?
          </AlertDialog.Title>
          <AlertDialog.Description size="2">
            Joins {combinedExport?.noun} metadata with FASTQ links and
            supplementary files into one CSV, at one row per run.
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end" wrap="wrap">
            <AlertDialog.Cancel>
              <Button
                variant="soft"
                color="gray"
                disabled={combining}
                onClick={() => onExportOriginalCsv()}
              >
                Only download {combinedExport?.noun} metadata
              </Button>
            </AlertDialog.Cancel>
            <Button
              onClick={(e) => {
                e.preventDefault();
                void downloadCombined();
              }}
              disabled={combining}
            >
              {combining ? <Spinner size="1" /> : <DownloadIcon />}
              {combining ? "Building CSV…" : "Yes"}
            </Button>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>
      {activeTab === "pentimento" && <SingleCellCard accession={accession} />}
      {activeTab === "longread" && (
        <LongReadChemistryCard accession={accession} />
      )}
      {activeTab === "original" && originalContent}
      {activeTab === "enriched" && enriched && (
        <EnrichedMetadataGrid
          data={enriched}
          fetchNextPage={fetchNextPage}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
        />
      )}
      {showEnriched && !enriched && isEnrichedLoading && (
        <Flex align="center" gap="2">
          <Spinner size="2" />
          <Text size="2">Loading enriched metadata...</Text>
        </Flex>
      )}
      {showEnriched && !enriched && !isEnrichedLoading && (
        <Text size="2" color="gray">
          No enriched metadata available for this study.
        </Text>
      )}
    </>
  );
}
