import { sql } from "@/lib/dbwrapper";
import { unstable_noStore as noStore } from "next/cache";

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
      deleted: row.deleted
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
    userId: row.userid,
    lastModified: row.last_modified,
    revisionNumber: row.revision_number,
    isJournal: row.is_journal,
    deleted: row.deleted
  }));

  return pages;
}

export async function fetchUpdatesSince(userId: string, since: Date) {
  noStore();

  // truncate to milliseconds to avoid precision issues (JavaScript Date is only precise to milliseconds)

  const sinceDate = new Date(since);
  
  const result = await sql`
    SELECT * FROM pages
    WHERE userId = ${userId}
    AND date_trunc('milliseconds', last_modified) > ${sinceDate.toISOString()}
  `;
  
  const pages = result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    value: row.value,
    userId: row.userid,
    lastModified: row.last_modified,
    revisionNumber: row.revision_number,
    isJournal: row.is_journal,
    deleted: row.deleted
  }));

  return pages;
}