export function highlightChanges(oldText: string, newText: string): string {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const maxLength = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLength; i++) {
    const oldLine = oldLines[i] || "";
    const newLine = newLines[i] || "";

    if (oldLine !== newLine) {
      // Lines are different, highlighting changes
      let highlighted = "";
      const maxLineLength = Math.max(oldLine.length, newLine.length);
      for (let j = 0; j < maxLineLength; j++) {
        const oldChar = oldLine[j] || "";
        const newChar = newLine[j] || "";
        if (oldChar !== newChar) {
          // Character changed, apply highlight
          highlighted += `\x1b[31m${newChar}\x1b[0m`; // Using red color for highlight
        } else {
          highlighted += newChar;
        }
      }
      return `Line ${i + 1} changed: ${highlighted}`;
    }
  }
  return "no changes";
}