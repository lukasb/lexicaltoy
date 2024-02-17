"use server";

import { sql } from "@vercel/postgres";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { Page } from "./definitions"

export async function updatePageContents(id: string, value: string) {
  updatePageContentsWithHistory(id, value);
}

export async function updatePageContentsWithHistory(id: string, value: string) {
  try {
    // Insert the current page data into the history table directly from the pages table
    await sql`
        INSERT INTO pages_history (id, title, value, userId, last_modified)
        SELECT id, title, value, userId, last_modified
        FROM pages
        WHERE id = ${id}
    `;
  
    // Then, update the page with the new value
    await sql`
        UPDATE pages
        SET value = ${value}
        WHERE id = ${id}
    `;
  } catch (error) {
    return {
      message: "Database Error: Failed to Update Page.",
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
      message: "Database Error: Failed to Update Page.",
    };
  }
}

export async function insertPage(title: string, value: string, userId: string) {
  try {
    const result = await sql`
        INSERT INTO pages (title, value, userId)
        VALUES (${title}, ${value}, ${userId})
        RETURNING id, title, value, userId, last_modified
      `;
    const page: Page = {
      id: result.rows[0].id,
      title: result.rows[0].title,
      value: result.rows[0].value,
      userId: result.rows[0].userid,
      lastModified: result.rows[0].last_modified,
    };
    return page;
  } catch (error) {
    return {
      message: "Database Error: Failed to Insert Page.",
    };
  }
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
