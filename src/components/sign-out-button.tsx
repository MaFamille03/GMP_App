"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <button className={compact ? "gmp-signout-compact" : "secondary-button"} onClick={signOut} disabled={busy} type="button" aria-label="Se déconnecter" title="Se déconnecter">
      <LogOut size={16} /> {!compact && (busy ? "Déconnexion..." : "Se déconnecter")}
    </button>
  );
}
