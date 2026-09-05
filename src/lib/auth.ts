import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { env } from "./env";

export const authOptions: AuthOptions = {
  session: { strategy: "jwt" },
  secret: env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email + Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;

        // Best-effort audit — do not block login if this fails.
        try {
          await prisma.auditLog.create({
            data: {
              actorId: user.id,
              action: "LOGIN",
              entity: "user",
              entityId: user.id,
            },
          });
        } catch {
          /* noop */
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id: string }).id;
        token.role = (user as { role: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
};

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const u = session?.user as
    | { id?: string; email?: string; role?: string; name?: string }
    | undefined;
  if (!u?.id) return null;
  return {
    id: u.id,
    email: u.email ?? "",
    role: (u.role ?? "USER") as "ADMIN" | "USER",
    name: u.name ?? "",
  };
}

export async function requireAdmin() {
  const u = await getCurrentUser();
  if (!u) throw new AuthzError("Not authenticated", 401);
  if (u.role !== "ADMIN") throw new AuthzError("Admin only", 403);
  return u;
}

export async function requireUser() {
  const u = await getCurrentUser();
  if (!u) throw new AuthzError("Not authenticated", 401);
  return u;
}

export class AuthzError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}
