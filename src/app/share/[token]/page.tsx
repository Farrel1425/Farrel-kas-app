import { publicReport } from "@/lib/data";
import { PublicReport } from "@/components/public-report";
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicReport {...await publicReport(token)} token={token} />;
}
