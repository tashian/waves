import * as SelectPrimitive from '@radix-ui/react-select';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function Select({
  value,
  onValueChange,
  options,
  label,
  placeholder = 'Select...',
  disabled = false,
}: SelectProps) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-gray-700 dark:text-gray-300">{label}</label>
      )}
      <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          className={`
            inline-flex items-center justify-between w-full px-3 py-2 text-left
            bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600
            rounded shadow-sm hover:bg-gray-50 dark:hover:bg-gray-750
            focus:outline-none focus:ring-2 focus:ring-blue-500
            disabled:opacity-50 disabled:cursor-not-allowed
            text-gray-700 dark:text-gray-300
          `}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon className="ml-2">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M2.5 4.5L6 8L9.5 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={4}
            className="overflow-hidden bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-600 z-50 w-[var(--radix-select-trigger-width)]"
          >
            <SelectPrimitive.ScrollUpButton className="flex items-center justify-center h-6 bg-white dark:bg-gray-800 cursor-default">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2.5 7.5L6 4L9.5 7.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </SelectPrimitive.ScrollUpButton>

            <SelectPrimitive.Viewport className="p-1 max-h-64">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  className="
                    relative flex items-center px-8 py-2 text-sm rounded select-none
                    text-gray-700 dark:text-gray-300
                    hover:bg-blue-50 dark:hover:bg-blue-900/30
                    focus:bg-blue-100 dark:focus:bg-blue-900/50 focus:outline-none
                    cursor-pointer data-[highlighted]:bg-blue-50 dark:data-[highlighted]:bg-blue-900/30
                  "
                >
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex items-center">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2 6L5 9L10 3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>

            <SelectPrimitive.ScrollDownButton className="flex items-center justify-center h-6 bg-white dark:bg-gray-800 cursor-default">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M2.5 4.5L6 8L9.5 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}

export default Select;
