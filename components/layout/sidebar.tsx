"use client";

import {
  FolderTree,
  List,
  Package,
  Truck,
  Users,
  Briefcase,
  Calculator,
  Sliders,
} from "lucide-react";
import { NavItem } from "./nav-item";

const navSections = [
  {
    label: "BAZA DANYCH",
    items: [
      { href: "/kategorie", icon: FolderTree, label: "Kategorie" },
      { href: "/pozycje", icon: List, label: "Pozycje" },
      { href: "/materialy", icon: Package, label: "Materiały" },
      { href: "/dostawcy", icon: Truck, label: "Dostawcy" },
      { href: "/podwykonawcy", icon: Users, label: "Podwykonawcy" },
    ],
  },
  {
    label: "PROJEKTY",
    items: [
      { href: "/projekty", icon: Briefcase, label: "Projekty" },
      { href: "/kosztorys", icon: Calculator, label: "Kosztorys" },
      { href: "/kalkulatory", icon: Sliders, label: "Kalkulatory" },
    ],
  },
];

export function Sidebar() {
  return (
    <aside
      className="fixed w-[240px] h-screen border-r border-white/[0.08] flex flex-col"
      style={{ backgroundColor: '#12121A' }}
    >
      {/* Logo */}
      <div className="h-[72px] flex items-center px-4 border-b border-white/[0.08]">
        <span className="text-xl font-mono font-bold tracking-tight text-foreground">
          PLANY
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label} className="mb-6">
            <div className="px-4 mb-2">
              <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                {section.label}
              </span>
            </div>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
