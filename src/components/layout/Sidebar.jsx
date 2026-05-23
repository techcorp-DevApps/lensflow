import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Camera, LayoutDashboard, CalendarDays, FileText, 
  Image, CheckSquare, Bell, ChevronLeft, ChevronRight,
  LogOut
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const navItems = [
  { path: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/admin/bookings", icon: CalendarDays, label: "Bookings" },
  { path: "/admin/contracts", icon: FileText, label: "Contracts" },
  { path: "/admin/galleries", icon: Image, label: "Galleries" },
  { path: "/admin/checklists", icon: CheckSquare, label: "Checklists" },
  { path: "/admin/reminders", icon: Bell, label: "Reminders" },
];

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground z-40 flex flex-col transition-all duration-300
      ${collapsed ? "lg:w-[72px]" : "lg:w-[260px]"}
      ${mobileOpen ? "translate-x-0 w-[260px]" : "-translate-x-full lg:translate-x-0"}
    `}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-[72px] border-b border-sidebar-border">
        <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <Camera className="w-5 h-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="font-heading text-lg font-semibold tracking-tight text-sidebar-foreground flex-1">
            LensFlow
          </span>
        )}
        {onMobileClose && (
          <button onClick={onMobileClose} className="lg:hidden text-sidebar-foreground/50 hover:text-sidebar-foreground ml-auto">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onMobileClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group
                ${isActive 
                  ? "bg-sidebar-accent text-sidebar-primary" 
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${isActive ? "text-sidebar-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"}`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-1">
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all w-full"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/30 hover:text-sidebar-foreground/60 transition-all w-full"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
