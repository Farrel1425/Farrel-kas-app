import { configured } from "@/lib/supabase/server";
import { Login } from "@/components/login";
export const dynamic = "force-dynamic";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ inactive?: string }>;
}) {
  return (
    <Login
      ready={configured()}
      inactive={(await searchParams).inactive === "1"}
    />
  );
}
