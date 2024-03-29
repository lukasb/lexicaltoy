"use server";

import { sql } from "@vercel/postgres";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { Page } from "./definitions"

export async function updatePageContentsWithHistory(id: string, value: string, oldRevisionNumber: number): Promise<number> {
  try {
    // Insert the current page data into the history table directly from the pages table
    await sql`
        INSERT INTO pages_history (id, title, value, userId, last_modified)
        SELECT id, title, value, userId, last_modified
        FROM pages
        WHERE id = ${id}
    `;
  
    // Then, update the page with the new value
    const result = await sql`
        UPDATE pages
        SET value = ${value}, revision_number = ${oldRevisionNumber+1}
        WHERE id = ${id}
        RETURNING revision_number
    `;
    return result.rows[0].revision_number;
  } catch (error) {
    console.log("Database Error: Failed to Update Page Contents.", error);
  }
  return -1;
}

export async function updatePageTitle(id: string, title: string, oldRevisionNumber: number): Promise<number> {
  try {
    const result = await sql`
        UPDATE pages
        SET title = ${title}, revision_number = ${oldRevisionNumber+1}
        WHERE id = ${id}
        RETURNING revision_number
      `;
      return result.rows[0].revision_number;
  } catch (error) {
      console.log("Database Error: Failed to Update Page Title.", error)
  }
  return -1;
}

export async function insertPage(title: string, value: string, userId: string) {
  try {
    const result = await sql`
        INSERT INTO pages (title, value, userId)
        VALUES (${title}, ${value}, ${userId})
        RETURNING id, title, value, userId, last_modified, revision_number, is_journal, deleted
      `;
    const page: Page = {
      id: result.rows[0].id,
      title: result.rows[0].title,
      value: result.rows[0].value,
      userId: result.rows[0].userid,
      lastModified: result.rows[0].last_modified,
      revisionNumber: result.rows[0].revision_number,
      isJournal: result.rows[0].is_journal,
      deleted: result.rows[0].deleted,
      pendingWrite: false
    };
    return page;
  } catch (error) {
    return {
      message: "Database Error: Failed to Insert Page.",
    };
  }
}

export async function insertJournalPage(title: string, value: string, userId: string, journalDate: Date) {
  try {
    const result = await sql`
        INSERT INTO pages (title, value, userId, is_journal)
        VALUES (${title}, ${value}, ${userId}, true)
        RETURNING id, title, value, userId, last_modified, revision_number, is_journal, deleted
      `;
    const page: Page = {
      id: result.rows[0].id,
      title: result.rows[0].title,
      value: result.rows[0].value,
      userId: result.rows[0].userid,
      lastModified: result.rows[0].last_modified,
      revisionNumber: result.rows[0].revision_number,
      isJournal: result.rows[0].is_journal,
      deleted: result.rows[0].deleted,
      pendingWrite: false
    };
    return page;
  } catch (error) {
    return {
      message: "Database Error: Failed to Insert Page.",
    };
  }
}

// this runs on the server, and sometimes next (or node?) will run it with
// stale data or even a stale definition of the function
// renaming this function, rebooting the server, and renaming the function again fixed it
// wtf
// when I renamed the function, started getting this error: https://github.com/vercel/next.js/discussions/58431
export async function deleteStaleJournalPages(ids: string[], defaultValue: string): Promise<string[]> {
  const deletedIds: string[] = [];

  for (const id of ids) {
    try {
      const result = await sql`
          SELECT id
          FROM pages
          WHERE id = ${id}
        `;

      if (result.rows.length === 0) {
        deletedIds.push(id);
      } else {
        const deleteResult = await sql`
            UPDATE pages
            SET deleted = true, revision_number = revision_number + 1
            WHERE id = ${id} and value = ${defaultValue}
            RETURNING id
          `;
        if (deleteResult.rows.length > 0) deletedIds.push(deleteResult.rows[0].id);
      }
    } catch (error) {
      console.log(`Database Error: Failed to Delete Page with ID ${id}:`, error);
    }
  }

  return deletedIds;
}

export async function deletePage(id: string, oldRevisionNumber: number): Promise<number> {
  try {
    const result = await sql`
        UPDATE pages
        SET deleted = true, revision_number = ${oldRevisionNumber+1}
        WHERE id = ${id}
        RETURNING revision_number
      `;
      return result.rows[0].revision_number;
  } catch (error) {
    console.log("Database Error: Failed to Delete Page.", error);
  }
  return -1;
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData
) {
  try {
    await signIn("credentials", formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return "Invalid credentials.";
        default:
          return "Something went wrong.";
      }
    }
    throw error;
  }
}
