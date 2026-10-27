
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderSearch,
  ChartNoAxesCombined,
  Users,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sprout,
  History,
  
  BarChart2, 
} from "lucide-react";



const navigationItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Research Projects", icon: FolderSearch, href: "/" },
  { label: "Research Results", icon: ChartNoAxesCombined, href: "/" },
  { label: "Historical Elections", icon: History, href: "/historical-elections" },
  { label: "Historical Analytics", icon: BarChart2, href: "/historical-analytics" },
  { label: "Members", icon: Users, href: "/" },
  { label: "Messages", icon: MessageSquare, href: "/" },
  { label: "Settings", icon: Settings, href: "/" },
];


export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`sticky top-0 flex h-screen shrink-0 flex-col self-start border-r border-slate-200 bg-white transition-all duration-200 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      
        <div className="flex h-16 items-center gap-3 border-b border-slate-100 px-5">
        <button
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#1B4332] text-white transition hover:bg-[#24563F]"
        >
            <Sprout size={21} />
        </button>

        {!collapsed && (
            <span className="text-lg font-bold tracking-tight text-slate-900">
            Sentiverse
            </span>
        )}
        </div>


      <nav className="flex-1 space-y-1 p-3">
        
        {navigationItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
            <Link
            key={item.label}
            href={item.href}
            title={collapsed ? item.label : undefined}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                isActive
                ? "bg-[#1B4332] text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            } ${collapsed ? "justify-center" : ""}`}
            >
            <Icon size={20} className="shrink-0" />
            {!collapsed && <span>{item.label}</span>}
            </Link>
        );
        })}

      </nav>

      
    </aside>
  );
}
