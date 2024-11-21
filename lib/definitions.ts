export type User = {
    id: string;
    name: string;
    email: string;
    password: string;
  };
  
  export enum PageStatus {
    UserEdit = 'user_edit',
    EditFromSharedNodes = 'edit_from_shared_nodes',
    PendingWrite = 'pending_write',
    EditorUpdateRequested = 'editor_update_requested',
    Conflict = 'conflict',
    DroppingUpdate = 'dropping_update',
    Quiescent = 'quiescent'
  }

  export type Page = {
    id: string;
    value: string;
    userId: string;
    title: string;
    lastModified: Date;
    revisionNumber: number;
    isJournal: boolean;
    deleted: boolean;
  };

  export function isPage(obj: any): obj is Page {
    return (
      obj &&
      typeof obj.id === 'string' &&
      typeof obj.title === 'string' &&
      typeof obj.value === 'string' &&
      typeof obj.userId === 'string' &&
      obj.lastModified instanceof Date &&
      typeof obj.revisionNumber === 'number' &&
      typeof obj.isJournal === 'boolean' &&
      typeof obj.deleted === 'boolean'
    );
  }

  export const DEFAULT_NONJOURNAL_PAGE_VALUE = '- ';

  export enum ConflictErrorCode {
    StaleUpdate = 'stale_update',
    UniquenessViolation = 'uniqueness_violation',
    NotFound = 'not_found',
    Unknown = 'unknown'
  }