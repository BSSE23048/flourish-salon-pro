import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const role = request.cookies.get("flourish-role")?.value;
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && role !== "owner") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/staff") && role !== "staff" && role !== "owner") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*"],
};
