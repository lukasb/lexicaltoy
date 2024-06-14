


/*
export default withAuth = (
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized({ token, request: { nextUrl } }: { token: any, request: { nextUrl: NextUrl } }): boolean | Response {
      const isLoggedIn = !!auth?.user;
      const isRequestingEditorPage = nextUrl.pathname.startsWith('/page');
      const isRequestingLogout = nextUrl.pathname.startsWith('/logout');
      const isRequestingAdmin = nextUrl.pathname.startsWith('/admin');
      const isRequestingApi = nextUrl.pathname.startsWith('/api');
      
      if (isRequestingEditorPage || isRequestingApi) {
        return isLoggedIn; // Allows access if logged in, otherwise false
      } else if (isLoggedIn) {
        if (!isRequestingLogout && !isRequestingAdmin) {
          return Response.redirect(new URL('/page', nextUrl.origin)); // Redirects to a specific page
        }
      }
      return true; // Default to allowing access
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
);
*/