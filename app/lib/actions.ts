"use server";

import { sql } from "@vercel/postgres";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

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
