import * as SwitchPrimitive from '@radix-ui/react-switch';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function Switch({ checked, onCheckedChange, label, disabled = false }: SwitchProps) {
  return (
    <label className={`flex items-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="w-10 h-6 bg-gray-300 dark:bg-gray-600 rounded-full relative data-[state=checked]:bg-blue-500 transition-colors disabled:cursor-not-allowed"
      >
        <SwitchPrimitive.Thumb className="block w-5 h-5 bg-white rounded-full shadow transition-transform translate-x-0.5 data-[state=checked]:translate-x-[18px]" />
      </SwitchPrimitive.Root>
      {label && <span className="font-semibold text-gray-700 dark:text-gray-300">{label}</span>}
    </label>
  );
}

export default Switch;
