import { useEffect, RefObject } from 'react';

const CAN_USE_DOM: boolean =
  typeof window !== 'undefined' &&
  typeof window.document !== 'undefined' &&
  typeof window.document.createElement !== 'undefined';

export function isSmallWidthViewport(breakpoint: number): boolean {
  return CAN_USE_DOM && window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
};

export function isTouchDevice(): boolean {
  return CAN_USE_DOM && window.matchMedia(`(pointer: coarse)`).matches;
}

export function useBreakpoint(
  breakpoint: number,
  isCurrentSmallWidthViewport: boolean,
  setIsSmallWidthViewport: (isSmall: boolean) => void
): void {
  useEffect(() => {
    const updateViewPortWidth = () => {
      if (isSmallWidthViewport(breakpoint) !== isCurrentSmallWidthViewport) {
        setIsSmallWidthViewport(isSmallWidthViewport(breakpoint));
      }
    };
    updateViewPortWidth();
    window.addEventListener('resize', updateViewPortWidth);

    return () => {
      window.removeEventListener('resize', updateViewPortWidth);
    };
  }, [breakpoint, isCurrentSmallWidthViewport, setIsSmallWidthViewport]);
}

export function useClickOutside(ref: RefObject<HTMLElement>, handler: () => void) {
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        handler();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, handler]);
}