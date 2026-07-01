/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState } from "react";
import { toast } from "sonner";
import {
  Banknote,
  Users,
  AlertCircle,
  Zap,
  ShieldCheck,
  ArrowRight,
  Table2,
  CreditCard,
  LayoutDashboard,
  Settings,
  FileCheck,
  ChevronRight,
  TrendingUp,
  Activity,
  Database,
  Flower2,
  EyeOff,
  Eye,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router";
import { useAppData } from "../../lib/contexts/AppDataContext";
import { formatVND, parseMoneyToNumber } from "../../lib/utils/data-utils";
import { StatCard } from "./components/StatCard";
import { motion } from "motion/react";
import { DashboardCharts } from "./components/DashboardCharts";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
} as const;

// Helper interactive StampSpot component matching the Loyalty Card design from Image 1
const StampSpot = ({ id, title, bgColor, borderColor }: { id: string; title: string; bgColor: string; borderColor: string }) => {
  const [stamped, setStamped] = useState(() => {
    return localStorage.getItem(`stamp_${id}`) === "true";
  });
  
  const handleToggle = () => {
    const next = !stamped;
    setStamped(next);
    localStorage.setItem(`stamp_${id}`, String(next));
    if (next) {
      toast.success(`🐾 Đã đóng dấu mốc "${title}" thành công! I woof you like it!`, {
        duration: 3000,
        icon: "🐾",
      });
      
      // Look if both Interactive stamp 4 and 5 are stamped to show final celebration limit
      const otherId = id === "stamp4" ? "stamp5" : "stamp4";
      const otherStamped = localStorage.getItem(`stamp_${otherId}`) === "true";
      if (otherStamped) {
        setTimeout(() => {
          toast.success("✨ HOAN HÔ! Bạn đã thu thập đủ 5 con dấu của Payroll! Bạn thật tuyệt vời! 💕🐾", {
            duration: 6000,
            icon: "🏆",
          });
        }, 1200);
      }
    }
  };

  return (
    <div 
      onClick={handleToggle}
      className="bg-white/95 border border-[#e6dfd3] rounded-3xl p-4 flex flex-col items-center justify-center text-center relative shadow-sm cursor-pointer hover:border-[#ce9fa9] hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all duration-300 group/stamp select-none"
    >
      <div className={`w-16 h-16 rounded-full ${bgColor} border border-dashed ${borderColor} flex items-center justify-center relative overflow-hidden mb-2 transition-transform duration-300 group-hover/stamp:scale-105`}>
        {stamped ? (
          <span className="text-3.5xl scale-125 select-none animate-[bounce_0.6s_ease-out_infinite_alternate]">🐾</span>
        ) : (
          <span className="text-2xl text-[#ce9fa9]/40 group-hover/stamp:text-[#ce9fa9]/70 font-display transition-colors">?</span>
        )}
      </div>
      <span className="text-xs font-serif font-black text-[#351b12]">{title}</span>
      <span className="text-[9px] font-bold uppercase tracking-wider mt-1 transition-colors duration-300" style={{ color: stamped ? '#1a7a72' : '#705850' }}>
        {stamped ? "Stamped" : "Tap to Stamp"}
      </span>
    </div>
  );
};

export function Dashboard() {
  const navigate = useNavigate();
  const { appData } = useAppData();

  const [hiddenCards, setHiddenCards] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("dashboard_hidden_cards");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const toggleCardVisibility = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHiddenCards((prev) => {
      const next = prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path];
      localStorage.setItem("dashboard_hidden_cards", JSON.stringify(next));
      return next;
    });
  };

  const totalAuditErrors = appData.AuditReport.data.length;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 flex flex-col h-full overflow-y-auto bg-transparent p-6 gap-8 w-full"
    >
      {/* Header Section */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col md:flex-row md:items-end justify-between gap-8"
      >
        <div className="space-y-4">
          <div className="flex items-stretch gap-3">
            <div className="vintage-button-icon bg-primary/30 border border-border !h-auto aspect-square">
              <LayoutDashboard className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[12px] font-bold uppercase tracking-[0.3em] text-muted-foreground leading-none">
                System Status
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.3em] text-primary mt-1 leading-none">
                Operational
              </span>
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-display text-foreground leading-tight flex flex-wrap items-baseline gap-x-4">
            <span className="not-italic font-script text-primary text-5xl md:text-7xl lowercase">
              Payroll
            </span>
            <span>Management</span>
            <span className="text-secondary text-2xl uppercase tracking-[0.2em] block w-full mt-2 font-sans font-black">
              Dashboard
            </span>
          </h1>
          <p className="text-foreground/70 text-lg font-medium italic font-serif max-w-[600px] leading-relaxed">
            Quản lý lương và kiểm toán chuyên nghiệp. Theo dõi phân phối thời
            gian thực và phát hiện các sai lệch.
          </p>
        </div>

        <div 
          className="flex items-center gap-4 px-3 p-3 ml-2 mt-[1px] mb-0"
        >
          <button
            onClick={() => navigate("/audit")}
            className="vintage-button bg-primary text-white border-none shadow-md hover:shadow-xl px-10"
            style={{ width: '294.312px' }}
          >
            <div className="flex items-center gap-3 justify-center">
              <FileCheck className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-widest">
                Run Audit
              </span>
            </div>
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Quick Access Column */}
        <motion.div variants={itemVariants} className="lg:col-span-3 space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-secondary/30 rounded-full flex items-center justify-center border border-secondary">
                <Zap className="w-5 h-5 text-secondary-foreground" />
              </div>
              <h2 className="text-[25px] font-normal font-serif text-foreground tracking-tight">
                Quick{" "}
                <span className="not-italic font-script text-primary text-[33px] lowercase">
                  Actions
                </span>
              </h2>
              <div className="h-1.5 w-32 bg-primary/10 rounded-full mt-2 relative overflow-hidden hidden sm:block">
                <div className="absolute inset-0 bg-primary/20 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-shimmer" />
              </div>
            </div>
            {hiddenCards.length > 0 && (
              <button
                onClick={() => {
                  setHiddenCards([]);
                  localStorage.removeItem("dashboard_hidden_cards");
                }}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors bg-white/50 px-3 py-1.5 rounded-full border border-border mt-2 sm:mt-0"
                title="Khôi phục các mục đã ẩn"
              >
                <Eye className="w-4 h-4" />
                <span>Restore Hidden</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Master AE",
                icon: Database,
                path: "/master-ae",
                desc: "Manage AE data sheets",
                color: "text-primary",
                bg: "bg-primary/5",
              },
              {
                title: "Bulk Payment",
                icon: CreditCard,
                path: "/payment",
                desc: "Process bank exports",
                color: "text-secondary-foreground",
                bg: "bg-secondary/10",
              },
              {
                title: "Audit Center",
                icon: ShieldCheck,
                path: "/audit",
                desc: "Compare payroll data",
                color: "text-rose-500",
                bg: "bg-rose-50",
              },
              {
                title: "Balance",
                icon: Wallet,
                path: "/hold-dashboard",
                desc: "Track & adjust trial balance",
                color: "text-[#ce9fa9]",
                bg: "bg-[#ce9fa9]/10",
              },
            ]
              .filter((link) => !hiddenCards.includes(link.path))
              .map((link) => (
                <div
                  key={link.path}
                  onClick={() => navigate(link.path)}
                  className="group relative p-8 bg-white force-light border border-border rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.02)] transition-all cursor-pointer flex flex-col gap-6 hover:shadow-xl hover:-translate-y-1"
                >
                  <button
                    onClick={(e) => toggleCardVisibility(link.path, e)}
                    title="Ẩn mục này"
                    className="absolute top-6 right-6 p-2 rounded-full bg-white hover:bg-slate-100 text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-all z-10 shadow-sm border border-transparent hover:border-border"
                  >
                    <EyeOff className="w-4 h-4" />
                  </button>
                  <div className="flex items-center justify-between">
                    <div
                      className={`p-5 ${link.bg} rounded-full transition-all duration-500 shadow-sm`}
                    >
                      <link.icon
                        className={`w-7 h-7 ${link.color} transition-colors`}
                      />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center transition-colors group-hover:bg-primary/5">
                      <ChevronRight className="w-5 h-5 text-foreground/20 transition-all group-hover:text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-serif text-xl text-foreground mb-1">
                      {link.title}
                    </h3>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.1em]">
                      {link.desc}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </motion.div>
      </div>

      {/* Compani Audit Loyalty Stamp Card — Whimsical feature directly translated from the user's reference image */}
      <motion.div
        variants={itemVariants}
        className="w-full"
      >
        <div className="relative overflow-hidden bg-[#faf7f0] border-2 border-[#d4c9b7] rounded-[2.5rem] shadow-[0_12px_44px_-12px_rgba(53,27,18,0.12)] pb-6 md:pb-8 pt-0 px-0 flex flex-col gap-8 z-0">
          {/* Top subtle vintage background accents */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-[#ce9fa9]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-[#feed7a]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Card Top Header area */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#e6dfd3] pb-6 shrink-0 relative z-10 px-6 md:px-8 pt-6 md:pt-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#feed7a] border border-[#351b12] flex items-center justify-center rotate-3 shadow-sm">
                <span className="text-xl">🐾</span>
              </div>
              <div className="flex flex-col">
                <span className="font-chunky text-3xl text-[#351b12] tracking-tight">Compani</span>
                <span className="font-sans text-[9px] font-black tracking-[0.2em] uppercase text-[#705850]">AUDIT LOYALTY CLUB</span>
              </div>
            </div>

            {/* Bubble banner on top-right exactly like the pink circle sticker */}
            <div className="relative group">
              <div className="bg-[#fbc0d4] text-[#7c1a28] font-serif italic text-sm px-3 py-0 rounded-full border border-[#ffffff] shadow-sm flex items-center gap-1.5 hover:scale-105 transition-transform duration-300">
                <span className="not-italic text-xs font-sans">💕</span>
                <span>I woof you like it!</span>
              </div>
            </div>
          </div>

          {/* Stamps Board - Horizontal layout with the exact 5 items from the image */}
          <div className="flex flex-col gap-4 relative z-10 px-6 md:px-8">
            <div className="text-center sm:text-left">
              <h3 className="font-serif text-2.5xl text-[#2d1912] leading-none mb-1">Audit Loyalty Stamps</h3>
              <p className="text-xs text-[#705850] font-medium font-sans">Độ tin cậy kiểm toán: Nhấn vào các ô trống để hoàn tất các mốc kiểm toán và nhận đóng dấu!</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 md:gap-6 mt-2">
              
              {/* Stamp 1: Sleeping Dog (Pre-stamped) */}
              <div className="bg-white/95 border border-[#e6dfd3] rounded-3xl p-4 flex flex-col items-center justify-center text-center relative shadow-sm group/stamp">
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#1a7a72] flex items-center justify-center text-[8px] text-white font-bold">✓</div>
                <div className="w-16 h-16 rounded-full bg-[#fbc0d4] border border-[#351b12]/30 flex items-center justify-center relative overflow-hidden mb-2">
                  <svg viewBox="0 0 100 100" className="w-[85%] h-[85%]">
                    <path d="M 15 45 C 10 45, 6 60, 12 70 C 15 75, 22 75, 24 64" fill="#351b12" stroke="#351b12" strokeWidth="2.5" />
                    <path d="M 85 45 C 90 45, 94 60, 88 70 C 85 75, 78 75, 76 64" fill="#351b12" stroke="#351b12" strokeWidth="2.5" />
                    <path d="M 22 55 Q 15 32, 50 32 Q 85 32, 78 55 C 80 65, 74 80, 50 80 C 26 80, 20 65, 22 55 Z" fill="#ba8155" stroke="#351b12" strokeWidth="3" />
                    <path d="M 32 55 Q 38 60, 42 55" fill="none" stroke="#351b12" strokeWidth="3" />
                    <path d="M 58 55 Q 62 60, 68 55" fill="none" stroke="#351b12" strokeWidth="3" />
                    <ellipse cx="50" cy="64" rx="7" ry="5" fill="#fcfaf5" stroke="#351b12" strokeWidth="2" />
                    <circle cx="50" cy="62" r="2.5" fill="#351b12" />
                    <path d="M 50 65 Q 50 71, 46 71" fill="none" stroke="#351b12" strokeWidth="2" />
                    <path d="M 50 65 Q 50 71, 54 71" fill="none" stroke="#351b12" strokeWidth="2" />
                  </svg>
                </div>
                <span className="text-xs font-serif font-black text-[#351b12]">Audit Setup</span>
                <span className="text-[9px] font-bold text-[#1a7a72] uppercase tracking-wider mt-1">Stamped</span>
              </div>

              {/* Stamp 2: Cute Sleeping Cat (Pre-stamped) */}
              <div className="bg-white/95 border border-[#e6dfd3] rounded-3xl p-4 flex flex-col items-center justify-center text-center relative shadow-sm group/stamp">
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#1a7a72] flex items-center justify-center text-[8px] text-white font-bold">✓</div>
                <div className="w-16 h-16 rounded-full bg-[#feed7a] border border-[#351b12]/30 flex items-center justify-center relative overflow-hidden mb-2">
                  <svg viewBox="0 0 100 100" className="w-[85%] h-[85%]">
                    <path d="M 22 36 L 36 48 L 48 38 L 50 50" stroke="#351b12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="#e59440" />
                    <path d="M 24 45 L 20 20 L 38 35" stroke="#351b12" strokeWidth="3" fill="#e59440" />
                    <path d="M 76 45 L 80 20 L 62 35" stroke="#351b12" strokeWidth="3" fill="#e59440" />
                    <circle cx="50" cy="52" r="26" fill="#fbcb43" stroke="#351b12" strokeWidth="3" />
                    <path d="M 36 50 Q 40 54, 43 50" fill="none" stroke="#351b12" strokeWidth="2.5" />
                    <path d="M 57 50 Q 60 54, 64 50" fill="none" stroke="#351b12" strokeWidth="2.5" />
                    <polygon points="50,56 46,52 54,52" fill="#e59440" stroke="#351b12" strokeWidth="1.5" />
                    <path d="M 50 56 Q 47 62, 44 60" fill="none" stroke="#351b12" strokeWidth="2" />
                    <path d="M 50 56 Q 53 62, 56 60" fill="none" stroke="#351b12" strokeWidth="2" />
                  </svg>
                </div>
                <span className="text-xs font-serif font-black text-[#351b12]">AE Verified</span>
                <span className="text-[9px] font-bold text-[#1a7a72] uppercase tracking-wider mt-1">Stamped</span>
              </div>

              {/* Stamp 3: Pink Sitting Dog with bell (Pre-stamped) */}
              <div className="bg-white/95 border border-[#e6dfd3] rounded-3xl p-4 flex flex-col items-center justify-center text-center relative shadow-sm group/stamp">
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#1a7a72] flex items-center justify-center text-[8px] text-white font-bold">✓</div>
                <div className="w-16 h-16 rounded-full bg-[#fbc0d4] border border-[#351b12]/30 flex items-center justify-center relative overflow-hidden mb-2">
                  <svg viewBox="0 0 100 100" className="w-[85%] h-[85%]">
                    <circle cx="50" cy="45" r="22" fill="#f498af" stroke="#351b12" strokeWidth="3" />
                    <path d="M 38 60 C 35 60, 20 62, 30 84" stroke="#351b12" strokeWidth="3" fill="#f498af" />
                    <path d="M 62 60 C 65 60, 80 62, 70 84" stroke="#351b12" strokeWidth="3" fill="#f498af" />
                    <path d="M 34 32 Q 30 20, 42 24" stroke="#351b12" strokeWidth="3" fill="#351b12" />
                    <path d="M 66 32 Q 70 20, 58 24" stroke="#351b12" strokeWidth="3" fill="#351b12" />
                    <ellipse cx="50" cy="50" rx="6" ry="4" fill="#ffffff" stroke="#351b12" strokeWidth="2" />
                    <path d="M 50 50 Q 50 55, 47 55" fill="none" stroke="#351b12" strokeWidth="2" />
                    <path d="M 50 50 Q 50 55, 53 55" fill="none" stroke="#351b12" strokeWidth="2" />
                    <circle cx="44" cy="41" r="2.5" fill="#351b12" />
                    <circle cx="56" cy="41" r="2.5" fill="#351b12" />
                    <circle cx="50" cy="65" r="4.5" fill="#fbcb43" stroke="#351b12" strokeWidth="2" />
                  </svg>
                </div>
                <span className="text-xs font-serif font-black text-[#351b12]">Pivot Ready</span>
                <span className="text-[9px] font-bold text-[#1a7a72] uppercase tracking-wider mt-1">Stamped</span>
              </div>

              {/* Stamp 4: Interactive Milestone (Click to stamp) */}
              <StampSpot
                id="stamp4"
                title="Payment Sent"
                bgColor="bg-[#feed7a]/25"
                borderColor="border-[#fbc0d4]"
              />

              {/* Stamp 5: Interactive Milestone (Click to stamp) */}
              <StampSpot
                id="stamp5"
                title="Audit Settled"
                bgColor="bg-[#fbc0d4]/25"
                borderColor="border-[#feed7a]"
              />

            </div>
          </div>

          {/* Card Bottom Layout Footer area with typography */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-6 border-t border-[#e6dfd3] pt-6 relative z-10 px-6 md:px-8">
            <div className="flex flex-col text-center sm:text-left gap-1">
              <span className="text-sm font-serif italic text-[#351b12] font-black">Be a loyal friend of audit hub</span>
              <span className="text-[10px] text-[#705850] uppercase tracking-widest font-black font-sans">© 2026 Payroll Hub</span>
            </div>

            <div className="flex flex-col text-center sm:text-right text-[#351b12] select-none scale-95 origin-center sm:origin-right">
              <span className="font-chunky text-2xl tracking-normal leading-none">Loyalty Card</span>
              <span className="font-script text-3xl lowercase leading-tight text-[#ce9fa9]">Compani</span>
            </div>
          </div>
        </div>
      </motion.div>

    </motion.div>
  );
}
