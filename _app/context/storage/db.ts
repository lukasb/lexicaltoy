import Dexie, { type EntityTable } from 'dexie';
import { Page } from '@/lib/definitions';

const localDb = new Dexie('orangetask-local', { cache: 'immutable'}) as Dexie & {
  pages: EntityTable<Page, 'id'>;
  queuedUpdates: EntityTable<Page, 'id'>;
};

localDb.version(1).stores({
  pages: '++id, userId, title, lastModified, revisionNumber, isJournal, deleted, status',
  queuedUpdates: '++id, userId, title, lastModified, revisionNumber, isJournal, deleted, status'
});

export { localDb };