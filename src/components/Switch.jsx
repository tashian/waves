import * as SwitchPrimitive from '@radix-ui/react-switch';

const Switch = ({ checked, onCheckedChange, label }) => {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="w-10 h-6 bg-gray-300 rounded-full relative data-[state=checked]:bg-blue-500 transition-colors"
      >
        <SwitchPrimitive.Thumb className="block w-5 h-5 bg-white rounded-full shadow transition-transform translate-x-0.5 data-[state=checked]:translate-x-[18px]" />
      </SwitchPrimitive.Root>
      {label && <span className="font-semibold">{label}</span>}
    </label>
  );
};

export default Switch;
