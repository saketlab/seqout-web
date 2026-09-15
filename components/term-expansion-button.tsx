"use client";

// Home-page ontology dialog with a master expansion switch and per-ontology switches.

import { OntologyList } from "@/components/ontology-settings-button";
import { FakeSwitch, WaypointsIcon } from "@/components/term-expansion-control";
import {
  Box,
  Button,
  Dialog,
  Flex,
  Link,
  Separator,
  Switch,
  Text,
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
      <Tooltip content={`Term expansion (${on ? "on" : "off"})`}>
        <Dialog.Trigger>
          <Button
            color="gray"
            variant="surface"
            size="3"
            style={{ gap: "var(--space-2)", paddingInline: "var(--space-3)" }}
            aria-label={`Term expansion (${on ? "on" : "off"})`}
          >
            <WaypointsIcon />
            <Box display={{ initial: "none", sm: "block" }}>
              <Text size="1">Term expansion</Text>
            </Box>
            <FakeSwitch checked={on} size="1" />
          </Button>
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
