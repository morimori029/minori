import { Sidebar } from "@/components/sidebar";
import { createClient } from "@/lib/supabase-server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar email={user?.email} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
