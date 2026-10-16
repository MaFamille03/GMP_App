"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown, CircleUserRound, Settings, Users } from "lucide-react";
import { SignOutButton } from "@/components/sign-out-button";

export function AccountMenu({
  displayName,
  email,
  isAdmin,
}: {
  displayName: string;
  email: string;
  isAdmin: boolean;
}) {
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        menuRef.current.open = false;
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && menuRef.current) {
        menuRef.current.open = false;
      }
    }
    document.addEventListener("click", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <details ref={menuRef} className="gmp-account-menu">
      <summary aria-label="Ouvrir les paramètres du compte">
        <span className="gmp-account-avatar"><CircleUserRound size={18} /></span>
        <span className="gmp-account-summary-copy">
          <strong>{displayName}</strong>
          <small>{isAdmin ? "Administrateur" : "Observateur"}</small>
        </span>
        <ChevronDown size={15} className="gmp-account-chevron" />
      </summary>
      <div className="gmp-account-popover">
        <div className="gmp-account-identity">
          <strong>{displayName}</strong>
          <span>{email}</span>
          <small className={isAdmin ? "is-admin" : ""}>{isAdmin ? "Administrateur" : "Observateur · Lecture seule"}</small>
        </div>
        <Link href="/account"><CircleUserRound size={16} /> Mon compte</Link>
        <Link href="/settings"><Settings size={16} /> Paramètres du site</Link>
        {isAdmin && <Link href="/users"><Users size={16} /> Gestion des utilisateurs</Link>}
        <div className="gmp-account-logout"><SignOutButton /></div>
      </div>
    </details>
  );
}
