import { format, parse, isBefore, startOfDay } from 'date-fns';
import { Page, isPage } from "@/app/lib/definitions";
import { deleteStaleJournalPages } from "@/app/lib/actions";
import { insertJournalPage } from '@/app/lib/actions';

export const DEFAULT_JOURNAL_CONTENTS = '{"root":{"children":[{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"listitem","version":1,"value":1}],"direction":null,"format":"","indent":0,"type":"list","version":1,"listType":"bullet","start":1,"tag":"ul"}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

export function getJournalTitle(date: Date) {
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

export const handleNewJournalPage = async (title: string, userId: string, date: Date, setCurrentPages: Function, openPage: Function) => {
  const result = await insertJournalPage(title, DEFAULT_JOURNAL_CONTENTS, userId, date);
  if (typeof result === "string") {
    console.error("expected page, got string", result);
    return;
  } else if (isPage(result)) {
    setCurrentPages((prevPages: Page[]) => [result, ...prevPages]);
    openPage(result);
  }
}

export const handleDeleteStaleJournalPages = async (today: Date, defaultValue: string, currentPages: Page[], setCurrentPages: Function) => {
  const stalePages = currentPages.filter((page) => {
    if (!page.isJournal) {
      return false;
    }
    const pageDateStr = page.title;
    const pageDate = parse(pageDateStr, 'MMM do, yyyy', new Date());
    const pageDateStartOfDay = startOfDay(pageDate);
    const todayStartOfDay = startOfDay(today);
    return isBefore(pageDateStartOfDay, todayStartOfDay) && page.value === defaultValue;
  });
  const idsToDelete = stalePages.map(page => page.id);
  if (idsToDelete.length === 0) return;
  const deletedIds = await deleteStaleJournalPages(idsToDelete, defaultValue);
  if (deletedIds.length > 0) {
    setCurrentPages((prevPages: Page[]) => prevPages.filter((p) => !deletedIds.includes(p.id)));
  }
}

export const getTodayJournalPage = (currentPages: Page[]) => {
  const today = new Date();
  const todayStr = getJournalTitle(today);
  const todaysJournalPage = currentPages.find((page) => {
    if (!page.isJournal) {
      return false;
    }
    return page.title === todayStr;
  });
  return todaysJournalPage;
}