import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "./lib/auth";

// List of protected routes that require authentication
const protectedRoutes = ["/tutor", "/student", "/messages", "/notifications"];

export function middleware(req: NextRequest) {
    const token = req.cookies.get("token")?.value;

    // Check if the request is for a protected route
    if (protectedRoutes.some(route => req.nextUrl.pathname.startsWith(route))) {
        if (!token || !verifyToken(token)) {
            return NextResponse.redirect(new URL("/auth/login", req.url));
        }
    }

    // Logging middleware (optional)
    console.log(`📢 Request: ${req.method} ${req.nextUrl.pathname}`);

    return NextResponse.next();
}

// Apply middleware to all routes
export const config = {
    matcher: "/:path*",
};
