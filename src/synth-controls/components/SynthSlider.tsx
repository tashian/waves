import { useMemo, useRef, useCallback, useEffect, MouseEvent, TouchEvent } from 'react';
import { normalize, clamp } from '../utils/scaling';
import type { SliderProps } from '../types';

interface SynthSliderProps extends SliderProps {
  /** Display string for the current value */
  valueDisplay?: string;
  /** Secondary label shown on the right */
  subtitle?: string;
}

export function SynthSlider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  label,
  valueDisplay,
  subtitle,
  formatValue,
  disabled = false,
  modulationValue,
  bipolar = false,
}: SynthSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Normalize value to 0-1 for display
  const normalizedValue = useMemo(() => {
    return normalize(value, min, max);
  }, [value, min, max]);

  // Calculate modulation position with wrap-around (Pac-Man style)
  const modulationSegments = useMemo(() => {
    if (modulationValue === undefined || modulationValue === 0) return undefined;

    const range = max - min;
    const modOffset = modulationValue;
    const startPercent = normalizedValue * 100;

    // Calculate the raw end position (can be outside 0-100)
    const rawEndPercent = ((value + modOffset - min) / range) * 100;

    // If no wrapping needed, return a single segment
    if (rawEndPercent >= 0 && rawEndPercent <= 100) {
      return [{
        start: Math.min(startPercent, rawEndPercent),
        end: Math.max(startPercent, rawEndPercent),
      }];
    }

    // Handle wrap-around
    const segments: { start: number; end: number }[] = [];

    if (rawEndPercent > 100) {
      // Wraps past the right edge
      const wrappedPercent = ((rawEndPercent - 100) % 100);
      // Segment from value to right edge
      segments.push({ start: startPercent, end: 100 });
      // Segment from left edge to wrapped position
      if (wrappedPercent > 0) {
        segments.push({ start: 0, end: wrappedPercent });
      }
    } else if (rawEndPercent < 0) {
      // Wraps past the left edge
      const wrappedPercent = 100 + (rawEndPercent % 100);
      // Segment from value to left edge
      segments.push({ start: 0, end: startPercent });
      // Segment from wrapped position to right edge
      if (wrappedPercent < 100) {
        segments.push({ start: wrappedPercent, end: 100 });
      }
    }

    return segments;
  }, [modulationValue, normalizedValue, value, min, max]);

  // Calculate value from horizontal position (accounting for thumb inset)
  const getValueFromPosition = useCallback((clientX: number) => {
    if (!trackRef.current) return value;
    const rect = trackRef.current.getBoundingClientRect();
    const thumbRadius = 8; // half of w-4 (16px)
    const trackWidth = rect.width - thumbRadius * 2;
    const percent = clamp((clientX - rect.left - thumbRadius) / trackWidth, 0, 1);
    let newValue = min + percent * (max - min);
    // Quantize to step
    newValue = Math.round(newValue / step) * step;
    return clamp(newValue, min, max);
  }, [min, max, step, value]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.preventDefault();
    isDraggingRef.current = true;
    const newValue = getValueFromPosition(e.clientX);
    if (newValue !== value) onChange(newValue);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  }, [disabled, getValueFromPosition, onChange, value]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingRef.current || disabled) return;
    const newValue = getValueFromPosition(e.clientX);
    if (newValue !== value) onChange(newValue);
  }, [disabled, getValueFromPosition, onChange, value]);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (disabled || e.touches.length === 0) return;
    isDraggingRef.current = true;
    const newValue = getValueFromPosition(e.touches[0].clientX);
    if (newValue !== value) onChange(newValue);
  }, [disabled, getValueFromPosition, onChange, value]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDraggingRef.current || disabled || e.touches.length === 0) return;
    e.preventDefault();
    const newValue = getValueFromPosition(e.touches[0].clientX);
    if (newValue !== value) onChange(newValue);
  }, [disabled, getValueFromPosition, onChange, value]);

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  // Add/remove global listeners
  useEffect(() => {
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
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Format display value
  const displayValue = useMemo(() => {
    if (valueDisplay) return valueDisplay;
    if (formatValue) return formatValue(value);
    return step >= 1 ? Math.round(value).toString() : value.toFixed(2);
  }, [value, valueDisplay, formatValue, step]);

  const thumbPercent = normalizedValue * 100;

  return (
    <div className={`block ${disabled ? 'opacity-50' : ''}`}>
      {(label || subtitle) && (
        <div className="flex justify-between mb-1">
          <span className="text-sm text-stone-300">{label}</span>
          {subtitle && <span className="text-xs text-stone-500">{subtitle}</span>}
        </div>
      )}

      <div
        ref={trackRef}
        className={`relative h-6 ${disabled ? 'cursor-not-allowed' : 'cursor-ew-resize'} touch-none`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        tabIndex={disabled ? -1 : 0}
        role="slider"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-disabled={disabled}
      >
        {/* Track background - full width */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 bg-zinc-700 rounded-full" />

        {/* Filled track */}
        {!bipolar && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-stone-400 rounded-full left-0"
            style={{ width: `calc(8px + (100% - 16px) * ${normalizedValue})` }}
          />
        )}

        {/* Modulation segments (wrap-around Pac-Man style) */}
        {modulationSegments?.map((segment, i) => (
          <div
            key={i}
            className="absolute top-1/2 -translate-y-1/2 h-2 bg-blue-400/40 rounded-full pointer-events-none"
            style={{
              left: `calc((100% - 16px) * ${segment.start / 100} + 8px)`,
              width: `calc((100% - 16px) * ${(segment.end - segment.start) / 100})`,
            }}
          />
        ))}

        {/* Thumb - left edge at 0 when min, right edge at 100% when max */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-stone-200 border-2 border-stone-400 rounded-full pointer-events-none"
          style={{ left: `calc((100% - 16px) * ${normalizedValue})` }}
        />
      </div>

      {displayValue && (
        <span className="text-sm text-stone-400">{displayValue}</span>
      )}
    </div>
  );
}

export default SynthSlider;
