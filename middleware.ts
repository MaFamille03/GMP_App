import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = request.nextUrl.pathname;
  const publicPaths = ["/", "/login", "/register", "/auth/callback", "/access-disabled"];
  const isPublic = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  // Keep public landing/auth routes reachable when the Supabase project is not configured yet.
  if (!url || !key) return response;

  type CookieToSet = {
    name: string;
    value: string;
    options?: Parameters<typeof response.cookies.set>[2];
  };

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          if (options) response.cookies.set(name, value, options);
          else response.cookies.set(name, value);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    if (!isPublic) {
      const destination = request.nextUrl.clone();
      destination.pathname = "/login";
      destination.search = "";
      destination.searchParams.set("next", pathname);
      return NextResponse.redirect(destination);
    }
    return response;
  }

  if (pathname === "/login" || pathname === "/register") {
    const destination = request.nextUrl.clone();
    destination.pathname = "/dashboard";
    destination.search = "";
    return NextResponse.redirect(destination);
  }

  if (!isPublic) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile || !profile.is_active) {
      const destination = request.nextUrl.clone();
      destination.pathname = "/access-disabled";
      destination.search = "";
      return NextResponse.redirect(destination);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
