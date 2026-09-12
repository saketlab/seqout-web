import AuthorProjectsBody from "@/components/author-projects-body";

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s; // Preserve malformed percent-encoded segments as-is.
  }
}

export default async function AuthorProjectsPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name: raw } = await params;
  const name = safeDecode(raw);
  return <AuthorProjectsBody key={name} name={name} />;
}
