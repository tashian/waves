import { useState } from 'react';
import type { ParameterGroupProps } from '../types';

export function ParameterGroup({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
  className = '',
}: ParameterGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggleOpen = () => {
    if (collapsible) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className={`border border-zinc-700 rounded-lg ${className}`}>
      {/* Header */}
      <div
        className={`
          flex items-center justify-between px-3 py-2
          bg-zinc-800
          ${collapsible ? 'cursor-pointer hover:bg-zinc-750' : ''}
          ${isOpen ? 'rounded-t-lg border-b border-zinc-700' : 'rounded-lg'}
        `}
        onClick={toggleOpen}
        role={collapsible ? 'button' : undefined}
        aria-expanded={collapsible ? isOpen : undefined}
      >
        <h3 className="text-sm font-semibold text-stone-300 uppercase tracking-wide">
          {title}
        </h3>

        {collapsible && (
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={`
              text-stone-400 transition-transform duration-200
              ${isOpen ? 'rotate-180' : ''}
            `}
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Content */}
      {isOpen && (
        <div className="p-3 bg-zinc-900">
          {children}
        </div>
      )}
    </div>
  );
}

export default ParameterGroup;
