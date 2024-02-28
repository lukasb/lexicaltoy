// useJournalLogic.js
import { useEffect } from 'react';

// TODO import it instead maybe?
type OpenOrCreatePageByTitleType = (title: string) => void;

export const useJournal = (openOrCreatePageByTitle: OpenOrCreatePageByTitleType) => {
  const executeJournalLogic = () => {
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
    // Implement the logic here
  };

  const deleteOldJournalPages = () => {
    // Implement the logic here
  };
};