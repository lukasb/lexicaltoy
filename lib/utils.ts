export function getModifierKey() {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  return isMac ? "⌘" : "Ctrl";
}