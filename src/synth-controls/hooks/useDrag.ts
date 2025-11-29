import { useCallback, useRef, useEffect } from 'react';
import { clamp } from '../utils/scaling';

interface UseDragOptions {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  /** Pixels of vertical drag for full range */
  sensitivity?: number;
  /** Fine adjustment multiplier when shift is held */
  fineMultiplier?: number;
  disabled?: boolean;
}

interface UseDragReturn {
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onWheel: (e: React.WheelEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  isDragging: boolean;
}

export function useDrag({
  value,
  onChange,
  min,
  max,
  step,
  sensitivity = 200,
  fineMultiplier = 0.1,
  disabled = false,
}: UseDragOptions): UseDragReturn {
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const startValueRef = useRef(0);

  const handleMove = useCallback(
    (clientY: number, shiftKey: boolean = false) => {
      if (!isDraggingRef.current || disabled) return;

      const deltaY = startYRef.current - clientY;
      const range = max - min;
      const multiplier = shiftKey ? fineMultiplier : 1;
      const deltaValue = (deltaY / sensitivity) * range * multiplier;

      let newValue = startValueRef.current + deltaValue;
      newValue = clamp(newValue, min, max);

      // Quantize to step
      newValue = Math.round(newValue / step) * step;

      if (newValue !== value) {
        onChange(newValue);
      }
    },
    [value, onChange, min, max, step, sensitivity, fineMultiplier, disabled]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      handleMove(e.clientY, e.shiftKey);
    },
    [handleMove]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length > 0) {
        e.preventDefault();
        handleMove(e.touches[0].clientY);
      }
    },
    [handleMove]
  );

  const handleEnd = useCallback(() => {
    isDraggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const handleMouseUp = handleEnd;
  const handleTouchEnd = handleEnd;

  useEffect(() => {
    if (disabled) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd, disabled]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (disabled) return;
      e.preventDefault();

      isDraggingRef.current = true;
      startYRef.current = e.clientY;
      startValueRef.current = value;

      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
    },
    [value, disabled]
  );

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      if (e.touches.length === 0) return;

      isDraggingRef.current = true;
      startYRef.current = e.touches[0].clientY;
      startValueRef.current = value;

      document.body.style.userSelect = 'none';
    },
    [value, disabled]
  );

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (disabled) return;
      e.preventDefault();

      const direction = e.deltaY > 0 ? -1 : 1;
      const multiplier = e.shiftKey ? fineMultiplier : 1;
      const delta = step * direction * multiplier;

      let newValue = value + delta;
      newValue = clamp(newValue, min, max);
      newValue = Math.round(newValue / step) * step;

      if (newValue !== value) {
        onChange(newValue);
      }
    },
    [value, onChange, min, max, step, fineMultiplier, disabled]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      let direction = 0;
      let jumpToExtreme = false;

      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        direction = 1;
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        direction = -1;
      } else if (e.key === 'Home') {
        jumpToExtreme = true;
        direction = -1;
      } else if (e.key === 'End') {
        jumpToExtreme = true;
        direction = 1;
      } else if (e.key === 'PageUp') {
        direction = 10;
      } else if (e.key === 'PageDown') {
        direction = -10;
      } else {
        return;
      }

      e.preventDefault();

      let newValue: number;
      if (jumpToExtreme) {
        newValue = direction > 0 ? max : min;
      } else {
        const multiplier = e.shiftKey ? fineMultiplier : 1;
        const delta = step * direction * multiplier;
        newValue = clamp(value + delta, min, max);
        newValue = Math.round(newValue / step) * step;
      }

      if (newValue !== value) {
        onChange(newValue);
      }
    },
    [value, onChange, min, max, step, fineMultiplier, disabled]
  );

  const onDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      // Double-click could reset to default - but we'd need defaultValue prop
      // For now, this is a placeholder
    },
    []
  );

  return {
    onMouseDown,
    onTouchStart,
    onWheel,
    onKeyDown,
    onDoubleClick,
    isDragging: isDraggingRef.current,
  };
}
