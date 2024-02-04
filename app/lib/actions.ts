'use server';

import { sql } from '@vercel/postgres';
import { signIn, signOut } from '@/auth';
import { AuthError } from 'next-auth';

export async function updatePageContents(id: string, value: string) {

    try {
      await sql`
        UPDATE pages
        SET value = ${value}
        WHERE id = ${id}
      `;
  
    } catch (error) {
      return {
        message: 'Database Error: Failed to Update Page.',
      };
    }
  }

  export async function updatePageTitle(id: string, title: string) {

    try {
      await sql`
        UPDATE pages
        SET title = ${title}
        WHERE id = ${id}
      `;
  
    } catch (error) {
      return {
        message: 'Database Error: Failed to Update Page.',
      };
    }
  }

  export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
  ) {
    try {
      await signIn('credentials', formData);
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.type) {
          case 'CredentialsSignin':
            return 'Invalid credentials.';
          default:
            return 'Something went wrong.';
        }
      }
      throw error;
    }
  }

  