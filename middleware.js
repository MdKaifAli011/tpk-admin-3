import { NextResponse } from "next/server";

/**
 * Sets x-pathname so the root layout can know the request path
 * and only inject site custom code on public (non-admin) pages.
 */
export function middleware(request) {
  const pathname = request.nextUrl.pathname || "";
  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all pathnames except _next/static, _next/image, favicon, etc.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
