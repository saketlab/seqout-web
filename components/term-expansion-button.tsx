"use client";

// Home-page ontology dialog with a master expansion switch and per-ontology switches.

import { OntologyList } from "@/components/ontology-settings-button";
import { WaypointsIcon } from "@/components/term-expansion-control";
import {
  Dialog,
  Flex,
  IconButton,
  Link,
  Separator,
  Switch,
  Tooltip,
} from "@radix-ui/themes";

export default function TermExpansionButton({
  on,
  onChange,
  disabledOntologies,
  onChangeOntologies,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  disabledOntologies: string[];
  onChangeOntologies: (next: string[]) => void;
}) {
  return (
    <Dialog.Root>
      <Tooltip content="Term expansion">
        <Dialog.Trigger>
          <IconButton
            variant="soft"
            color="gray"
            size="3"
            aria-label="Term expansion"
          >
            <WaypointsIcon />
          </IconButton>
        </Dialog.Trigger>
      </Tooltip>
      <Dialog.Content size="3">
        <Flex align="center" justify="between" gap="4">
          <Dialog.Title size="3" mb="0" as="h2">
            Term expansion
          </Dialog.Title>
          <Switch
            id="term-expansion-switch"
            checked={on}
            onCheckedChange={onChange}
            aria-label="Term expansion"
          />
        </Flex>
        <Dialog.Description size="1" color="gray" mb="3" mt="1">
          Synonyms come from these eight ontologies. Switch one off to keep its
          synonyms out of your searches. To learn more about term expansion,
          read{" "}
          <Link href="/howsearchworks#expansion" target="_blank">
            <em>How search works</em>
          </Link>
          .
        </Dialog.Description>
        <Separator size="4" mb="3" />
        <OntologyList
          disabled={disabledOntologies}
          onChange={onChangeOntologies}
        />
      </Dialog.Content>
    </Dialog.Root>
  );
}
