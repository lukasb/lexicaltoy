import { parse, isBefore, startOfDay, subWeeks } from 'date-fns';
import { Page } from "@/lib/definitions";
import { insertPage, updatePage, PageSyncResult } from '@/_app/context/storage/storage-context';
import { getJournalPagesByUserId, getJournalQueuedUpdatesByUserId, deleteQueuedUpdate } from '@/_app/context/storage/storage-context';

export const DEFAULT_JOURNAL_CONTENTS = 
`- =ask("Based on my recent journal entries, create a journaling prompt that (1) references or builds on a meaningful theme, question or pattern you've observed in their recent entries (2) invites them to check in with with present moment experience, both external circumstances and internal state and (3) opens up exploration for what that would mean for their path forward. This prompt should be 2-3 sentences long, feel conversational rather than clinical, and maintain a supportive, curious tone. Avoid giving advice or making assumptions. Instead, ask open-ended questions that help them explore their own thoughts and feelings.",[[journals/]])
- `;

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

export function getJournalPageDate(page: Page) {
  return parse(page.title, 'MMM do, yyyy', new Date());
}

export const insertNewJournalPage = async (
  title: string,
  userId: string,
  date: Date
): Promise<[Page | undefined, PageSyncResult]> => {
  console.log("inserttNewJournalPage", title, userId, date);
  const [newPage, result] = await insertPage(
    title,
    DEFAULT_JOURNAL_CONTENTS,
    userId,
    true
  );
  return [newPage, result];
};

export const deleteStaleJournalPages = async (today: Date, defaultValue: string, userId: string) => {
  const journalPages = await getJournalPagesByUserId(userId);
  const stalePages = journalPages.filter((page) => {
    if (!page.isJournal) {
      return false;
    }
    const pageDateStr = page.title;
    const pageDate = parse(pageDateStr, 'MMM do, yyyy', new Date());
    const pageDateStartOfDay = startOfDay(pageDate);
    const todayStartOfDay = startOfDay(today);
    return isBefore(pageDateStartOfDay, todayStartOfDay) && page.value === defaultValue;
  });
  for (const page of stalePages) {
    console.log("deleting stale journal page", page.title);
    await updatePage(page, page.value, page.title, true, new Date(new Date().toISOString()));
  }
  const journalQueuedUpdates = await getJournalQueuedUpdatesByUserId(userId);
  const staleQueuedUpdates = journalQueuedUpdates.filter((queuedUpdate) => {
    const pageDateStr = queuedUpdate.title;
    const pageDate = parse(pageDateStr, 'MMM do, yyyy', new Date());
    const pageDateStartOfDay = startOfDay(pageDate);
    const todayStartOfDay = startOfDay(today);
    return isBefore(pageDateStartOfDay, todayStartOfDay) && queuedUpdate.value === defaultValue && !queuedUpdate.deleted;
  });
  for (const queuedUpdate of staleQueuedUpdates) {
    console.log("deleting stale journal queued update", queuedUpdate.title);
    await deleteQueuedUpdate(queuedUpdate.id);
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
  
  for (let i = 0; i < currentPages.length && journalPages.length < 7; i++) {
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