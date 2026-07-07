import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * SPRINT M1 — Unified responsive table.
 *
 * On desktop/tablet: renders a real `<table>` with sticky header.
 * On mobile:        renders a stack of cards using the same column metadata.
 *
 * Business logic and data flow live outside — the caller passes rows + columns.
 */
export interface ResponsiveColumn<T> {
  key: string;
  header: React.ReactNode;
  /** Cell renderer. Return React node for a row's value. */
  cell: (row: T, index: number) => React.ReactNode;
  /** Hide on mobile card (default: false — all data preserved). */
  hideOnMobile?: boolean;
  /** Show as the card title on mobile. Only one column should be marked. */
  primary?: boolean;
  className?: string;
  align?: "left" | "right" | "center";
}

interface ResponsiveTableProps<T> {
  columns: ResponsiveColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  onRowClick?: (row: T, index: number) => void;
  empty?: React.ReactNode;
  className?: string;
  dense?: boolean;
}

export function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
  className,
  dense,
}: ResponsiveTableProps<T>) {
  const isMobile = useIsMobile();

  if (!rows.length && empty) {
    return <div className={className}>{empty}</div>;
  }

  if (isMobile) {
    const primary = columns.find((c) => c.primary) ?? columns[0];
    const rest = columns.filter((c) => c !== primary && !c.hideOnMobile);
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {rows.map((row, i) => (
          <button
            key={rowKey(row, i)}
            type="button"
            onClick={onRowClick ? () => onRowClick(row, i) : undefined}
            className={cn(
              "card-refined text-left w-full p-3 flex flex-col gap-1.5",
              onRowClick && "cursor-pointer active:scale-[0.99] transition-transform"
            )}
            style={{ minHeight: "var(--touch-min)" }}
          >
            {primary && (
              <div className="text-fs-md font-medium text-foreground">
                {primary.cell(row, i)}
              </div>
            )}
            {rest.length > 0 && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
                {rest.map((col) => (
                  <div key={col.key} className="flex flex-col min-w-0">
                    <span className="text-fs-xs text-muted-foreground truncate">
                      {col.header}
                    </span>
                    <span className="text-fs-sm text-foreground truncate">
                      {col.cell(row, i)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="table-refined w-full border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "text-fs-xs uppercase tracking-wide px-3 py-2 text-left",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              onClick={onRowClick ? () => onRowClick(row, i) : undefined}
              className={cn(onRowClick && "cursor-pointer")}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "px-3 border-b border-border/50 text-fs-sm text-foreground",
                    dense ? "py-1.5" : "py-2.5",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.className
                  )}
                >
                  {col.cell(row, i)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ResponsiveTable;
