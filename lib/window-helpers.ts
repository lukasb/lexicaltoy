import { useEffect } from 'react';

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