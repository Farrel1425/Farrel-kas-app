import { notFound } from "next/navigation";
import { workspace } from "@/lib/data";
import { Workbench } from "@/components/workbench";
export const dynamic = "force-dynamic";
export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string; view?: string[] }>;
}) {
  const { id, view } = await params;
  const data = await workspace();
  if (
    !data.projects.some((p) => p.id === id) ||
    (view && view.length !== 1) ||
    !["overview", "transactions", "categories", "share"].includes(
      view?.[0] ?? "overview",
    )
  )
    notFound();
  return (
    <Workbench
      data={data}
      section="projects"
      projectId={id}
      view={view?.[0] ?? "overview"}
    />
  );
}
