export async function authenticate(
  prevState: string | undefined,
  formData: FormData
): Promise<string> {
    // Extract email and password from FormData
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Check for undefined email or password
    if (!email || !password) {
        return 'Email and password are required';
    }

    const endpoint = '/api/auth/signin';

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to authenticate');
        }

        return result.message;
    } catch (error) {
        console.error('Error during authentication:', error);
        return (error instanceof Error) ? error.message : 'An unknown error occurred';
    }
}