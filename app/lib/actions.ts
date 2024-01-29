'use server';

import { sql } from '@vercel/postgres';

export async function updatePage(id: string, value: string, userId: string) {

    try {
      await sql`
        UPDATE pages
        SET userId = ${userId}, value = ${value}
        WHERE id = ${id}
      `;
  
    } catch (error) {
      return {
        message: 'Database Error: Failed to Update Page.',
      };
    }
  }
  