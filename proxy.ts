import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Rafraîchit la session Supabase et applique la politique d'accès :
 * sans session, tout redirige vers /login (401 pour l'API).
 *
 * Le client doit être créé ici même : c'est le seul endroit où l'on peut
 * réécrire les cookies de session rafraîchis dans la réponse.
 */
export async function proxy(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) req.cookies.set(name, value);
          res = NextResponse.next({ request: req });
          for (const { name, value, options } of cookiesToSet) {
            res.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() et non getSession() : seul getUser() revalide le jeton auprès
  // de Supabase. getSession() fait confiance au cookie, falsifiable.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api/auth/")) return res;

  if (pathname === "/login") {
    return user ? NextResponse.redirect(new URL("/", req.url)) : res;
  }

  if (user) return res;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  // Les fichiers PWA restent accessibles sans session, sinon l'appli n'est
  // pas installable depuis l'écran /login.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|hors-ligne|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)",
  ],
};
