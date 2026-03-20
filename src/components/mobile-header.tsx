"use client";

import { useState } from "react";
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
  Menu,
  X,
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

export function MobileHeader({ email }: { email?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    setOpen(false);
  }

  return (
    <>
      {/* モバイル用トップバー（md以上では非表示） */}
      <header className="md:hidden border-b bg-background sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-green-600" />
            <span className="text-lg font-bold text-green-700">みのり</span>
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="p-1.5 rounded-lg hover:bg-muted"
            aria-label="メニュー"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* オーバーレイ（md以上では非表示） */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* スライドメニュー（md以上では非表示） */}
      <div
        className={cn(
          "md:hidden fixed top-0 right-0 bottom-0 z-50 w-64 bg-background border-l shadow-xl transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-4 border-b">
            <div className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-green-600" />
              <span className="font-bold text-green-700">みのり</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
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
        </div>
      </div>
    </>
  );
}
