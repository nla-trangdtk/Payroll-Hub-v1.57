/* eslint-disable @typescript-eslint/no-unused-vars */
import { Link, useLocation } from "react-router";
import {
  CircleDollarSign,
  Building2,
  Database,
  ShieldCheck,
  CreditCard,
  Table2,
  Bell,
  User,
  Settings,
  Settings2,
  Trash2,
  Menu,
  ListChecks,
  Users,
  BarChart3,
  Coins,
  Wallet,
  CalendarIcon,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useAppData } from "../../lib/contexts/AppDataContext";
import { PuppyLogo } from "../shared/PuppyLogo";
import { MonthPicker } from "../shared/MonthPicker";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

const navigationItems = [
  { id: "centers", label: "Timesheet", icon: BarChart3, path: "/centers" },
  { id: "audit", label: "Audit", icon: ShieldCheck, path: "/audit" },
  { id: "master-ae", label: "Master", icon: Database, path: "/master-ae" },
  { id: "hold-dashboard", label: "Balance", icon: Wallet, path: "/hold-dashboard" },
];

const configItems = [
  { to: "/config/centers", icon: ListChecks, label: "Centers Data" },
  { to: "/config/ae", icon: Users, label: "AE Data" },
];

interface NavbarProps {
  onToggleMobileMenu: () => void;
  onOpenSettings: () => void;
}

export function Navbar({ onToggleMobileMenu, onOpenSettings }: NavbarProps) {
  const location = useLocation();
  const { appData, updateAppData } = useAppData();

  const showMonthCard = location.pathname === "/master-ae" || location.pathname === "/hold-dashboard";
  const currentMonth = appData.globalMonth || "03.2026";

  return (
    <div className="h-[70px] flex items-center justify-between px-0 gap-6 bg-transparent shrink-0 w-full">
      {/* Left side: Hamburger Circle & Logo */}
      <div className="flex items-center gap-4 shrink-0">
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-full hover:bg-white/50 text-[#3D3935] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <Link to="/" className="flex items-center gap-3 group/navlogo select-none cursor-pointer">
          <div style={{ width: '47.2222px' }} className="hidden lg:flex shrink-0 transition-transform duration-300 group-hover/navlogo:scale-105">
            <PuppyLogo size={48} type="web" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-waterfall text-[39px] italic font-bold text-[#8c3646] leading-[30px] tracking-tight transition-colors duration-300 group-hover/navlogo:text-[#8c3646]/80">
              Payroll Hub
            </h1>
            <span className="font-mono text-[8px] lg:text-[9.5px] tracking-[0.3em] uppercase text-[#3D3935]/50 mt-1.5 font-bold">
              Institutional Administration
            </span>
          </div>
        </Link>
      </div>

      {/* Center: Soft Sky Pill Navigation */}
      <nav className="hidden lg:flex items-center justify-center flex-1">
        <div className="flex items-center bg-[#E1F1F8] p-1 rounded-full border border-[rgba(61,57,53,0.08)] shadow-inner ml-[-200px] px-1 pb-1">
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path || (location.pathname === '/' && item.path === '/centers');
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`px-6 py-1.5 text-[11px] font-bold tracking-wider transition-all duration-300 rounded-full lowercase font-sans ${
                  isActive
                    ? "bg-white text-[#E5A8A0] shadow-sm scale-102"
                    : "text-[#3D3935]/70 hover:text-[#3D3935] hover:scale-102"
                }`}
                title={item.label}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Right side: MonthPicker, Settings */}
      <div className="flex items-center gap-4 shrink-0">
        {showMonthCard && (
          <div className="flex items-center gap-2">
            <span
              className="font-mono uppercase tracking-widest hidden md:inline-block text-[#3D3935]/50"
              style={{ fontSize: "9px" }}
            >
              period:
            </span>
            <MonthPicker
              value={currentMonth}
              onChange={(newVal) => {
                if (newVal) {
                  updateAppData((prev) => ({ ...prev, globalMonth: newVal }));
                }
              }}
              align="end"
            />
          </div>
        )}

        <button
          onClick={onOpenSettings}
          className="p-2 rounded-full hover:bg-white/50 text-[#3D3935] transition-colors"
          title="Cài đặt"
        >
          <Settings2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
