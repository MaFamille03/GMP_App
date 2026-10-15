import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Le code d’accès est obligatoire." }, { status: 400 });
  }

  const expectedCode = process.env.GMP_REGISTRATION_CODE;
  if (!expectedCode) {
    return NextResponse.json(
      { error: "La création de compte est temporairement indisponible. L’administrateur doit configurer le code d’accès GMP sur le serveur." },
      { status: 503 }
    );
  }

  const suppliedCode = typeof body.code === "string" ? body.code.trim() : "";
  if (!suppliedCode || suppliedCode !== expectedCode) {
    return NextResponse.json(
      { error: "Code d’accès incorrect. Vérifie le code fourni par l’administrateur GMP." },
      { status: 403 }
    );
  }

  return NextResponse.json({ valid: true }, { status: 200 });
}
