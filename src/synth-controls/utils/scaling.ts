/**
 * Convert a normalized value (0-1) to an exponential scale
 * Useful for frequency controls where we want more resolution at lower values
 */
export function expScale(normalized: number, min: number, max: number): number {
  const minLog = Math.log(min);
  const maxLog = Math.log(max);
  return Math.exp(minLog + normalized * (maxLog - minLog));
}

/**
 * Convert a value from exponential scale back to normalized (0-1)
 */
export function invExpScale(value: number, min: number, max: number): number {
  const minLog = Math.log(min);
  const maxLog = Math.log(max);
  return (Math.log(value) - minLog) / (maxLog - minLog);
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Convert a value to a normalized range (0-1)
 */
export function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}

/**
 * Convert a normalized value (0-1) back to the original range
 */
export function denormalize(normalized: number, min: number, max: number): number {
  return min + normalized * (max - min);
}

/**
 * Round a value to a specific step
 */
export function quantize(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Convert a value angle for knob display (270° arc, starting from bottom-left)
 * Returns angle in degrees where:
 * - 0 (min) = -135° (bottom-left)
 * - 1 (max) = 135° (bottom-right)
 */
export function valueToAngle(normalized: number, arcDegrees: number = 270): number {
  const startAngle = -arcDegrees / 2;
  return startAngle + normalized * arcDegrees;
}

/**
 * Convert an angle back to a normalized value
 */
export function angleToValue(angle: number, arcDegrees: number = 270): number {
  const startAngle = -arcDegrees / 2;
  return (angle - startAngle) / arcDegrees;
}
