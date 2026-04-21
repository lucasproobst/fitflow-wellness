import { useState, useRef, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Camera, Trash2, ArrowLeftRight, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

type PhotoType = "before" | "after";

interface PhotoRow {
  id: string;
  storage_path: string;
  type: PhotoType;
  taken_on: string;
  created_at: string;
}

interface PhotoWithUrl extends PhotoRow {
  url: string | null;
}

function usePhotos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["progress-photos-history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("progress_photos" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("taken_on", { ascending: false });
      if (error) throw error;
      const rows = (data || []) as unknown as PhotoRow[];
      // Sign all URLs
      const withUrls: PhotoWithUrl[] = await Promise.all(
        rows.map(async (r) => {
          const { data: signed } = await supabase.storage
            .from("progress-photos")
            .createSignedUrl(r.storage_path, 3600);
          return { ...r, url: signed?.signedUrl ?? null };
        })
      );
      return withUrls;
    },
  });
}

function useUpload() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, type, takenOn }: { file: File; type: PhotoType; takenOn: string }) => {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${user!.id}/${type}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("progress-photos")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase
        .from("progress_photos" as any)
        .insert({ user_id: user!.id, storage_path: path, type, taken_on: takenOn } as any);
      if (insErr) throw insErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress-photos-history"] });
      toast.success("Foto adicionada!");
    },
    onError: (e: any) => toast.error(e.message || "Falha no upload"),
  });
}

function useDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (photo: PhotoWithUrl) => {
      await supabase.storage.from("progress-photos").remove([photo.storage_path]);
      await supabase.from("progress_photos" as any).delete().eq("id", photo.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["progress-photos-history"] });
      toast.success("Foto removida");
    },
  });
}

const fmtDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });

export function ProgressPhotosTimeline() {
  const { data: photos = [], isLoading } = usePhotos();
  const upload = useUpload();
  const del = useDelete();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState<PhotoType>("before");
  const [pendingDate, setPendingDate] = useState(() => new Date().toISOString().split("T")[0]);

  const fileRef = useRef<HTMLInputElement>(null);

  const [compareOpen, setCompareOpen] = useState(false);
  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);

  // Auto-default selection: oldest "before" + newest "after"
  useEffect(() => {
    if (photos.length === 0) return;
    if (!leftId) {
      const before = [...photos].reverse().find((p) => p.type === "before");
      setLeftId((before || photos[photos.length - 1]).id);
    }
    if (!rightId) {
      const after = photos.find((p) => p.type === "after");
      setRightId((after || photos[0]).id);
    }
  }, [photos, leftId, rightId]);

  const grouped = useMemo(() => {
    const map = new Map<string, PhotoWithUrl[]>();
    photos.forEach((p) => {
      const arr = map.get(p.taken_on) || [];
      arr.push(p);
      map.set(p.taken_on, arr);
    });
    return Array.from(map.entries()); // already date-desc from query
  }, [photos]);

  const left = photos.find((p) => p.id === leftId) || null;
  const right = photos.find((p) => p.id === rightId) || null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Selecione uma imagem");
    if (f.size > 5 * 1024 * 1024) return toast.error("Máximo 5MB");
    setPendingFile(f);
    setPendingPreview(URL.createObjectURL(f));
    setUploadOpen(true);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submitUpload = () => {
    if (!pendingFile) return;
    upload.mutate(
      { file: pendingFile, type: pendingType, takenOn: pendingDate },
      {
        onSuccess: () => {
          setUploadOpen(false);
          setPendingFile(null);
          setPendingPreview(null);
        },
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="rounded-2xl bg-[#141414] border border-white/[0.07] p-4 mb-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/30">Antes & Depois</h2>
        <div className="flex gap-2">
          {photos.length >= 2 && (
            <button
              onClick={() => setCompareOpen(true)}
              className="h-8 px-3 rounded-full bg-white/[0.04] border border-white/[0.08] text-white/70 text-[11px] font-bold flex items-center gap-1.5 active:scale-95 transition-all hover:bg-white/[0.08]"
            >
              <ArrowLeftRight size={12} />
              Comparar
            </button>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="h-8 px-3 rounded-full bg-[#22c55e] text-white text-[11px] font-bold flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Upload size={12} />
            Nova foto
          </button>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

      {photos.length === 0 ? (
        <div
          onClick={() => fileRef.current?.click()}
          className="aspect-[3/2] rounded-xl bg-white/[0.02] border border-dashed border-white/[0.08] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-[#22c55e]/30 transition-colors"
        >
          <Camera size={22} className="text-white/15" />
          <span className="text-xs text-white/30">Adicione sua primeira foto</span>
          <span className="text-[10px] text-white/15">JPG/PNG, até 5MB</span>
        </div>
      ) : (
        <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1 no-scrollbar">
          {grouped.map(([date, dayPhotos]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">{fmtDate(date)}</span>
                <div className="flex-1 h-px bg-white/[0.05]" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {dayPhotos.map((p) => (
                  <div key={p.id} className="relative group">
                    {p.url ? (
                      <div className="aspect-[3/4] rounded-lg overflow-hidden bg-white/[0.03]">
                        <img src={p.url} alt={p.type} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="aspect-[3/4] rounded-lg bg-white/[0.03] animate-pulse" />
                    )}
                    <span
                      className={`absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[8px] uppercase tracking-wider font-bold ${
                        p.type === "before"
                          ? "bg-black/70 text-white/80"
                          : "bg-[#22c55e]/90 text-white"
                      }`}
                    >
                      {p.type === "before" ? "Antes" : "Depois"}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm("Remover esta foto?")) del.mutate(p);
                      }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 backdrop-blur flex items-center justify-center opacity-0 group-hover:opacity-100 active:opacity-100 transition-opacity"
                    >
                      <Trash2 size={11} className="text-white/80" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {isLoading && <p className="text-[11px] text-white/30 text-center">Carregando…</p>}
        </div>
      )}

      {/* Upload confirm sheet */}
      <AnimatePresence>
        {uploadOpen && pendingPreview && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUploadOpen(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="fixed left-1/2 -translate-x-1/2 bottom-0 w-full max-w-[480px] bg-[#141414] border-t border-white/[0.08] rounded-t-3xl p-5 z-50 modal-safe-bottom"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white">Confirmar foto</h3>
                <button
                  onClick={() => setUploadOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center"
                >
                  <X size={14} className="text-white/60" />
                </button>
              </div>
              <div className="aspect-[3/4] max-h-[260px] mx-auto rounded-xl overflow-hidden bg-black mb-4">
                <img src={pendingPreview} alt="Preview" className="w-full h-full object-contain" />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(["before", "after"] as PhotoType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setPendingType(t)}
                    className={`h-10 rounded-xl text-xs font-bold transition-all ${
                      pendingType === t
                        ? "bg-[#22c55e] text-white"
                        : "bg-white/[0.04] border border-white/[0.08] text-white/60"
                    }`}
                  >
                    {t === "before" ? "Antes" : "Depois"}
                  </button>
                ))}
              </div>
              <div className="mb-4">
                <label className="text-[10px] uppercase tracking-wider text-white/30 block mb-1.5">Data</label>
                <input
                  type="date"
                  value={pendingDate}
                  max={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setPendingDate(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#22c55e]/40"
                />
              </div>
              <button
                onClick={submitUpload}
                disabled={upload.isPending}
                className="w-full h-12 rounded-xl bg-[#22c55e] text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Check size={16} />
                {upload.isPending ? "Enviando…" : "Salvar foto"}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Compare modal */}
      <AnimatePresence>
        {compareOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCompareOpen(false)}
              className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-safe-bottom pointer-events-none"
            >
              <div className="w-full max-w-[480px] lg:max-w-[720px] bg-[#141414] border border-white/[0.08] rounded-2xl p-4 pointer-events-auto max-h-[92vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white">Comparar evolução</h3>
                  <button
                    onClick={() => setCompareOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center"
                  >
                    <X size={14} className="text-white/60" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { label: "Antes", photo: left },
                    { label: "Depois", photo: right },
                  ].map((side) => (
                    <div key={side.label}>
                      <p className="text-[10px] uppercase tracking-wider text-white/40 font-bold mb-1.5">{side.label}</p>
                      <div className="aspect-[3/4] rounded-xl overflow-hidden bg-black">
                        {side.photo?.url ? (
                          <img src={side.photo.url} alt={side.label} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20 text-xs">
                            Selecione abaixo
                          </div>
                        )}
                      </div>
                      {side.photo && (
                        <p className="text-[11px] text-white/50 mt-1.5 text-center tabular-nums">
                          {fmtDate(side.photo.taken_on)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] uppercase tracking-wider text-white/30 font-bold mb-2">Selecione as fotos</p>
                <div className="space-y-3">
                  {(["left", "right"] as const).map((side) => (
                    <div key={side}>
                      <p className="text-[11px] text-white/50 mb-1.5">{side === "left" ? "Antes" : "Depois"}</p>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {photos.map((p) => {
                          const selected = (side === "left" ? leftId : rightId) === p.id;
                          return (
                            <button
                              key={p.id}
                              onClick={() => (side === "left" ? setLeftId(p.id) : setRightId(p.id))}
                              className={`shrink-0 w-14 aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all ${
                                selected ? "border-[#22c55e] scale-105" : "border-transparent opacity-60"
                              }`}
                            >
                              {p.url ? (
                                <img src={p.url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-white/[0.04]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
