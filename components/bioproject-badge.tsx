import { NEUTRAL_BADGE_COLORS } from "@/utils/db-colors";
import { EnterIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { Badge, Flex } from "@radix-ui/themes";
import type { CSSProperties } from "react";

const PRJ_STYLE = {
  "--db": NEUTRAL_BADGE_COLORS.prj.hex,
  "--db-fg": NEUTRAL_BADGE_COLORS.prj.fg.light,
  "--db-fg-dark": NEUTRAL_BADGE_COLORS.prj.fg.dark,
  cursor: "pointer",
  whiteSpace: "nowrap",
} as CSSProperties;

const VISIT_STYLE = {
  "--db": NEUTRAL_BADGE_COLORS.visit.hex,
  "--db-fg": NEUTRAL_BADGE_COLORS.visit.fg.light,
  "--db-fg-dark": NEUTRAL_BADGE_COLORS.visit.fg.dark,
  cursor: "pointer",
  whiteSpace: "nowrap",
} as CSSProperties;

export default function BioProjectBadge({
  accession,
  ncbiHref,
}: {
  accession: string;
  ncbiHref?: string;
}) {
  return (
    <Flex align="center" gap="2">
      <a href={`/p/${accession}`}>
        <Badge
          size={{ initial: "2", md: "3" }}
          style={PRJ_STYLE}
          className="seqout-accession db-badge"
        >
          {accession}
          <EnterIcon />
        </Badge>
      </a>
      <a
        href={ncbiHref ?? `https://www.ncbi.nlm.nih.gov/bioproject/${accession}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visit ${accession} BioProject page`}
      >
        <Badge
          size={{ initial: "2", md: "3" }}
          className="db-badge"
          style={VISIT_STYLE}
        >
          Visit BioProject page
          <ExternalLinkIcon />
        </Badge>
      </a>
    </Flex>
  );
}
