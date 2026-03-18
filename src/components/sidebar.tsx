"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  History,
  MapPin,
  Package,
  FileText,
  Sprout,
  Leaf,
  Truck,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase";

const navItems = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/sales", label: "売上入力", icon: TrendingUp },
  { href: "/history", label: "売上履歴", icon: History },
  { href: "/routes", label: "販路管理", icon: MapPin },
  { href: "/crops", label: "作物管理", icon: Leaf },
  { href: "/shipment", label: "出荷計画", icon: Truck },
  { href: "/inventory", label: "在庫管理", icon: Package },
  { href: "/invoice", label: "請求書", icon: FileText },
  { href: "/settings", label: "農園設定", icon: Settings },
];

type SidebarProps = {
  email?: string;
};

export function Sidebar({ email }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-60 shrink-0 border-r bg-background flex flex-col h-screen sticky top-0">
      {/* ロゴ */}
      <div className="flex items-center gap-2 px-6 py-5 border-b">
        <Sprout className="h-6 w-6 text-green-600" />
        <span className="text-xl font-bold text-green-700">みのり</span>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === href
                ? "bg-green-50 text-green-700"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* フッター：ユーザー情報＋ログアウト */}
      <div className="px-4 py-4 border-t space-y-2">
        {email && (
          <p className="text-xs text-muted-foreground truncate px-2">{email}</p>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-2 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          ログアウト
        </button>
      </div>
    </aside>
  );
}
