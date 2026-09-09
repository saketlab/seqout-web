import { EnterIcon, ExternalLinkIcon } from "@radix-ui/react-icons";
import { Badge, Flex } from "@radix-ui/themes";
import type { CSSProperties } from "react";

// Use muted grey to distinguish BioProject IDs from study accession badges.
const PRJ_STYLE = {
  "--db": "#797979",
  "--db-fg": "#696969",
  "--db-fg-dark": "#8f8f8f",
  cursor: "pointer",
  whiteSpace: "nowrap",
} as CSSProperties;

// tab10 muted's blue.
const VISIT_STYLE = {
  "--db": "#4878d0",
  "--db-fg": "#3265c3",
  "--db-fg-dark": "#6990d8",
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
