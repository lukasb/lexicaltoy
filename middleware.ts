import { withAuth } from "next-auth/middleware";
 
export default withAuth({
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async authorized(params): Promise<boolean> {
      console.log('authorized', params.req.url, params.token);
      if (params.req.nextUrl.pathname.startsWith('/login')) {
         console.log("going to login page");
         return true;
      }
      return !!params.token;
    }
  }
});
 
export const config = {
  // https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
};
