import type { ReactNode } from 'react';

export interface KnobProps {
  /** Current value (controlled) */
  value: number;
  /** Callback when value changes */
  onChange: (value: number) => void;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number;
  /** Default value for double-click reset */
  defaultValue?: number;
  /** Label displayed below knob */
  label?: string;
  /** Unit displayed after value (Hz, ms, %, etc.) */
  unit?: string;
  /** Use logarithmic scaling (for frequency controls) */
  logarithmic?: boolean;
  /** Custom value formatter */
  formatValue?: (value: number) => string;
  /** Size in pixels */
  size?: number;
  /** Disabled state */
  disabled?: boolean;
  /** Current modulation offset (for visualization) */
  modulationValue?: number;
  /** Bipolar mode (value can be negative) */
  bipolar?: boolean;
}

export interface ModKnobProps extends Omit<KnobProps, 'size' | 'modulationValue'> {
  /** Small knob size (default 32px) */
  size?: number;
}

export interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  unit?: string;
  formatValue?: (value: number) => string;
  disabled?: boolean;
  modulationValue?: number;
  bipolar?: boolean;
}

export interface ParameterGroupProps {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

export interface DragState {
  isDragging: boolean;
  startY: number;
  startValue: number;
}
