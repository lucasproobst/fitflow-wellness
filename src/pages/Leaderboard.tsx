import { useQuery } from "@tanstack/react-query";
import { ACHIEVEMENTS } from "@/lib/use-achievements";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Award, Crown } from "lucide-react";
import { motion } from "framer-motion";
import { ProBadge } from "@/components/ProBadge";

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  is_pro: boolean;
  count: number;
}

function useLeaderboard() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["leaderboard"],
    enabled: !!user,
    queryFn: async () => {
      const { data: achievements, error } = await supabase
        .from("user_achievements")
        .select("user_id, achievement_key");
      if (error) throw error;

      const countMap = new Map<string, number>();
      for (const a of achievements || []) {
        countMap.set(a.user_id, (countMap.get(a.user_id) || 0) + 1);
      }

      const userIds = Array.from(countMap.keys());
      const { data: profiles } = await supabase
        .from("user_profile")
        .select("user_id, display_name, is_pro")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

      return userIds
        .map(uid => ({
          user_id: uid,
          display_name: profileMap.get(uid)?.display_name || null,
          is_pro: profileMap.get(uid)?.is_pro || false,
          count: countMap.get(uid) || 0,
        }))
        .sort((a, b) => b.count - a.count) as LeaderboardEntry[];
    },
    staleTime: 60_000,
  });
}

const rankConfig = [
  { Icon: Crown, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
  { Icon: Medal, color: "text-zinc-300", bg: "bg-zinc-300/10", border: "border-zinc-300/20" },
  { Icon: Award, color: "text-amber-600", bg: "bg-amber-600/10", border: "border-amber-600/20" },
];

export default function Leaderboard() {
  const { user } = useAuth();
  const { data: entries, isLoading } = useLeaderboard();
  const myRank = entries?.findIndex(e => e.user_id === user?.id) ?? -1;
  const top3 = entries?.slice(0, 3) ?? [];
  const rest = entries?.slice(3) ?? [];

  return (
    <div className="px-4 lg:px-8 py-6 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start justify-between mb-6"
      >
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/30 mb-1">Comunidade</p>
          <h1 className="text-[28px] font-extrabold tracking-tight text-white leading-tight">Ranking</h1>
          <p className="text-xs text-white/40 mt-1">Compare suas conquistas com outros</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20">
          <Trophy size={12} className="text-[#22c55e]" />
          <span className="text-[11px] font-extrabold text-[#22c55e] tabular-nums">
            {myRank >= 0 ? `#${myRank + 1}` : "—"}
          </span>
        </div>
      </motion.div>

      {/* Minha posição */}
      {myRank >= 0 && entries && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl bg-[#141414] border border-[#22c55e]/25 p-4 mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#22c55e] flex items-center justify-center text-white text-sm font-extrabold shrink-0">
              #{myRank + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Você</p>
              <p className="text-[11px] text-white/40 mt-0.5 tabular-nums">
                {entries[myRank].count} de {ACHIEVEMENTS.length} conquistas
              </p>
              <div className="h-1 bg-white/[0.05] rounded-full overflow-hidden mt-2">
                <motion.div
                  className="h-full bg-[#22c55e] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(entries[myRank].count / ACHIEVEMENTS.length) * 100}%` }}
                  transition={{ duration: 0.7 }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Pódio Top 3 */}
      {top3.length >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-[#141414] border border-white/[0.07] p-5 mb-4"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-4 text-center">Pódio</p>
          <div className="flex items-end justify-around gap-2">
            {/* 2nd */}
            <PodiumSlot entry={top3[1]} place={2} height="h-16" me={top3[1].user_id === user?.id} />
            {/* 1st */}
            <PodiumSlot entry={top3[0]} place={1} height="h-24" me={top3[0].user_id === user?.id} />
            {/* 3rd */}
            <PodiumSlot entry={top3[2]} place={3} height="h-12" me={top3[2].user_id === user?.id} />
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="rounded-xl bg-[#141414] border border-white/[0.07] p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/[0.04] animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 bg-white/[0.04] rounded animate-pulse" />
                <div className="h-2 w-20 bg-white/[0.04] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vazio */}
      {!isLoading && (!entries || entries.length === 0) && (
        <div className="rounded-2xl bg-[#141414] border border-white/[0.07] py-12 text-center">
          <Trophy size={36} className="text-white/10 mx-auto mb-3" />
          <p className="text-white/40 text-sm font-bold">Nenhum usuário no ranking</p>
          <p className="text-white/25 text-xs mt-1">Desbloqueie conquistas para aparecer aqui</p>
        </div>
      )}

      {/* Lista */}
      {rest.length > 0 && (
        <>
          {top3.length >= 3 && (
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 mb-3 mt-2">Demais posições</p>
          )}
          <div className="space-y-2">
            {(top3.length >= 3 ? rest : entries ?? []).map((entry, idx) => {
              const rank = (top3.length >= 3 ? 3 : 0) + idx + 1;
              const isMe = entry.user_id === user?.id;
              const pct = (entry.count / ACHIEVEMENTS.length) * 100;
              const name = entry.display_name || `Atleta ${entry.user_id.slice(0, 6)}`;

              return (
                <motion.div
                  key={entry.user_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + idx * 0.03 }}
                  className={`rounded-xl border p-3 flex items-center gap-3 transition-all ${
                    isMe
                      ? "bg-[#22c55e]/[0.06] border-[#22c55e]/20"
                      : "bg-[#141414] border-white/[0.07]"
                  }`}
                >
                  <div className="w-8 text-center text-xs font-extrabold text-white/40 tabular-nums shrink-0">
                    {rank}
                  </div>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 ${
                      isMe ? "bg-[#22c55e] text-white" : "bg-white/[0.05] text-white/50"
                    }`}
                  >
                    {(entry.display_name || "A").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-white truncate">
                        {isMe ? "Você" : name}
                      </p>
                      {isMe && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#22c55e]/20 text-[#22c55e] font-extrabold uppercase tracking-wider">
                          Eu
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="h-1 flex-1 bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#22c55e]/70 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-white/30 tabular-nums shrink-0 font-bold">
                        {entry.count}/{ACHIEVEMENTS.length}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function PodiumSlot({
  entry,
  place,
  height,
  me,
}: {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
  height: string;
  me: boolean;
}) {
  const cfg = rankConfig[place - 1];
  const Icon = cfg.Icon;
  const initials = (entry.display_name || "A").slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <div className={`w-10 h-10 rounded-full ${cfg.bg} border ${cfg.border} flex items-center justify-center`}>
        <Icon size={18} className={cfg.color} />
      </div>
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-extrabold ${
          me ? "bg-[#22c55e] text-white" : "bg-white/[0.06] text-white/70"
        }`}
      >
        {initials}
      </div>
      <p className="text-[11px] font-bold text-white truncate w-full text-center">
        {me ? "Você" : (entry.display_name || `Atleta`)}
      </p>
      <p className={`text-[10px] font-extrabold tabular-nums ${cfg.color}`}>
        {entry.count} 🏅
      </p>
      <div className={`w-full ${height} rounded-t-lg ${cfg.bg} border-t border-x ${cfg.border} flex items-start justify-center pt-1`}>
        <span className={`text-[10px] font-extrabold ${cfg.color}`}>#{place}</span>
      </div>
    </div>
  );
}
