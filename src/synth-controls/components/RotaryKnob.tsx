import React, { useMemo } from 'react';
import { useDrag } from '../hooks/useDrag';
import { normalize, clamp, expScale, invExpScale } from '../utils/scaling';
import type { KnobProps } from '../types';

const ARC_DEGREES = 270;
const START_ANGLE = -135; // Bottom-left
const END_ANGLE = 135; // Bottom-right

interface RotaryKnobComponentProps extends KnobProps {}

export function RotaryKnob({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  defaultValue,
  label,
  unit,
  logarithmic = false,
  formatValue,
  size = 64,
  disabled = false,
  modulationValue,
  bipolar = false,
}: RotaryKnobComponentProps) {
  // Convert value to normalized (0-1) for display
  const normalizedValue = useMemo(() => {
    if (logarithmic) {
      return invExpScale(value, min, max);
    }
    return normalize(value, min, max);
  }, [value, min, max, logarithmic]);

  // Calculate modulation normalized value if present
  const normalizedModulation = useMemo(() => {
    if (modulationValue === undefined) return undefined;
    const modValue = clamp(value + modulationValue, min, max);
    if (logarithmic) {
      return invExpScale(modValue, min, max);
    }
    return normalize(modValue, min, max);
  }, [modulationValue, value, min, max, logarithmic]);

  // Convert normalized value to angle
  const valueAngle = START_ANGLE + normalizedValue * ARC_DEGREES;
  const modAngle = normalizedModulation !== undefined
    ? START_ANGLE + normalizedModulation * ARC_DEGREES
    : undefined;

  // Drag handler - works with actual values, not normalized
  const { onMouseDown, onWheel, onKeyDown, onDoubleClick } = useDrag({
    value,
    onChange,
    min,
    max,
    step,
    disabled,
  });

  // Handle double-click to reset to default
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (defaultValue !== undefined && !disabled) {
      onChange(defaultValue);
    }
  };

  // Format display value
  const displayValue = useMemo(() => {
    if (formatValue) {
      return formatValue(value);
    }
    const formatted = step >= 1 ? Math.round(value) : value.toFixed(2);
    return unit ? `${formatted}${unit}` : String(formatted);
  }, [value, formatValue, unit, step]);

  // SVG dimensions
  const center = size / 2;
  const radius = (size - 8) / 2; // Leave some padding
  const pointerLength = radius - 4;
  const trackRadius = radius - 2;

  // Calculate pointer end points
  const getPointerCoords = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + Math.sin(rad) * pointerLength,
      y: center - Math.cos(rad) * pointerLength,
    };
  };

  const pointer = getPointerCoords(valueAngle);
  const modPointer = modAngle !== undefined ? getPointerCoords(modAngle) : undefined;

  // Track arc path
  const trackPath = useMemo(() => {
    const startRad = (START_ANGLE * Math.PI) / 180;
    const endRad = (END_ANGLE * Math.PI) / 180;

    const startX = center + Math.sin(startRad) * trackRadius;
    const startY = center - Math.cos(startRad) * trackRadius;
    const endX = center + Math.sin(endRad) * trackRadius;
    const endY = center - Math.cos(endRad) * trackRadius;

    // Large arc flag = 1 because we're drawing more than 180 degrees
    return `M ${startX} ${startY} A ${trackRadius} ${trackRadius} 0 1 1 ${endX} ${endY}`;
  }, [center, trackRadius]);

  return (
    <div
      className={`flex flex-col items-center gap-1 ${disabled ? 'opacity-50' : ''}`}
      style={{ width: size }}
    >
      <div
        className={`relative rounded-full outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${disabled ? 'cursor-not-allowed' : 'cursor-ns-resize'}`}
        onMouseDown={onMouseDown}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        onDoubleClick={handleDoubleClick}
        tabIndex={disabled ? -1 : 0}
        role="slider"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-disabled={disabled}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="select-none"
        >
          {/* Track arc */}
          <path
            d={trackPath}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="text-gray-300 dark:text-gray-600"
            strokeLinecap="round"
          />

          {/* Center dot */}
          <circle
            cx={center}
            cy={center}
            r={3}
            className="fill-gray-400 dark:fill-gray-500"
          />

          {/* Modulation pointer (ghost) */}
          {modPointer && (
            <line
              x1={center}
              y1={center}
              x2={modPointer.x}
              y2={modPointer.y}
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="4 2"
              className="text-blue-400/40 transition-all duration-75"
            />
          )}

          {/* Value pointer */}
          <line
            x1={center}
            y1={center}
            x2={pointer.x}
            y2={pointer.y}
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="text-blue-500 transition-all duration-75"
          />
        </svg>
      </div>

      {/* Value display */}
      <span className="text-xs text-gray-600 dark:text-gray-400 font-mono tabular-nums">
        {displayValue}
      </span>

      {/* Label */}
      {label && (
        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </span>
      )}
    </div>
  );
}

export default RotaryKnob;
