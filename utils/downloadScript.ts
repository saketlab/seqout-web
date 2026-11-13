export const shellEscapeSingleQuotes = (value: string): string =>
  `'${value.replace(/'/g, `'"'"'`)}'`;

export const buildCurlCommand = (url: string): string =>
  `curl -O ${shellEscapeSingleQuotes(url)}`;

export const AXEL_DEFAULT_CONNECTIONS = 12;
export const AXEL_MAX_CONNECTIONS = 20;

/** Pass `axelConnections` (axel's -n) to get an axel script; otherwise curl. */
export const buildSupplementaryDownloadScript = (
  items: { browserDownloadUrl: string }[],
  axelConnections?: number | null,
): string => {
  if (items.length === 0) return "";
  if (axelConnections) {
    // -c skips files already complete; a partial resumes from its .st file.
    return `for url in ${items
      .map((item) => shellEscapeSingleQuotes(item.browserDownloadUrl))
      .join(" ")}; do axel -a -c -n ${axelConnections} "$url"; done`;
  }
  return `curl -L -C - --retry 10 --retry-delay 5 --retry-all-errors --fail ${items
    .map((item) => `-O ${shellEscapeSingleQuotes(item.browserDownloadUrl)}`)
    .join(" ")}`;
};
