import { InfoCircledIcon } from "@radix-ui/react-icons";
import { IconButton, Popover, Text } from "@radix-ui/themes";

export default function InfoPopOver({ infoText }: { infoText: string }) {
  return (
    <Popover.Root>
      <Popover.Trigger>
        <IconButton
          size="1"
          variant="ghost"
          aria-label="More information"
          style={{ marginRight: "0.5rem" }}
        >
          <InfoCircledIcon />
        </IconButton>
      </Popover.Trigger>
      <Popover.Content width="360px">
        <Text size="2">{infoText}</Text>
      </Popover.Content>
    </Popover.Root>
  );
}
