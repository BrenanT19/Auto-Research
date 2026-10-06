import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";

const ALL_GENERATIONS = "all-generations";

type GenerationSelectProps = {
  value: string;
  options: Array<{ id: number | string; name: string }>;
  disabled: boolean;
  describedBy?: string;
  emptyLabel?: string;
  onChange: (generationId: string) => void;
};

/** Keep the popup in the page DOM so option clicks work in embedded previews. */
export function GenerationSelect({
  value,
  options,
  disabled,
  describedBy,
  emptyLabel,
  onChange,
}: GenerationSelectProps) {
  return (
    <Select.Root
      value={value || ALL_GENERATIONS}
      disabled={disabled}
      onValueChange={(next) => onChange(next === ALL_GENERATIONS ? "" : next)}
    >
      <Select.Trigger
        id="browse-generation"
        aria-label="Generation"
        aria-describedby={describedBy}
        className="browse-generation-trigger"
        data-testid="browse-generation-trigger"
      >
        <Select.Value />
        <Select.Icon asChild><ChevronDown size={14} /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          className="browse-generation-menu"
          position="popper"
          sideOffset={4}
          collisionPadding={8}
        >
          <Select.Viewport>
            <GenerationItem value={ALL_GENERATIONS}>{emptyLabel || "All generations / refreshes"}</GenerationItem>
            {options.map((option) => (
              <GenerationItem key={option.id} value={String(option.id)}>
                {option.name}
              </GenerationItem>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function GenerationItem({ value, children }: { value: string; children: string }) {
  return (
    <Select.Item value={value} className="browse-generation-option">
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator><Check size={12} /></Select.ItemIndicator>
    </Select.Item>
  );
}