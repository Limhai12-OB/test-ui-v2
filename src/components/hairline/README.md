# Hairline UI components

Copied from the Hairline UI registry (https://hairlineui.com/ui, MIT licence, see the header of each file).

Changes made when copying:

- shadcn colour classes were renamed to the LuyFlow tokens (`text-muted-foreground` → `text-muted`, `bg-background` → `bg-surface`, `border-border` → `border-line`, `bg-muted`/`bg-accent` → `bg-muted-bg`, `text-foreground` → `text-fg`, …). The raw CSS variables they read (`--background`, `--border`, `--primary`, `--chart-1` …) are aliased in `src/app/globals.css`, together with their keyframes.
- `"use no memo"` opts them out of the React Compiler, and the folder is excluded from ESLint: they read refs during render, which the compiler's rules do not allow.

To update one, fetch `https://hairlineui.com/r/<name>.json` and repeat the class renames.

## Where each component is used

| Component | Used in |
| --- | --- |
| command-palette | Top-bar search (⌘K) — `shell/app-search.tsx` |
| theme-toggle | Top bar |
| toast-stack | Every toast (`useToast()` in `ui/overlay.tsx`) |
| notification-inbox | Top-bar bell — `notifications/bell.tsx` |
| number-roll | KPI and figure cards (dashboard, reports, forecasting), chart readouts |
| revenue-chart | Dashboard income vs spending; Monthly Reports trend charts |
| earnings-chart / area-chart / combo-chart | Forecasting revenue, expenses by category, reliability backtests |
| sparkline / stats-band / stepper-input | Forecasting cards, runway figures, what-if inputs |
| prompt-composer, thinking-trace, streaming-answer, chat-notice | AI Advisor composer, working steps, streamed answers, answer actions, follow-ups, error state |
| task-progress | Monthly report generation |
| plan / hold-to-confirm | Data Import reading step / Undo import |
| filter-bar, date-range-picker | Financial Records → Transactions |
| combobox | Invoice editor customer picker |
| status-button | Settings → Save changes |
| faq-accordion | Help |
