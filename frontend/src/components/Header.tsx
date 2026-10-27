
"use client";

import { Bell, Search } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div className="flex items-center gap-3">
        <button
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Open navigation"
        >
         
        </button>

        <div>
          <h1 className="text-lg font-semibold text-slate-900">
            Welcome to Sentiverse
          </h1>
          <p className="hidden text-xs text-slate-500 sm:block">
            Role:MLA
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Search"
        >
          <Search size={20} />
        </button>

        <button
          className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" />
        </button>

        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#DBEAFE] text-sm font-semibold text-[#1B4332]">
          U
        </div>
      </div>
    </header>
  );
}
