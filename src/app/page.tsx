import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Point d'entrée : envoie les utilisateurs vers leur espace ou la connexion. */
export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  redirect(user ? "/dashboard" : "/login");
}
