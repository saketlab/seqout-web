"use client";
import SearchHistoryDropdown, {
  searchHistoryComboboxProps,
} from "@/components/search-history-dropdown";
import TermExpansionButton from "@/components/term-expansion-button";
import { useSearchQuery } from "@/context/search_query";
import { SEARCH_PLACEHOLDER } from "@/utils/constants";
import {
  EXPANSION_PARAM,
  ONTOLOGY_PARAM,
  readDisabledOntologies,
  readExpansionPreference,
  writeDisabledOntologies,
  writeExpansionPreference,
} from "@/utils/termExpansion";
import { useSearchHistory } from "@/utils/useSearchHistory";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Box, Flex, TextField } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

export default function HeroSearchBar() {
  const { setLastSearchQuery } = useSearchQuery();
  const [query, setQuery] = useState("");
  const [suggestionFilterQuery, setSuggestionFilterQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const { history, saveHistory, performSearch } = useSearchHistory();
  const router = useRouter();

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      inputRef.current?.focus();
    }
  }, []);
  // Safe to read during the first render even though it is client-only state:
  // the switch lives in a popover that mounts on open, so the server HTML and
  // the hydration pass render the same thing (just the button) either way.
  const [expansionOn, setExpansionOn] = useState(readExpansionPreference);
  const [disabledOntologies, setDisabledOntologies] = useState(
    readDisabledOntologies,
  );

  // Carry the expansion default into the URL so the resulting search is shareable.
  const expansionParams = () => {
    const carry = new URLSearchParams();
    if (!expansionOn) carry.set(EXPANSION_PARAM, "0");
    if (disabledOntologies.length)
      carry.set(ONTOLOGY_PARAM, disabledOntologies.join(","));
    return carry;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) setLastSearchQuery(trimmed);
    await performSearch(query, router.push, expansionParams());
  };

  const handleHistoryClick = async (item: string) => {
    setQuery(item);
    setIsFocused(false);
    await performSearch(item, router.push, expansionParams());
  };

  const removeItem = (item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveHistory(history.filter((h) => h !== item));
  };

  // Filter history based on query - only show if query has text
  const trimmedQuery = suggestionFilterQuery.trim();
  const filteredHistory = trimmedQuery
    ? history
        .filter((h) => {
          const hLower = h.toLowerCase();
          const qLower = trimmedQuery.toLowerCase();
          // include if it contains the query but is not an exact match
          return hLower.includes(qLower) && hLower !== qLower;
        })
        .slice(0, 5)
    : [];

  return (
    <Box width={{ initial: "95%", md: "50%" }} style={{ position: "relative" }}>
      <Flex direction={"column"} gap={"4"}>
        <Flex align="center" gap="2">
          <Box flexGrow="1" style={{ minWidth: 0 }}>
            <form onSubmit={handleSubmit}>
              <TextField.Root
                aria-label="main search bar"
                data-global-search-target="true"
                type="search"
                enterKeyHint="search"
                placeholder={SEARCH_PLACEHOLDER}
                size="3"
                value={query}
                {...searchHistoryComboboxProps(
                  isFocused,
                  filteredHistory,
                  activeIndex,
                )}
                ref={inputRef}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSuggestionFilterQuery(e.target.value);
                  setActiveIndex(-1);
                }}
                onFocus={() => {
                  setIsFocused(true);
                  setSuggestionFilterQuery(query);
                  setActiveIndex(-1);
                }}
                onBlur={() => {
                  setIsFocused(false);
                  setActiveIndex(-1);
                }}
                onKeyDown={(e) => {
                  if (!isFocused || filteredHistory.length === 0) return;

                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveIndex((prev) => {
                      const nextIndex =
                        prev === -1 ? 0 : (prev + 1) % filteredHistory.length;
                      const nextItem = filteredHistory[nextIndex];
                      setQuery(nextItem);
                      requestAnimationFrame(() => {
                        const input = inputRef.current;
                        if (!input) return;
                        const pos = nextItem.length;
                        input.setSelectionRange(pos, pos);
                      });
                      return nextIndex;
                    });
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveIndex((prev) => {
                      const nextIndex =
                        prev === -1
                          ? filteredHistory.length - 1
                          : (prev - 1 + filteredHistory.length) %
                            filteredHistory.length;
                      const nextItem = filteredHistory[nextIndex];
                      setQuery(nextItem);
                      requestAnimationFrame(() => {
                        const input = inputRef.current;
                        if (!input) return;
                        const pos = nextItem.length;
                        input.setSelectionRange(pos, pos);
                      });
                      return nextIndex;
                    });
                  } else if (e.key === "Enter") {
                    if (activeIndex >= 0) {
                      e.preventDefault();
                      const item = filteredHistory[activeIndex];
                      void handleHistoryClick(item);
                    }
                  } else if (e.key === "Escape") {
                    setIsFocused(false);
                    setActiveIndex(-1);
                  }
                }}
              >
                <TextField.Slot>
                  <MagnifyingGlassIcon height="16" width="16" />
                </TextField.Slot>
              </TextField.Root>
            </form>
          </Box>
          <TermExpansionButton
            on={expansionOn}
            onChange={(next) => {
              setExpansionOn(next);
              writeExpansionPreference(next);
            }}
            disabledOntologies={disabledOntologies}
            onChangeOntologies={(next) => {
              setDisabledOntologies(next);
              writeDisabledOntologies(next);
            }}
          />
        </Flex>
      </Flex>
      <SearchHistoryDropdown
        isVisible={isFocused}
        filteredHistory={filteredHistory}
        onHistoryClick={handleHistoryClick}
        onRemoveItem={removeItem}
        activeItem={activeIndex >= 0 ? filteredHistory[activeIndex] : null}
        position="absolute"
      />
    </Box>
  );
}
