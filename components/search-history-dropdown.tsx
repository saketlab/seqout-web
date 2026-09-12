"use client";
import { CountdownTimerIcon, Cross1Icon } from "@radix-ui/react-icons";
import { Box, Button, Card, Flex, Text } from "@radix-ui/themes";
import { useRef, useState } from "react";

export const SEARCH_HISTORY_LISTBOX_ID = "search-history-listbox";
export const searchHistoryOptionId = (index: number) =>
  `search-history-option-${index}`;

/** ARIA combobox props to spread onto the TextField.Root driving this dropdown. */
export function searchHistoryComboboxProps(
  isFocused: boolean,
  filteredHistory: string[],
  activeIndex: number,
) {
  return {
    role: "combobox" as const,
    "aria-expanded": isFocused && filteredHistory.length > 0,
    "aria-controls": SEARCH_HISTORY_LISTBOX_ID,
    "aria-autocomplete": "list" as const,
    "aria-activedescendant":
      activeIndex >= 0 ? searchHistoryOptionId(activeIndex) : undefined,
  };
}

interface SearchHistoryDropdownProps {
  isVisible: boolean;
  filteredHistory: string[];
  onHistoryClick: (item: string) => void;
  onRemoveItem: (item: string, e: React.MouseEvent) => void;
  activeItem?: string | null;
  position?: "relative" | "absolute";
}

export default function SearchHistoryDropdown({
  isVisible,
  filteredHistory,
  onHistoryClick,
  onRemoveItem,
  activeItem = null,
  position = "relative",
}: SearchHistoryDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  if (!isVisible || filteredHistory.length === 0) return null;

  if (position === "relative") {
    return (
      <Flex style={{ width: "100%" }} mt={"1"}>
        <Card
          variant="surface"
          ref={dropdownRef}
          style={{ width: "100%" }}
          onMouseDown={(e) => {
            // Prevent blur when clicking inside dropdown
            e.preventDefault();
          }}
        >
          <Flex direction={"column"} gap={"1"} role="listbox" id={SEARCH_HISTORY_LISTBOX_ID}>
            {filteredHistory.map((item, index) => (
              <div key={item}>
                <Flex
                  align={"center"}
                  justify={"between"}
                  role="option"
                  id={searchHistoryOptionId(index)}
                  aria-selected={activeItem === item}
                  style={{
                    cursor: "pointer",
                    color: "var(--accent-12)",
                    backgroundColor:
                      hoveredItem === item || activeItem === item
                        ? "var(--accent-5)"
                        : undefined,
                    borderRadius: "4px",
                    padding: "0.2rem 0.5rem 0.2rem 0.5rem",
                  }}
                  onClick={() => onHistoryClick(item)}
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Flex align={"center"} gap={"2"}>
                    <CountdownTimerIcon />
                    <Text>{item}</Text>
                  </Flex>
                  <Button
                    variant="ghost"
                    aria-label={`Remove "${item}" from search history`}
                    onClick={(e) => onRemoveItem(item, e)}
                    style={{ minWidth: 44, minHeight: 44 }}
                  >
                    <Cross1Icon />
                  </Button>
                </Flex>
              </div>
            ))}
          </Flex>
        </Card>
      </Flex>
    );
  } else {
    return (
      <Box
        style={{
          position: "absolute",
          top: "calc(100% + 4px)",
          left: 0,
          right: 0,
          zIndex: 100,
        }}
      >
        <Card
          ref={dropdownRef}
          variant="surface"
          style={{ width: "100%" }}
          onMouseDown={(e) => {
            // Prevent blur when clicking inside dropdown
            e.preventDefault();
          }}
        >
          <Flex direction={"column"} gap={"2"} role="listbox" id={SEARCH_HISTORY_LISTBOX_ID}>
            {filteredHistory.map((item, index) => (
              <div key={item}>
                <Flex
                  align={"center"}
                  justify={"between"}
                  role="option"
                  id={searchHistoryOptionId(index)}
                  aria-selected={activeItem === item}
                  style={{
                    cursor: "pointer",
                    color: "var(--accent-12)",
                    backgroundColor:
                      hoveredItem === item || activeItem === item
                        ? "var(--accent-5)"
                        : undefined,
                    borderRadius: "4px",
                    padding: "0.2rem 0.5rem 0.2rem 0.5rem",
                  }}
                  onClick={() => onHistoryClick(item)}
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Flex align={"center"} gap={"2"}>
                    <CountdownTimerIcon />
                    <Text>{item}</Text>
                  </Flex>
                  <Button
                    variant="ghost"
                    aria-label={`Remove "${item}" from search history`}
                    onClick={(e) => onRemoveItem(item, e)}
                    style={{ minWidth: 44, minHeight: 44 }}
                  >
                    <Cross1Icon />
                  </Button>
                </Flex>
              </div>
            ))}
          </Flex>
        </Card>
      </Box>
    );
  }
}
