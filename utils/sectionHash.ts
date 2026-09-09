/** Encode section links with an optional active tab after `=`, as in `#samples=enriched`. */
export function buildSectionHash(id: string, tab?: string): string {
  return tab ? `${id}=${tab}` : id;
}

export function parseSectionHash(hash: string): { id: string; tab?: string } {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const [id, tab] = raw.split("=");
  return { id: id ?? "", tab: tab || undefined };
}
