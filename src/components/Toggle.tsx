import * as TogglePrimitive from '@radix-ui/react-toggle';

interface ToggleProps {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

export function Toggle({ pressed, onPressedChange, children, disabled = false }: ToggleProps) {
  return (
    <TogglePrimitive.Root
      pressed={pressed}
      onPressedChange={onPressedChange}
      disabled={disabled}
      className={`
        px-3 py-1.5 text-sm font-medium rounded-md
        transition-colors
        ${pressed
          ? 'bg-blue-500 text-white'
          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {children}
    </TogglePrimitive.Root>
  );
}

export default Toggle;
