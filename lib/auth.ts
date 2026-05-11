import NextAuth from "next-auth";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { users, organizations } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db) as any,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email as string))
          .limit(1);

        if (!user?.password) return null;

        const isValid = await bcrypt.compare(credentials.password as string, user.password);
        if (!isValid) return null;

        // ADMIN_EMAILS 자동 승격
        let { isAdmin, organizationId, orgRole } = user;
        const adminEmails = (process.env.ADMIN_EMAILS ?? "")
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean);

        if (!isAdmin && adminEmails.includes(user.email.toLowerCase())) {
          await db
            .update(users)
            .set({ isAdmin: true, orgRole: "ADMIN" })
            .where(eq(users.id, user.id));
          isAdmin = true;
          orgRole = "ADMIN";
        }

        const organizationName = organizationId
          ? (await db
              .select({ name: organizations.name })
              .from(organizations)
              .where(eq(organizations.id, organizationId))
              .limit(1))[0]?.name ?? null
          : null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          isAdmin,
          organizationId,
          orgRole,
          organizationName,
        };
      },
    }),
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [GoogleProvider({
          clientId: process.env.AUTH_GOOGLE_ID,
          clientSecret: process.env.AUTH_GOOGLE_SECRET,
        })]
      : []),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = (user as any).isAdmin ?? false;
        token.organizationId = (user as any).organizationId ?? null;
        token.orgRole = (user as any).orgRole ?? "MEMBER";
        token.organizationName = (user as any).organizationName ?? null;
      }
      // 스테일 방지: organizationId가 undefined면 DB 재조회
      if (token.id && token.organizationId === undefined) {
        const [dbUser] = await db
          .select({
            organizationId: users.organizationId,
            orgRole: users.orgRole,
            isAdmin: users.isAdmin,
          })
          .from(users)
          .where(eq(users.id, token.id as string))
          .limit(1);

        if (dbUser) {
          token.organizationId = dbUser.organizationId;
          token.orgRole = dbUser.orgRole;
          token.isAdmin = dbUser.isAdmin;

          const orgName = dbUser.organizationId
            ? (await db
                .select({ name: organizations.name })
                .from(organizations)
                .where(eq(organizations.id, dbUser.organizationId))
                .limit(1))[0]?.name ?? null
            : null;
          token.organizationName = orgName;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = (token.isAdmin as boolean) ?? false;
        session.user.organizationId = (token.organizationId as string | null) ?? null;
        session.user.orgRole = (token.orgRole as "ADMIN" | "MEMBER") ?? "MEMBER";
        session.user.organizationName = (token.organizationName as string | null) ?? null;
      }
      return session;
    },
  },
});
