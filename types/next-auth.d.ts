// types/next-auth.d.ts
import NextAuth from "next-auth"

declare module "next-auth" {
  /**
   * Extending the built-in session types
   */
  interface Session {
    id?: string; // Optional string property
  }

  /**
   * Extending the built-in token types
   */
  interface JWT {
    id?: string; // Optional string property
  }
}