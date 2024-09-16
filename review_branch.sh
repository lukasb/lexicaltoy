#!/bin/zsh

# Get the current branch name
current_branch=$(git rev-parse --abbrev-ref HEAD)

# Get the list of added and modified files that would be changed if merged into main
# We use 'git diff --diff-filter=AM' to only include added (A) and modified (M) files
files_to_review=$(git diff --diff-filter=AM --name-only main..."$current_branch")

# Check if there are any files to review
if [ -z "$files_to_review" ]; then
    echo "No files to review. There are no additions or modifications compared to main."
    exit 0
fi

# Print the files that will be reviewed
echo "Files to be reviewed:"
echo "$files_to_review"

# Call claude_review.py with the list of files
python claude_review.py $files_to_review

# Check the exit status of claude_review.py
if [ $? -eq 0 ]; then
    echo "Review completed successfully."
else
    echo "Review failed. Please check the output of claude_review.py."
    exit 1
fi
