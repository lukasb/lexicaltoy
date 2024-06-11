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
/*
  export function isPage(obj: any): obj is Page {
    return (
      obj &&
      typeof obj.id === 'string' &&
      typeof obj.title === 'string' &&
      typeof obj.value === 'string' &&
      typeof obj.userId === 'string' &&
      obj.lastModified instanceof Date
    );
  }
*/
  export function isPage(obj: any): obj is Page {
    if (!obj) {
      console.log('obj is null');
      return false;
    }
    
    if (typeof obj.id !== 'string') {
      console.log('id is not a string');
      return false;
    }

    if (typeof obj.title !== 'string') {
      console.log('title is not a string');
      return false;
    }

    if (typeof obj.value !== 'string') {
      console.log('value is not a string');
      return false;
    }

    if (typeof obj.userId !== 'string') {
      console.log('userId is not a string');
      return false;
    }

    if (!(obj.lastModified instanceof Date)) {
      console.log('lastModified is not a Date');
      return false;
    }
    
    return true;
  }