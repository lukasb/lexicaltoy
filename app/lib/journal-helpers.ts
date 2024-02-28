export const DEFAULT_JOURNAL_CONTENTS = '{"root":{"children":[{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"listitem","version":1,"value":1}],"direction":null,"format":"","indent":0,"type":"list","version":1,"listType":"bullet","start":1,"tag":"ul"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

export function getTodayJournalTitle() {
  const today = new Date();
  return getJournalTitle(today);
}

function getJournalTitle(date: Date) {
  function getOrdinalSuffix(day: number): string {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1:  return "st";
      case 2:  return "nd";
      case 3:  return "rd";
      default: return "th";
    }
  }
  
  const today = new Date();
  const day = today.getDate();
  const ordinalSuffix = getOrdinalSuffix(day);
  
  const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
  const dateString = today.toLocaleDateString('en-US', options);
  
  return dateString.replace(new RegExp(` ${day},`), ` ${day}${ordinalSuffix},`);
}