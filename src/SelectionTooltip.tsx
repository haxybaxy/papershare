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
        left: `${selection.tooltipPosition.xPercent}%`,
        top: `${selection.tooltipPosition.yPercent}%`,
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
