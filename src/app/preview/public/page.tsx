import { demo } from "@/lib/demo";
import { PublicReport } from "@/components/public-report";
export default function PublicPreview() {
  const project = demo.projects[0];
  return (
    <PublicReport
      project={project}
      categories={demo.categories.filter((c) => c.project_id === project.id)}
      transactions={demo.transactions.filter(
        (t) => t.project_id === project.id,
      )}
      token="preview"
      preview
    />
  );
}
