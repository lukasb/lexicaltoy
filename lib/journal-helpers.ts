import { parse, isBefore, startOfDay, subWeeks } from 'date-fns';
import { Page, isPage } from "@/lib/definitions";
import { deleteStaleJournalPages } from "@/lib/db";
import { insertJournalPage } from '@/lib/db';

export const DEFAULT_JOURNAL_CONTENTS = '- ';

export function getTodayJournalTitle() {
  return getJournalTitle(new Date());
}

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
  
  const day = date.getDate();
  const ordinalSuffix = getOrdinalSuffix(day);
  
  const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
  const dateString = date.toLocaleDateString('en-US', options);
  
  return dateString.replace(new RegExp(` ${day},`), ` ${day}${ordinalSuffix},`);
}

export const handleNewJournalPage = async (title: string, userId: string, date: Date): Promise<Page | undefined> => {
  const result = await insertJournalPage(title, DEFAULT_JOURNAL_CONTENTS, userId, date);
  if (typeof result === "string") {
    if (result !== "409") {
      console.error("expected page, got string", result);
    }
    return;
  } else if (isPage(result)) {
    return result;
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

export function getJournalPageByDate(currentPages: Page[], date: Date) {
  const dateStr = getJournalTitle(date);
  const journalPage = currentPages.find((page) => {
    if (!page.isJournal) {
      return false;
    }
    return page.title === dateStr;
  });
  return journalPage;
}

// Get the last seven journal pages, searching as far back as necessary
export const getLastWeekJournalPages = (currentPages: Page[]): Page[] => {
  const today = new Date();
  const journalPages: Page[] = [];
  
  for (let i = 0; currentPages.length < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const journalPage = getJournalPageByDate(currentPages, date);
    if (journalPage && journalPage.isJournal) {
      journalPages.push(journalPage);
      if (journalPages.length >= 7) {
        break;
      }
    }
  }
  
  return journalPages;
}

// get the last six weeks of journal pages
// we only check based on date here, not on number of pages returned
export function getLastSixWeeksJournalPages(currentPages: Page[]): Page[] {
  const today = new Date();
  const sixWeeksAgo = subWeeks(today, 6);
  const journalPages: Page[] = [];

  for (let date = sixWeeksAgo; date <= today; date.setDate(date.getDate() + 1)) {
    const journalPage = getJournalPageByDate(currentPages, date);
    if (journalPage) {
      journalPages.push(journalPage);
    }
  }

  return journalPages;
}