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
    Quiescent = 'quiescent'
  }
  
  export function toPageStatus(statusKey: string): PageStatus {
    return Object.values(PageStatus).includes(statusKey as PageStatus) ? statusKey as PageStatus : PageStatus.Quiescent;
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
    status: PageStatus;
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
      typeof obj.deleted === 'boolean' &&
      Object.values(PageStatus).includes(obj.status)
    );
  }