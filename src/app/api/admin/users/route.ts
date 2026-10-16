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


export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
  const { data: actor } = await supabase.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (!actor?.is_active || actor.role !== "admin") return NextResponse.json({ error: "Seul un administrateur actif peut gérer les accès." }, { status: 403 });

  let body: { userId?: unknown; role?: unknown; isActive?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 }); }
  const userId = typeof body.userId === "string" ? body.userId : "";
  const role = body.role;
  const isActive = body.isActive;
  if (!userId) return NextResponse.json({ error: "Utilisateur non précisé." }, { status: 400 });
  if (userId === user.id && (role !== "admin" || isActive !== true)) return NextResponse.json({ error: "Tu ne peux pas modifier ou désactiver ton propre compte administrateur." }, { status: 400 });
  if (role !== "service_manager" && role !== "biomedical_manager" && role !== "admin") return NextResponse.json({ error: "Niveau d’accès invalide." }, { status: 400 });
  if (typeof isActive !== "boolean") return NextResponse.json({ error: "L’état du compte est invalide." }, { status: 400 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !supabaseUrl) return NextResponse.json({ error: "Configuration serveur incomplète : SUPABASE_SERVICE_ROLE_KEY est nécessaire côté serveur." }, { status: 503 });
  const adminClient = createSupabaseClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: target, error: targetError } = await adminClient.from("profiles").select("id,role,display_name").eq("id", userId).maybeSingle();
  if (targetError || !target) return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
  if (target.role === "admin" && userId !== user.id && role !== "admin") return NextResponse.json({ error: "Le rôle d’un autre administrateur est protégé." }, { status: 400 });
  const { error: updateError } = await adminClient.from("profiles").update({ role, is_active: isActive, updated_at: new Date().toISOString() }).eq("id", userId);
  if (updateError) return NextResponse.json({ error: `Mise à jour impossible : ${updateError.message}` }, { status: 400 });
  return NextResponse.json({ ok: true, message: "Autorisations mises à jour." });
}
