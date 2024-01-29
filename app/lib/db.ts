import { sql } from '@vercel/postgres';
import { unstable_noStore as noStore } from 'next/cache';
import { User, Page } from './definitions';

export async function fetchPages(userId: string) {
    noStore();
    const pages = await sql<Page>`
      SELECT * FROM pages
      WHERE userId = ${userId}
    `;
    return pages.rows;
  }