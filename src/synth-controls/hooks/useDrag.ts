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

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current || disabled) return;

      const deltaY = startYRef.current - e.clientY;
      const range = max - min;
      const multiplier = e.shiftKey ? fineMultiplier : 1;
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

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    if (disabled) return;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, disabled]);

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
    onWheel,
    onKeyDown,
    onDoubleClick,
    isDragging: isDraggingRef.current,
  };
}
