import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  goal: string | null;
  food_restrictions: string[];
  height_cm: number | null;
  weight_kg: number | null;
  age: number | null;
  activity_level: string | null;
  target_weight_kg: number | null;
  onboarding_complete: boolean;
  avatar_url: string | null;
  is_pro: boolean;
  pro_expires_at: string | null;
  preferred_workout_days: number[] | null;
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_profile")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as UserProfile | null;
    },
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      const { error } = await supabase
        .from("user_profile")
        .upsert({ ...(updates as any), user_id: user!.id }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useUploadAvatar() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Não autenticado");
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: dbErr } = await supabase
        .from("user_profile")
        .upsert({ user_id: user.id, avatar_url: url } as any, { onConflict: "user_id" });
      if (dbErr) throw dbErr;
      return url;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}
