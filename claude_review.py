import sys
import os
import requests
from dotenv import load_dotenv
import anthropic

# Load environment variables from .env.development.local file
load_dotenv('.env.development.local')

# Get API key from environment variable
API_KEY = os.getenv('ANTHROPIC_API_KEY')

def read_file_contents(file_path):
    try:
        with open(file_path, 'r') as file:
            return file.read()
    except Exception as e:
        print(f"Error reading file {file_path}: {str(e)}")
        return None

def send_to_claude(files_content):

    client = anthropic.Anthropic(api_key=API_KEY)
    prompt = """Please review the following code for bugs. If you don't see any bugs, provide a concise response saying it looks fine. If you do see bugs, provide an excerpt of the code, along with the file it comes from, and say what you think the problem is.

Here's the code to review:

{files_content}
"""
    try:
        message = client.messages.create(
            model="claude-3-5-sonnet-20240620",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt.format(files_content=files_content)}]
        ) 

        return message.content[0].text
    except Exception as e:
        print(f"Error calling Claude API: {str(e)}")
        return None

def main():
    if len(sys.argv) < 2:
        print("Usage: python claude_review.py <file1> <file2> ...")
        sys.exit(1)

    files_content = ""
    for file_path in sys.argv[1:]:
        content = read_file_contents(file_path)
        if content:
            files_content += f"\nFile: {file_path}\n\n{content}\n"

    if not files_content:
        print("No valid file contents to review.")
        sys.exit(1)

    review_result = send_to_claude(files_content)
    if review_result:
        print(review_result)
    else:
        print("Failed to get review from Claude.")
        sys.exit(1)

if __name__ == "__main__":
    main()
