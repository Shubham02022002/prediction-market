import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [Google]
      : []),
    Credentials({
      name: "Email and Password",
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials, request) {
        const parsed = z
          .object({
            email: z.email(),
            password: z.string().min(1),
          })
          .safeParse(credentials);
        if (!parsed.success) {
          return null;
        }
        const email = parsed.data.email.trim().toLowerCase();
        const password = parsed.data.password;
        const emailLimit = rateLimit(`login:email:${email}`, {
          limit: 10,
          windowMs: 15 * 60_000,
        });
        const ipLimit = rateLimit(`login:ip:${clientIp(request)}`, {
          limit: 50,
          windowMs: 15 * 60_000,
        });
        if (!emailLimit.ok || !ipLimit.ok) {
          return null;
        }
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user || !user.passwordHash) {
          return null;
        }
        const passwordMatches = await bcrypt.compare(
          password,
          user.passwordHash,
        );
        if (!passwordMatches) {
          return null;
        }
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        const role = (user as typeof user & { role?: "USER" | "ADMIN" }).role;
        if (role) {
          token.role = role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role ?? "USER";
      }

      return session;
    },
  },
});
