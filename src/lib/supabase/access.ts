import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AccessProfile = {
  id: string;
  display_name: string | null;
  job_title: string | null;
  role: string;
  is_active: boolean;
};

/** Loads the authenticated user and profile, enforcing active-account state. */
export async function getCurrentAccess() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,display_name,job_title,role,is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) redirect("/access-disabled?reason=profile");
  if (!profile.is_active) redirect("/access-disabled");

  return { supabase, user, profile: profile as AccessProfile, isAdmin: profile.role === "admin" };
}

/** Server-side guard for pages that expose mutation controls. */
export async function requireAdmin() {
  const access = await getCurrentAccess();
  if (access.profile.role !== "admin" && access.profile.role !== "biomedical_manager") redirect("/dashboard?access=read-only");
  return access;
}

/** Strict guard for account administration and security settings. */
export async function requireAdministrator() {
  const access = await getCurrentAccess();
  if (!access.isAdmin) redirect("/dashboard?access=read-only");
  return access;
}
