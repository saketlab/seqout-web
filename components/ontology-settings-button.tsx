"use client";

// Ontology controls for synonym expansion. Terms merge by name and survive
// when any contributing ontology remains enabled.

import { ONTOLOGIES } from "@/utils/termExpansion";
import { useState } from "react";
import { GearIcon } from "@radix-ui/react-icons";
import {
  Dialog,
  Flex,
  IconButton,
  Separator,
  Switch,
  Text,
  Tooltip,
} from "@radix-ui/themes";

export default function OntologySettingsButton({
  disabled,
  onChange,
}: {
  /** Disabled ontology IDs. */
  disabled: string[];
  onChange: (next: string[]) => void;
}) {
  // Show tooltips on hover: Radix dialogs and popovers automatically focus this
  // button. The aria-label provides its accessible name.
  const [hovering, setHovering] = useState(false);

  return (
    <Dialog.Root>
      <Tooltip content="Ontology sources" open={hovering}>
        <Dialog.Trigger>
          <IconButton
            variant="ghost"
            color="gray"
            size={{ initial: "3", md: "1" }}
            aria-label="Ontology sources"
            onPointerEnter={() => setHovering(true)}
            onPointerLeave={() => setHovering(false)}
            onClick={() => setHovering(false)}
          >
            <GearIcon />
          </IconButton>
        </Dialog.Trigger>
      </Tooltip>
      <Dialog.Content size="3">
        <Dialog.Title size="3">Ontology sources</Dialog.Title>
        <Dialog.Description size="1" color="gray" mb="3">
          Synonyms come from these eight ontologies. Switch one off to keep its
          synonyms out of your searches.
        </Dialog.Description>
        <Separator size="4" mb="3" />
        <OntologyList disabled={disabled} onChange={onChange} />
      </Dialog.Content>
    </Dialog.Root>
  );
}

/** The per-ontology switches, shared by this dialog and the home-page one. */
export function OntologyList({
  disabled,
  onChange,
}: {
  disabled: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (id: string, on: boolean) =>
    onChange(on ? disabled.filter((d) => d !== id) : [...disabled, id]);

  return (
    <Flex direction="column" gap="3">
      {ONTOLOGIES.map((o) => (
        <Flex key={o.id} align="center" justify="between" gap="4">
          <Flex direction={"column"}>
            <Text as="label" size="2" htmlFor={`ontology-${o.id}`}>
              {o.label}
            </Text>
            <Text size={"1"} color="gray">
              {o.description}
            </Text>
          </Flex>
          <Switch
            id={`ontology-${o.id}`}
            checked={!disabled.includes(o.id)}
            onCheckedChange={(on) => toggle(o.id, on)}
          />
        </Flex>
      ))}
    </Flex>
  );
}
