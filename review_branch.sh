#!/bin/zsh

# Get the current branch name
current_branch=$(git rev-parse --abbrev-ref HEAD)

# Get the list of added and modified files that would be changed if merged into main
# We use 'git diff --diff-filter=AM' to only include added (A) and modified (M) files
# Then filter for specific file extensions
files_to_review=$(git diff --diff-filter=AM --name-only main..."$current_branch" | grep -E '\.(js|ts|tsx|css)$')

# Check if there are any files to review
if [ -z "$files_to_review" ]; then
    echo "No files to review. There are no additions or modifications with the specified extensions compared to main."
    exit 0
fi

# Print the files that will be reviewed
echo "Files to be reviewed:"
echo "$files_to_review"

# Call claude_review.py with the list of files
# Use process substitution to pass files as separate arguments
python claude_review.py $(echo "$files_to_review" | tr '\n' '\0' | xargs -0 echo)

# Check the exit status of claude_review.py
if [ $? -eq 0 ]; then
    echo "Review completed successfully."
else
    echo "Review failed. Please check the output of claude_review.py."
    exit 1
fi