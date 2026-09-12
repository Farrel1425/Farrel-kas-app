import { redirect } from "next/navigation";
import { workspace } from "@/lib/data";
import { Workbench } from "@/components/workbench";
export const dynamic = "force-dynamic";
export default async function Admins() {
  const data = await workspace();
  if (data.profile.role !== "master_admin") redirect("/dashboard");
  return <Workbench data={data} section="admins" />;
}
