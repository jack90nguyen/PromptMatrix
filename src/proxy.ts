import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";

export default async function proxy(request: NextRequest) {
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (!session && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (session && isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // `/api` is deliberately outside this guard: those routes authenticate with
  // an API key, not the session cookie. Anything added under /api therefore has
  // NO session protection and must check its own credentials.
  //
  // The icons are exempt too: they are requested by the browser on the login
  // page itself, where there is no session yet, and guarding them just answers
  // a redirect where an image was expected.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png).*)"],
};
