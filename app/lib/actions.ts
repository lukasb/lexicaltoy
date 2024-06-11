"use server";

import { sql } from "@vercel/postgres";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { Page, PageStatus } from "./definitions"

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
