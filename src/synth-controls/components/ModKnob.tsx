import React, { useMemo } from 'react';
import { useDrag } from '../hooks/useDrag';
import { normalize } from '../utils/scaling';
import { formatBipolarPercent } from '../utils/formatting';

interface ModKnobProps {
  /** Current value (-1 to 1 for bipolar) */
  value: number;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Minimum value (default -1) */
  min?: number;
  /** Maximum value (default 1) */
  max?: number;
  /** Step increment */
  step?: number;
  /** Label (e.g., "env") */
  label?: string;
  /** Size in pixels (default 28) */
  size?: number;
  /** Disabled state */
  disabled?: boolean;
}

const ARC_DEGREES = 270;
const START_ANGLE = -135;
const END_ANGLE = 135;

export function ModKnob({
  value,
  onChange,
  min = -1,
  max = 1,
  step = 0.01,
  label,
  size = 28,
  disabled = false,
}: ModKnobProps) {
  // Normalize value to 0-1 range for display
  const normalizedValue = normalize(value, min, max);

  // Calculate angle for pointer
  const valueAngle = START_ANGLE + normalizedValue * ARC_DEGREES;

  // Center position angle (for bipolar indicator)
  const centerAngle = START_ANGLE + 0.5 * ARC_DEGREES; // 0 degrees (top)

  const { onMouseDown, onTouchStart, onWheel, onKeyDown } = useDrag({
    value,
    onChange,
    min,
    max,
    step,
    sensitivity: 100, // More sensitive for small knob
    disabled,
  });

  // Double-click to reset to 0
  const handleDoubleClick = () => {
    if (!disabled) {
      onChange(0);
    }
  };

  // SVG dimensions
  const center = size / 2;
  const radius = (size - 4) / 2;
  const pointerLength = radius - 2;
  const trackRadius = radius - 1;

  // Calculate pointer end point
  const getPointerCoords = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + Math.sin(rad) * pointerLength,
      y: center - Math.cos(rad) * pointerLength,
    };
  };

  const pointer = getPointerCoords(valueAngle);

  // Track arc path
  const trackPath = useMemo(() => {
    const startRad = (START_ANGLE * Math.PI) / 180;
    const endRad = (END_ANGLE * Math.PI) / 180;

    const startX = center + Math.sin(startRad) * trackRadius;
    const startY = center - Math.cos(startRad) * trackRadius;
    const endX = center + Math.sin(endRad) * trackRadius;
    const endY = center - Math.cos(endRad) * trackRadius;

    return `M ${startX} ${startY} A ${trackRadius} ${trackRadius} 0 1 1 ${endX} ${endY}`;
  }, [center, trackRadius]);

  // Center tick mark for bipolar reference
  const centerTick = useMemo(() => {
    const rad = (centerAngle * Math.PI) / 180;
    const innerR = trackRadius - 3;
    const outerR = trackRadius + 1;
    return {
      x1: center + Math.sin(rad) * innerR,
      y1: center - Math.cos(rad) * innerR,
      x2: center + Math.sin(rad) * outerR,
      y2: center - Math.cos(rad) * outerR,
    };
  }, [center, trackRadius, centerAngle]);

  // Determine if value is positive, negative, or zero
  const isPositive = value > 0.01;
  const isNegative = value < -0.01;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={`relative rounded-full outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 focus:ring-offset-zinc-900 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-ns-resize'} touch-none`}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        onDoubleClick={handleDoubleClick}
        tabIndex={disabled ? -1 : 0}
        role="slider"
        aria-label={label || 'modulation depth'}
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-disabled={disabled}
        title={formatBipolarPercent(value)}
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
            strokeWidth={1.5}
            className="text-zinc-600"
            strokeLinecap="round"
          />

          {/* Center tick (zero reference) */}
          <line
            x1={centerTick.x1}
            y1={centerTick.y1}
            x2={centerTick.x2}
            y2={centerTick.y2}
            stroke="currentColor"
            strokeWidth={1}
            className="text-zinc-500"
          />

          {/* Value pointer - color indicates polarity */}
          <line
            x1={center}
            y1={center}
            x2={pointer.x}
            y2={pointer.y}
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            className={`transition-all duration-75 ${
              isPositive
                ? 'text-orange-500'
                : isNegative
                ? 'text-cyan-500'
                : 'text-zinc-400'
            }`}
          />

          {/* Center dot */}
          <circle
            cx={center}
            cy={center}
            r={1.5}
            className="fill-zinc-500"
          />
        </svg>
      </div>

      {/* Label */}
      {label && (
        <span className="text-[10px] text-stone-500 uppercase">
          {label}
        </span>
      )}
    </div>
  );
}

export default ModKnob;
