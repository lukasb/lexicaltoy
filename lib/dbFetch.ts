import { sql } from "@vercel/postgres";
import { unstable_noStore as noStore } from "next/cache";
import { PageStatus } from "./definitions";

export async function fetchPages(userId: string, fetchDeleted?: boolean) {
  noStore();
  
  if (fetchDeleted) {
    const result = await sql`
      SELECT * FROM pages
      WHERE userId = ${userId}
    `;
    const pages = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      value: row.value,
      userId: row.userId,
      lastModified: row.last_modified,
      revisionNumber: row.revision_number,
      isJournal: row.is_journal,
      deleted: row.deleted,
      status: PageStatus.Quiescent
    }));

    return pages;
  }

  const result = await sql`
      SELECT * FROM pages
      WHERE userId = ${userId}
      AND deleted = false
    `;
  const pages = result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    value: row.value,
    userId: row.userId,
    lastModified: row.last_modified,
    revisionNumber: row.revision_number,
    isJournal: row.is_journal,
    deleted: row.deleted,
    status: PageStatus.Quiescent
  }));

  return pages;
}
