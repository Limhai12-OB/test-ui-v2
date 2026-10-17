"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";

export type WidgetId = "chart" | "health" | "aging" | "attention" | "transactions" | "quickActions";

export const WIDGETS: { id: WidgetId; label: string; managerLabel?: string }[] = [
  { id: "chart", label: "Income vs spending" },
  { id: "health", label: "Business health score", managerLabel: "Branch health score" },
  { id: "aging", label: "Accounts receivable and payable" },
  { id: "attention", label: "Needs attention", managerLabel: "Your tasks" },
  { id: "transactions", label: "Recent transactions" },
  { id: "quickActions", label: "Quick actions" },
];

/** "Customise" — choose which dashboard widgets are shown. Saved in this browser only. */
export function CustomiseDialog({
  open,
  onClose,
  hidden,
  onChange,
  isManager,
}: {
  open: boolean;
  onClose: () => void;
  hidden: WidgetId[];
  onChange: (hidden: WidgetId[]) => void;
  isManager: boolean;
}) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy="customise-title">
      <div className="flex items-start gap-3 border-b border-line px-5 py-4">
        <div className="flex-1">
          <h2 id="customise-title" className="text-base leading-6 font-semibold text-fg">
            Customise dashboard
          </h2>
          <p className="mt-0.5 text-[13px] leading-5 text-muted">Choose the cards you want to see. KPIs always stay.</p>
        </div>
        <DialogClose onClose={onClose} />
      </div>
      <fieldset className="flex flex-col px-5 py-3">
        <legend className="sr-only">Visible cards</legend>
        {WIDGETS.map((widget) => {
          const checked = !hidden.includes(widget.id);
          return (
            <label key={widget.id} className="flex cursor-pointer items-center justify-between gap-3 border-b border-line-subtle py-3 last:border-b-0">
              <span className="text-sm leading-5 text-fg">{isManager ? (widget.managerLabel ?? widget.label) : widget.label}</span>
              <input
                type="checkbox"
                role="switch"
                checked={checked}
                onChange={() =>
                  onChange(checked ? [...hidden, widget.id] : hidden.filter((id) => id !== widget.id))
                }
                className="relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-line-strong transition-colors before:absolute before:top-0.5 before:left-0.5 before:size-4 before:rounded-full before:bg-white before:shadow-xs before:transition-transform checked:bg-primary checked:before:translate-x-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
            </label>
          );
        })}
      </fieldset>
      <div className="flex justify-between gap-3 border-t border-line px-5 py-4">
        <Button variant="ghost" onClick={() => onChange([])}>
          Reset
        </Button>
        <Button onClick={onClose}>Done</Button>
      </div>
    </Dialog>
  );
}
