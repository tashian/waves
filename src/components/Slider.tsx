import * as SliderPrimitive from '@radix-ui/react-slider';

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  valueDisplay?: string;
  subtitle?: string;
  bipolar?: boolean;
  modulationValue?: number;
  disabled?: boolean;
}

export function Slider({
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0.01,
  label,
  valueDisplay,
  subtitle,
  bipolar = false,
  modulationValue,
  disabled = false,
}: SliderProps) {
  const handleChange = (values: number[]) => {
    onValueChange(values[0]);
  };

  // Calculate modulated position as percentage
  const modulatedPercent = modulationValue !== undefined
    ? ((Math.min(Math.max(value + modulationValue, min), max) - min) / (max - min)) * 100
    : undefined;

  return (
    <label className={`block ${disabled ? 'opacity-50' : ''}`}>
      {(label || subtitle) && (
        <span className="flex justify-between mb-1">
          <span className="text-stone-300">{label}</span>
          {subtitle && <span className="text-xs text-stone-500">{subtitle}</span>}
        </span>
      )}
      <div className="relative">
        <SliderPrimitive.Root
          value={[value]}
          onValueChange={handleChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="relative flex items-center select-none touch-none w-full h-5"
        >
          <SliderPrimitive.Track className="bg-zinc-700 relative grow rounded-full h-1.5">
            {bipolar ? (
              <SliderPrimitive.Range
                className="absolute bg-stone-400 rounded-full h-full"
                style={{
                  left: value >= 0 ? '50%' : `${((value - min) / (max - min)) * 100}%`,
                  right: value >= 0 ? `${100 - ((value - min) / (max - min)) * 100}%` : '50%'
                }}
              />
            ) : (
              <SliderPrimitive.Range className="absolute bg-stone-400 rounded-full h-full" />
            )}
          </SliderPrimitive.Track>

          {/* Modulation ghost indicator */}
          {modulatedPercent !== undefined && (
            <div
              className="absolute w-2 h-2 bg-stone-400/50 rounded-full -translate-x-1/2 pointer-events-none"
              style={{ left: `${modulatedPercent}%` }}
            />
          )}

          <SliderPrimitive.Thumb className="block w-4 h-4 bg-stone-200 border-2 border-stone-400 rounded-full hover:bg-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:cursor-not-allowed" />
        </SliderPrimitive.Root>
      </div>
      {valueDisplay && (
        <span className="text-sm text-stone-400">{valueDisplay}</span>
      )}
    </label>
  );
}

export default Slider;
