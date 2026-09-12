import PublicationProjectsBody from "@/components/publication-projects-body";

export default async function PublicationProjectsPage({
  params,
}: {
  params: Promise<{ pmid: string }>;
}) {
  const { pmid } = await params;
  return <PublicationProjectsBody key={pmid} pmid={pmid} />;
}
