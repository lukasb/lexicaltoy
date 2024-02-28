// useJournalLogic.js
import { useEffect, useRef } from 'react';
import { getTodayJournalTitle } from '@/app/lib/journal-helpers';

// TODO import these instead maybe?
type HandleNewJournalPage = (title: string) => void;
type CheckForJournalPage = (title: string) => boolean;

export const useJournal = (handleNewJournalPage: HandleNewJournalPage,
  checkForJournalPage: CheckForJournalPage) => {

  const checkForJournalPageRef = useRef<CheckForJournalPage>();
  const handleNewJournalPageRef = useRef<HandleNewJournalPage>();

  useEffect(() => {
    checkForJournalPageRef.current = checkForJournalPage;
    handleNewJournalPageRef.current = handleNewJournalPage;
  }, [checkForJournalPage, handleNewJournalPage]);

  const executeJournalLogic = () => {
    console.log('Executing journal logic');
    checkAndCreateDailyJournalPage();
    deleteOldJournalPages();
  };

  useEffect(() => {
    // Execute the logic immediately when the hook is used in a component
    executeJournalLogic();

    // Set up the interval
    const intervalId = setInterval(executeJournalLogic, 30000); // 30 seconds

    // Cleanup function
    return () => clearInterval(intervalId);
  }, []); // Runs only once when the component mounts

  const checkAndCreateDailyJournalPage = () => {
    const todayJournalTitle = getTodayJournalTitle();
    if (!checkForJournalPageRef.current?.(todayJournalTitle)) handleNewJournalPageRef.current?.(todayJournalTitle);
  };

  const deleteOldJournalPages = () => {
    // Implement the logic here
  };
};