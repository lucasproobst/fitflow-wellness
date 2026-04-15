import { useQuery } from "@tanstack/react-query";
import { GlassCard } from "@/components/GlassCard";
import { ACHIEVEMENTS } from "@/lib/use-achievements";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Award, Crown } from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  count: number;
}

function useLeaderboard() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["leaderboard"],
    enabled: !!user,
    queryFn: async () => {
      // Get all achievements
      const { data: achievements, error: achError } = await supabase
        .from("user_achievements")
        .select("user_id, achievement_key");
      if (achError) throw achError;

      // Group by user_id
      const countMap = new Map<string, number>();
      for (const a of achievements || []) {
        countMap.set(a.user_id, (countMap.get(a.user_id) || 0) + 1);
      }

      // Get all profiles for display names
      const userIds = Array.from(countMap.keys());
      const { data: profiles } = await supabase
        .from("user_profile")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p.display_name])
      );

      // Build sorted leaderboard
      const entries: LeaderboardEntry[] = userIds
        .map(uid => ({
          user_id: uid,
          display_name: profileMap.get(uid) || null,
          count: countMap.get(uid) || 0,
        }))
        .sort((a, b) => b.count - a.count);

      return entries;
    },
    staleTime: 60_000,
  });
}

const rankIcons = [
  <Crown size={20} className="text-yellow-400" />,
  <Medal size={20} className="text-gray-300" />,
  <Award size={20} className="text-amber-600" />,
];

export default function Leaderboard() {
  const { user } = useAuth();
  const { data: entries, isLoading } = useLeaderboard();

  const myRank = entries?.findIndex(e => e.user_id === user?.id) ?? -1;

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Ranking</h1>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-fitflow-primary/10">
          <Trophy size={14} className="text-fitflow-primary" />
          <span className="text-xs font-bold text-fitflow-primary">
            {myRank >= 0 ? `#${myRank + 1}` : "—"}
          </span>
        </div>
      </div>
      <p className="text-sm text-foreground/50 mb-6">Compare suas conquistas com outros usuários</p>

      {/* Minha posição */}
      {myRank >= 0 && entries && (
        <GlassCard className="mb-6 border-fitflow-primary/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-fitflow-primary to-fitflow-accent flex items-center justify-center text-white text-sm font-bold shrink-0">
              #{myRank + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Você</p>
              <p className="text-xs text-foreground/40">
                {entries[myRank].count} conquista{entries[myRank].count !== 1 ? "s" : ""} de {ACHIEVEMENTS.length}
              </p>
            </div>
            <div className="h-2 w-24 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-fitflow-primary to-fitflow-accent transition-all duration-700"
                style={{ width: `${(entries[myRank].count / ACHIEVEMENTS.length) * 100}%` }}
              />
            </div>
          </div>
        </GlassCard>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="glass-card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-white/5 rounded animate-pulse" />
                <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vazio */}
      {!isLoading && (!entries || entries.length === 0) && (
        <GlassCard className="py-12 text-center">
          <Trophy size={40} className="text-foreground/10 mx-auto mb-4" />
          <p className="text-foreground/40 text-sm">Nenhum usuário no ranking ainda</p>
          <p className="text-foreground/30 text-xs mt-1">Desbloqueie conquistas para aparecer aqui!</p>
        </GlassCard>
      )}

      {/* Lista */}
      {entries && entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry, idx) => {
            const isMe = entry.user_id === user?.id;
            const pct = (entry.count / ACHIEVEMENTS.length) * 100;
            const name = entry.display_name || `Usuário ${entry.user_id.slice(0, 6)}`;

            return (
              <GlassCard
                key={entry.user_id}
                className={`py-3 transition-all ${isMe ? "border-fitflow-primary/20 bg-fitflow-primary/5" : ""}`}
              >
                <div className="flex items-center gap-3">
                  {/* Posição */}
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0">
                    {idx < 3 ? (
                      rankIcons[idx]
                    ) : (
                      <span className="text-sm font-bold text-foreground/30">{idx + 1}</span>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isMe
                      ? "bg-gradient-to-br from-fitflow-primary to-fitflow-accent text-white"
                      : "bg-white/5 text-foreground/40"
                  }`}>
                    {(entry.display_name || "U").slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {isMe ? "Você" : name}
                      </p>
                      {isMe && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-fitflow-primary/20 text-fitflow-primary font-medium">
                          Você
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1.5 flex-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            idx === 0 ? "bg-yellow-400" : idx === 1 ? "bg-gray-300" : idx === 2 ? "bg-amber-600" : "bg-foreground/15"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-foreground/30 shrink-0">
                        {entry.count}/{ACHIEVEMENTS.length}
                      </span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
