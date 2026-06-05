import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

/**
 * Single-organizer admin auth. Credentials are checked against env vars.
 * JWT session strategy — no database adapter needed.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  providers: [
    Credentials({
      name: "Organizer",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (creds) => {
        const expectedUser = process.env.ADMIN_USERNAME;
        const expectedPass = process.env.ADMIN_PASSWORD;
        if (!expectedUser || !expectedPass) return null;
        if (creds?.username === expectedUser && creds?.password === expectedPass) {
          return { id: "admin", name: expectedUser };
        }
        return null;
      },
    }),
  ],
});
