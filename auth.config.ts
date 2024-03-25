import type { NextAuthConfig } from 'next-auth';
import { DefaultSession } from 'next-auth';
import { User as NextUser } from 'next-auth';

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

export const authConfig = {
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }: { auth: any, request: { nextUrl: any } }) {
      const isLoggedIn = !!auth?.user;
      const isRequestingEditorPage = nextUrl.pathname.startsWith('/page');
      const isRequestingLogout = nextUrl.pathname.startsWith('/logout');
      if (isRequestingEditorPage) {
        if (isLoggedIn) return true;
        return false; // Redirect unauthenticated users to login page
      } else if (isLoggedIn) {
        if (!isRequestingLogout) {
          return Response.redirect(new URL('/page', nextUrl));
        }
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) token.user = user;
      return token;
    },
    session(sessionArgs) {
     // token only exists when the strategy is jwt and not database, so sessionArgs here will be { session, token }
     // with a database strategy it would be { session, user } 
     if ("token" in sessionArgs) {
        let session = sessionArgs.session;
        if ("user" in sessionArgs.token) {
          const tokenUser = sessionArgs.token.user as NextUser;
          if (tokenUser.id) {
            session.user.id = tokenUser.id;
            return session;
          }
        }
     }
     return sessionArgs.session;
    },
  },
  providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;