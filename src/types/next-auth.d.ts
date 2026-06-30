import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string | null;
      onboardingStep: string;
    };
  }

  interface User {
    id: string;
    role: string | null;
    onboardingStep: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string | null;
    onboardingStep: string;
  }
}
