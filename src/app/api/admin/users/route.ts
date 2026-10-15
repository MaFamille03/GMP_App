import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (!profile?.is_active || profile.role !== "admin") {
    return NextResponse.json({ error: "Seul l'administrateur GMP peut inviter un utilisateur." }, { status: 403 });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) {
    return NextResponse.json({ error: "Configuration serveur incomplète : ajoute SUPABASE_SERVICE_ROLE_KEY côté serveur dans l'environnement Vercel et .env.local. Cette clé ne doit jamais être publique." }, { status: 503 });
  }

  let body: { email?: unknown; fullName?: unknown; jobTitle?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 }); }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const fullName = typeof body.fullName === "string" ? body.fullName.trim() : "";
  const jobTitle = typeof body.jobTitle === "string" ? body.jobTitle.trim() : "";
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Adresse e-mail invalide." }, { status: 400 });
  if (!fullName || fullName.length > 120 || !jobTitle || jobTitle.length > 120) return NextResponse.json({ error: "Le nom et la fonction sont obligatoires (120 caractères maximum)." }, { status: 400 });

  const adminClient = createSupabaseClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const origin = new URL(request.url).origin;
  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, job_title: jobTitle },
    redirectTo: `${origin}/auth/callback`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, userId: data.user?.id, message: "Invitation envoyée. Le compte aura des droits d'observateur par défaut." }, { status: 201 });
}
