import "next-auth";

declare module "next-auth" {
  interface User {
    isAdmin?: boolean;
    organizationId?: string | null;
    orgRole?: "ADMIN" | "MEMBER";
    organizationName?: string | null;
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin: boolean;
      organizationId: string | null;
      orgRole: "ADMIN" | "MEMBER";
      organizationName: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    isAdmin?: boolean;
    organizationId?: string | null;
    orgRole?: "ADMIN" | "MEMBER";
    organizationName?: string | null;
  }
}
