import CredentialsProvider from 'next-auth/providers/credentials';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/dbwrapper';
import type { User } from '@/lib/definitions';
import { AuthOptions } from 'next-auth';

async function getUser(email: string): Promise<User | undefined> {
  try {
    const user = await sql<User>`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0];
  } catch (error) {
    console.log('🛑 Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export const authConfig = {
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
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60,
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
      if (session.user) {
        session.user.image = session.user.image ?? null;
        session.user.name = session.user.name ?? null;
      }
      if (typeof token.id === 'string') {
        // this works, but I don't understand why, because the code path 
        // in the jwt callback that sets token.id is not taken
        session.id = token.id as string; 
      }
      return session;
    }
  }
} satisfies AuthOptions;