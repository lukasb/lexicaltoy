import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ message: string } | { error: string }>
) {
  if (req.method === 'POST') {
    const { email, password } = req.body;

    try {
      // Attempt to sign in with the provided credentials
      const result = await signIn('credentials', {
        redirect: false, // Do not redirect; handle the result directly
        email,
        password
      });

      // Check the result of the signIn attempt
      if (result && result.error) {
        // Handle specific error messages
        res.status(401).json({ error: result.error });
      } else {
        // If no error is provided in result, assume sign-in was successful
        res.status(200).json({ message: 'Authenticated successfully' });
      }
    } catch (error) {
      // Log the error and respond with a generic error message
      if (error instanceof AuthError) {
        console.error('Authentication error:', error);
        res.status(401).json({ error: 'Authentication error' });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end('Method Not Allowed');
  }
}