import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { Check, ChevronsUpDown } from "lucide-react";

export type SelectComboboxOption = {
  value: string;

  label: string;

  description?: string;

  disabled?: boolean;
};

type SelectComboboxProps = {
  label: string;

  value: string;

  options: SelectComboboxOption[];

  placeholder?: string;

  disabled?: boolean;

  onChange: (value: string) => void;
};

export function SelectCombobox({
  label,
  value,
  options,
  placeholder = "Select an option",
  disabled = false,
  onChange,
}: SelectComboboxProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const labelId = useId();

  const listboxId = useId();

  const [open, setOpen] = useState(false);

  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedIndex = options.findIndex((option) => option.value === value);

  const selectedOption =
    selectedIndex >= 0 ? options[selectedIndex] : undefined;

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent): void {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  function findEnabledIndex(startIndex: number, direction: 1 | -1): number {
    if (options.length === 0) {
      return -1;
    }

    let currentIndex = startIndex;

    for (let attempt = 0; attempt < options.length; attempt += 1) {
      currentIndex =
        (currentIndex + direction + options.length) % options.length;

      if (!options[currentIndex].disabled) {
        return currentIndex;
      }
    }

    return -1;
  }

  function openList(): void {
    const initialIndex =
      selectedIndex >= 0 && !options[selectedIndex].disabled
        ? selectedIndex
        : findEnabledIndex(-1, 1);

    setActiveIndex(initialIndex);
    setOpen(true);
  }

  function selectOption(index: number): void {
    const option = options[index];

    if (!option || option.disabled) {
      return;
    }

    onChange(option.value);

    setActiveIndex(index);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    if (disabled) {
      return;
    }

    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();

        if (!open) {
          openList();
        } else {
          setActiveIndex((currentIndex) => findEnabledIndex(currentIndex, 1));
        }

        break;
      }

      case "ArrowUp": {
        event.preventDefault();

        if (!open) {
          openList();
        } else {
          setActiveIndex((currentIndex) => findEnabledIndex(currentIndex, -1));
        }

        break;
      }

      case "Home": {
        if (!open) {
          return;
        }

        event.preventDefault();

        setActiveIndex(findEnabledIndex(-1, 1));

        break;
      }

      case "End": {
        if (!open) {
          return;
        }

        event.preventDefault();

        setActiveIndex(findEnabledIndex(0, -1));

        break;
      }

      case "Enter":
      case " ": {
        event.preventDefault();

        if (open && activeIndex >= 0) {
          selectOption(activeIndex);
        } else {
          openList();
        }

        break;
      }

      case "Escape": {
        if (!open) {
          return;
        }

        event.preventDefault();

        setOpen(false);

        break;
      }

      case "Tab": {
        setOpen(false);

        break;
      }
    }
  }

  return (
    <div className="selectCombobox" ref={rootRef}>
      <span className="selectComboboxLabel" id={labelId}>
        {label}
      </span>

      <button
        type="button"
        className={`selectComboboxTrigger ${
          open ? "selectComboboxTriggerOpen" : ""
        }`}
        role="combobox"
        aria-labelledby={labelId}
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-activedescendant={
          open && activeIndex >= 0
            ? `${listboxId}-option-${activeIndex}`
            : undefined
        }
        disabled={disabled}
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            openList();
          }
        }}
        onKeyDown={handleKeyDown}
      >
        <span
          className={
            selectedOption ? "selectComboboxValue" : "selectComboboxPlaceholder"
          }
        >
          {selectedOption?.label ?? placeholder}
        </span>

        <ChevronsUpDown size={16} aria-hidden />
      </button>

      {open ? (
        <ul
          className="selectComboboxList"
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
        >
          {options.map((option, index) => {
            const selected = option.value === value;

            const active = index === activeIndex;

            return (
              <li
                id={`${listboxId}-option-${index}`}
                className={[
                  "selectComboboxOption",
                  selected ? "selectComboboxOptionSelected" : "",
                  active ? "selectComboboxOptionActive" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                role="option"
                aria-selected={selected}
                aria-disabled={option.disabled || undefined}
                key={option.value}
                onMouseEnter={() => {
                  if (!option.disabled) {
                    setActiveIndex(index);
                  }
                }}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={() => {
                  selectOption(index);
                }}
              >
                <span className="selectComboboxOptionText">
                  <strong>{option.label}</strong>

                  {option.description ? (
                    <small>{option.description}</small>
                  ) : null}
                </span>

                {selected ? <Check size={15} aria-hidden /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
