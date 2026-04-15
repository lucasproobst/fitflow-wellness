import { useAuth } from "@/lib/auth-context";
import { useProfile } from "@/lib/use-profile";
import { GlassCard } from "@/components/GlassCard";
import { LogOut, User, Mail, Target, Activity } from "lucide-react";

export default function Profile() {
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();

  const stats = [
    { label: "Goal", value: profile?.goal?.replace("_", " ") || "—" },
    { label: "Height", value: profile?.height_cm ? `${profile.height_cm} cm` : "—" },
    { label: "Weight", value: profile?.weight_kg ? `${profile.weight_kg} kg` : "—" },
    { label: "Target", value: profile?.target_weight_kg ? `${profile.target_weight_kg} kg` : "—" },
    { label: "Activity", value: profile?.activity_level?.replace("_", " ") || "—" },
    { label: "Age", value: profile?.age?.toString() || "—" },
  ];

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-6">Profile</h1>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-fitflow-primary to-fitflow-accent flex items-center justify-center text-white text-xl font-semibold shrink-0">
          {user?.email?.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-foreground truncate">{user?.email}</p>
          <p className="text-sm text-foreground/40">Member</p>
        </div>
      </div>

      <GlassCard className="mb-4">
        <h2 className="label-style text-[10px] mb-4">YOUR STATS</h2>
        <div className="grid grid-cols-2 gap-4">
          {stats.map(s => (
            <div key={s.label}>
              <p className="text-[10px] text-foreground/40 uppercase">{s.label}</p>
              <p className="text-sm font-semibold text-foreground capitalize">{s.value}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {profile?.food_restrictions && (profile.food_restrictions as string[]).length > 0 && (
        <GlassCard className="mb-4">
          <h2 className="label-style text-[10px] mb-3">FOOD RESTRICTIONS</h2>
          <div className="flex flex-wrap gap-2">
            {(profile.food_restrictions as string[]).map(r => (
              <span key={r} className="px-3 py-1 rounded-full bg-fitflow-primary/10 text-fitflow-primary text-xs font-medium">
                {r}
              </span>
            ))}
          </div>
        </GlassCard>
      )}

      <button
        onClick={signOut}
        className="w-full h-12 rounded-xl border border-destructive/30 text-destructive text-sm font-medium flex items-center justify-center gap-2 hover:bg-destructive/5 active:scale-95 transition-all"
      >
        <LogOut size={16} />
        Sign Out
      </button>
    </div>
  );
}
