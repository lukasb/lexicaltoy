#!/bin/zsh

# Get the current branch name
current_branch=$(git rev-parse --abbrev-ref HEAD)

# Use git-merge-preview to get the diff
diff_output=$(git merge-tree $(git merge-base main "$current_branch") main "$current_branch")

# Check if there are any changes
if [ -z "$diff_output" ]; then
    echo "No changes to review. The current branch is up to date with main."
    exit 0
fi

# Print a summary of the changes
echo "Changes to be reviewed:"
echo "$diff_output" | grep '^[+-]' | head -n 10
echo "..."

# Call claude_review.py with the diff output
echo "$diff_output" | python claude_review.py

# Check the exit status of claude_review.py
if [ $? -eq 0 ]; then
    echo "Review completed successfully."
else
    echo "Review failed. Please check the output of claude_review.py."
    exit 1
fi