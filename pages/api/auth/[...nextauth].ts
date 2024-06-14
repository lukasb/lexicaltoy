import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { z } from 'zod';
import { sql } from '@vercel/postgres';
import type { User } from '@/app/lib/definitions';
import bcrypt from 'bcrypt';
 
async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await sql<User>`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0];
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}
 
// maybe upgrade next-auth to v5 once it's out of beta
// downgraded to v4 due to https://github.com/nextauthjs/next-auth/discussions/9385

export default NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);
 
        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          const user = await getUser(email);
          if (!user) return null;
          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) return user;
        }
 
        return null;
      },
    }),
  ],
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: 'jwt'
  },
  jwt: {
    secret: process.env.AUTH_SECRET,
  },
  pages: {
    signIn: '/login/',  
    signOut: '/logout/',
  },
  callbacks: {
    async jwt({token, user}) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({session, token, user}) {
      if (typeof token.id === 'string') {
        session.id = token.id as string; 
      } else {
        console.log("token.id is not a string", token.id);
      }
      return session;
    }
  }
});