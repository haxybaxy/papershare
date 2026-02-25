import type { TextSelection } from "./types";

interface SelectionTooltipProps {
  selection: TextSelection;
  onComment: () => void;
}

export function SelectionTooltip({ selection, onComment }: SelectionTooltipProps) {
  return (
    <div
      className="selection-tooltip"
      style={{
        top: selection.tooltipPosition.top,
        left: selection.tooltipPosition.left,
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onComment();
      }}
    >
      Comment on selection
    </div>
  );
}
