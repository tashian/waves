import * as SliderPrimitive from '@radix-ui/react-slider';

const Slider = ({
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0.01,
  label,
  valueDisplay,
  subtitle,
  bipolar = false
}) => {
  const handleChange = (values) => {
    onValueChange(values[0]);
  };

  return (
    <label className="block">
      {(label || subtitle) && (
        <span className="flex justify-between mb-1">
          <span>{label}</span>
          {subtitle && <span className="text-xs text-gray-500">{subtitle}</span>}
        </span>
      )}
      <SliderPrimitive.Root
        value={[value]}
        onValueChange={handleChange}
        min={min}
        max={max}
        step={step}
        className="relative flex items-center select-none touch-none w-full h-5"
      >
        <SliderPrimitive.Track className="bg-gray-200 relative grow rounded-full h-1.5">
          {bipolar ? (
            <SliderPrimitive.Range
              className="absolute bg-blue-500 rounded-full h-full"
              style={{
                left: value >= 0 ? '50%' : `${((value - min) / (max - min)) * 100}%`,
                right: value >= 0 ? `${100 - ((value - min) / (max - min)) * 100}%` : '50%'
              }}
            />
          ) : (
            <SliderPrimitive.Range className="absolute bg-blue-500 rounded-full h-full" />
          )}
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block w-4 h-4 bg-white border-2 border-blue-500 rounded-full hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2" />
      </SliderPrimitive.Root>
      {valueDisplay && (
        <span className="text-sm text-gray-600">{valueDisplay}</span>
      )}
    </label>
  );
};

export default Slider;
