import { workspace } from "@/lib/data";
import { Workbench } from "@/components/workbench";
export const dynamic = "force-dynamic";
export default async function Projects() {
  return <Workbench data={await workspace()} section="projects" />;
}
