import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    if (!token) {
      if (path.startsWith("/home") || path.startsWith("/onboarding")) {
        return NextResponse.redirect(new URL("/auth", req.url));
      }
      return NextResponse.next();
    }

    const step = token.onboardingStep;

    // Handle completed onboarding
    if (step === "COMPLETED") {
      const role = token.role as string;
      
      // Writers should never access /feedback
      if (role === "WRITER" && path.startsWith("/feedback")) {
        return NextResponse.redirect(new URL("/home", req.url));
      }
      
      // Readers should never access /write or /stats
      if (role === "READER" && (path.startsWith("/write") || path.startsWith("/stats"))) {
        return NextResponse.redirect(new URL("/home", req.url));
      }

      if (path.startsWith("/onboarding")) {
        return NextResponse.redirect(new URL("/home", req.url));
      }
      if (path === "/auth") {
        return NextResponse.redirect(new URL("/home", req.url));
      }
      return NextResponse.next();
    }

    // Handle incomplete onboarding
    if (step === "ROLE_SELECTION" && path !== "/onboarding/role") {
      return NextResponse.redirect(new URL("/onboarding/role", req.url));
    }

    if (step === "PROFILE_SETUP" && path !== "/onboarding/profile") {
      return NextResponse.redirect(new URL("/onboarding/profile", req.url));
    }

    if (path === "/auth" && step !== "COMPLETED") {
        if (step === "ROLE_SELECTION") {
            return NextResponse.redirect(new URL("/onboarding/role", req.url));
        } else if (step === "PROFILE_SETUP") {
            return NextResponse.redirect(new URL("/onboarding/profile", req.url));
        }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/home/:path*", "/onboarding/:path*", "/write/:path*", "/stats/:path*", 
    "/read/:path*", "/feedback/:path*", "/leaderboard/:path*", "/profile/:path*"
  ],
};
