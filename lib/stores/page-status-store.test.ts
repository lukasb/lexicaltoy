import { act, renderHook } from '@testing-library/react';
import { usePageStatusStore } from './page-status-store';
import { PageStatus } from '@/lib/definitions';

describe('usePageStatusStore', () => {
  beforeEach(() => {
    // Clear the store before each test
    const store = usePageStatusStore.getState();
    act(() => {
      store.pageStatuses.clear();
    });
  });

  it('should add page status', () => {
    const { result } = renderHook(() => usePageStatusStore());
    const date = new Date();
    
    act(() => {
      result.current.addPageStatus('page1', PageStatus.UserEdit, date, 1, 'new value');
    });

    const status = result.current.getPageStatus('page1');
    expect(status).toBeDefined();
    expect(status?.status).toBe(PageStatus.UserEdit);
    expect(status?.lastModified).toBe(date);
    expect(status?.revisionNumber).toBe(1);
    expect(status?.newValue).toBe('new value');
  });

  it('should remove page status', () => {
    const { result } = renderHook(() => usePageStatusStore());
    const date = new Date();
    
    act(() => {
      result.current.addPageStatus('page1', PageStatus.UserEdit, date, 1, 'new value');
      result.current.removePageStatus('page1');
    });

    const status = result.current.getPageStatus('page1');
    expect(status).toBeUndefined();
  });

  it('should update page status', () => {
    const { result } = renderHook(() => usePageStatusStore());
    const date = new Date();
    const newDate = new Date(date.getTime() + 1000);
    
    act(() => {
      result.current.addPageStatus('page1', PageStatus.UserEdit, date, 1, 'original value');
      result.current.setPageStatus('page1', PageStatus.PendingWrite, newDate, 2, 'updated value');
    });

    const status = result.current.getPageStatus('page1');
    expect(status).toBeDefined();
    expect(status?.status).toBe(PageStatus.PendingWrite);
    expect(status?.lastModified).toBe(newDate);
    expect(status?.revisionNumber).toBe(2);
    expect(status?.newValue).toBe('updated value');
  });

  it('should get updated page value', () => {
    const { result } = renderHook(() => usePageStatusStore());
    const date = new Date();
    const page = { id: 'page1', value: 'original value' } as any;
    
    act(() => {
      result.current.addPageStatus('page1', PageStatus.UserEdit, date, 1, 'new value');
    });

    const value = result.current.getUpdatedPageValue(page);
    expect(value).toBe('new value');
  });

  it('should return original page value when no status exists', () => {
    const { result } = renderHook(() => usePageStatusStore());
    const page = { id: 'page1', value: 'original value' } as any;
    
    const value = result.current.getUpdatedPageValue(page);
    expect(value).toBe('original value');
  });

  it('should throw error when updating non-existent status', () => {
    const { result } = renderHook(() => usePageStatusStore());
    const date = new Date();
    
    expect(() => {
      act(() => {
        result.current.setPageStatus('nonexistent', PageStatus.UserEdit, date, 1, 'new value');
      });
    }).toThrow("Tried to update status for page without existing update");
  });

  it('should throw error when updating conflict status to non-dropping update', () => {
    const { result } = renderHook(() => usePageStatusStore());
    const date = new Date();
    
    act(() => {
      result.current.addPageStatus('page1', PageStatus.Conflict, date, 1);
    });

    expect(() => {
      act(() => {
        result.current.setPageStatus('page1', PageStatus.UserEdit, date, 1, 'new value');
      });
    }).toThrow("Cannot update a conflict page to a non-dropping update status");
  });

  it('should set page last modified', () => {
    const { result } = renderHook(() => usePageStatusStore());
    const date = new Date();
    const newDate = new Date(date.getTime() + 1000);
    
    act(() => {
      result.current.addPageStatus('page1', PageStatus.UserEdit, date, 1, 'new value');
      result.current.setPageLastModified('page1', newDate);
    });

    const status = result.current.getPageStatus('page1');
    expect(status?.lastModified).toBe(newDate);
  });

  it('should set page revision number', () => {
    const { result } = renderHook(() => usePageStatusStore());
    const date = new Date();
    
    act(() => {
      result.current.addPageStatus('page1', PageStatus.UserEdit, date, 1, 'new value');
      result.current.setPageRevisionNumber('page1', 2);
    });

    const status = result.current.getPageStatus('page1');
    expect(status?.revisionNumber).toBe(2);
  });

  it('should handle dropping update status correctly', () => {
    const { result } = renderHook(() => usePageStatusStore());
    const date = new Date();
    
    act(() => {
      result.current.addPageStatus('page1', PageStatus.UserEdit, date, 1, 'new value');
      result.current.setPageStatus('page1', PageStatus.DroppingUpdate);
    });

    const status = result.current.getPageStatus('page1');
    expect(status?.status).toBe(PageStatus.DroppingUpdate);
    expect(status?.newValue).toBeUndefined();
  });
}); 