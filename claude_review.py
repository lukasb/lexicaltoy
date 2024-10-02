import sys
import os
from dotenv import load_dotenv
import anthropic

# Load environment variables from .env.development.local file
load_dotenv('.env.development.local')

# Get API key from environment variable
API_KEY = os.getenv('ANTHROPIC_API_KEY')

def send_to_claude(diff_content):
    client = anthropic.Anthropic(api_key=API_KEY)
    prompt = """Please review the following git diff for potential issues or bugs. If you don't see any problems, provide a concise response saying it looks fine. If you do see potential issues, provide an excerpt of the relevant part of the diff and explain what you think the problem might be.

Here's the diff to review:

{diff_content}
"""
    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt.format(diff_content=diff_content)}]
        ) 

        return message.content[0].text
    except Exception as e:
        print(f"Error calling Claude API: {str(e)}")
        return None

def main():
    # Read diff content from stdin
    diff_content = sys.stdin.read()

    if not diff_content:
        print("No diff content to review.")
        sys.exit(1)

    review_result = send_to_claude(diff_content)
    if review_result:
        print(review_result)
    else:
        print("Failed to get review from Claude.")
        sys.exit(1)

if __name__ == "__main__":
    main()