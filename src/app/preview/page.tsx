import { demo } from "@/lib/demo";
import { Workbench } from "@/components/workbench";
export default async function Preview({
  searchParams,
}: {
  searchParams: Promise<{ path?: string }>;
}) {
  const path = (await searchParams).path ?? "/dashboard";
  const parts = path.split("/");
  return (
    <Workbench
      data={demo}
      section={
        ["dashboard", "projects", "admins"].includes(parts[1])
          ? parts[1]
          : "dashboard"
      }
      projectId={parts[2]}
      view={parts[3] ?? "overview"}
      preview
    />
  );
}
