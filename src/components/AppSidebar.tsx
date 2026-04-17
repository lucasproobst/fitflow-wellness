import { Home, Utensils, Dumbbell, BarChart3, Trophy, Award, Camera, User, Plus, Salad } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/use-profile";
import { ProBadge } from "@/components/ProBadge";

const mainItems = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/diet", icon: Utensils, label: "Dieta" },
  { to: "/workout", icon: Dumbbell, label: "Treino" },
  { to: "/progress", icon: BarChart3, label: "Stats" },
];

const moreItems = [
  { to: "/scanner", icon: Camera, label: "Scanner" },
  { to: "/achievements", icon: Award, label: "Conquistas" },
  { to: "/leaderboard", icon: Trophy, label: "Ranking" },
];

export function AppSidebar({ onNewClick }: { onNewClick: () => void }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useProfile();

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const initials = (profile?.display_name || user?.email || "?")
    .replace(/[^a-zA-ZÀ-ÿ0-9]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <Sidebar collapsible="icon" className="border-r border-white/[0.06] bg-[#0a0a0a]">
      <SidebarHeader className="border-b border-white/[0.06] bg-[#0a0a0a]">
        <div className={`flex items-center gap-2 px-2 py-2 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 rounded-lg bg-[#22c55e] flex items-center justify-center shrink-0">
            <span className="text-white font-extrabold text-sm">F</span>
          </div>
          {!collapsed && (
            <span className="text-white font-extrabold text-[15px] tracking-tight">FitFlow</span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-[#0a0a0a]">
        {/* Quick Action */}
        <div className={`px-2 pt-3 ${collapsed ? "flex justify-center" : ""}`}>
          <button
            onClick={onNewClick}
            className={`${
              collapsed ? "w-9 h-9" : "w-full h-9"
            } rounded-lg bg-[#22c55e] text-white flex items-center justify-center gap-1.5 text-[13px] font-bold active:scale-95 transition-transform`}
            style={{ boxShadow: "0 4px 14px rgba(34,197,94,0.35)" }}
            aria-label="Ações rápidas"
          >
            <Plus size={16} strokeWidth={2.5} />
            {!collapsed && "Nova ação"}
          </button>
        </div>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 px-3">
              Principal
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <NavLink
                      to={item.to}
                      end={item.to === "/"}
                      className={`flex items-center gap-3 rounded-lg transition-colors ${
                        isActive(item.to)
                          ? "bg-[#22c55e]/15 text-[#22c55e] hover:bg-[#22c55e]/20"
                          : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      <item.icon size={18} className="shrink-0" />
                      {!collapsed && <span className="text-[13px] font-semibold">{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {!collapsed && (
            <SidebarGroupLabel className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 px-3">
              Mais
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {moreItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <NavLink
                      to={item.to}
                      className={`flex items-center gap-3 rounded-lg transition-colors ${
                        isActive(item.to)
                          ? "bg-[#22c55e]/15 text-[#22c55e] hover:bg-[#22c55e]/20"
                          : "text-white/60 hover:bg-white/[0.04] hover:text-white"
                      }`}
                    >
                      <item.icon size={18} className="shrink-0" />
                      {!collapsed && <span className="text-[13px] font-semibold">{item.label}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/[0.06] bg-[#0a0a0a] p-2">
        <button
          onClick={() => navigate("/profile")}
          className={`w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.04] transition-colors ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#141414] border border-white/[0.08] flex items-center justify-center text-[11px] font-bold text-white shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              initials
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0 text-left">
              <p className="text-[12px] font-bold text-white truncate flex items-center gap-1">
                <span className="truncate">{profile?.display_name || user?.email?.split("@")[0] || "Atleta"}</span>
                {profile?.is_pro && <ProBadge size={10} />}
              </p>
              <p className="text-[10px] text-white/40 truncate">{profile?.is_pro ? "FitFlow Pro" : "Ver perfil"}</p>
            </div>
          )}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
