// src/components/dataTable.tsx
import React from "react";
import Loader from "./loader";
import clsx from "clsx";

export interface DataTableColumn<T> {
  /** Column id (React key only) */
  id: string;
  /** Header label */
  header: string;
  /** Optional accessor key for simple value columns */
  accessor?: keyof T;
  /** Custom cell renderer */
  cell?: (row: T, rowIndex: number) => React.ReactNode;
  /** Additional classes for <td> */
  className?: string;
  /** Optional header alignment: left / center / right */
  align?: "left" | "center" | "right";
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  keyField?: keyof T;
  loading?: boolean;
  emptyMessage?: string;
  striped?: boolean;
  dense?: boolean;
  onRowClick?: (row: T) => void;
  className?: string;
}

/**
 * Generic, lightweight table wrapper with loading & empty states.
 */
export function DataTable<T>({
  data,
  columns,
  keyField,
  loading,
  emptyMessage = "No records found.",
  striped = true,
  dense = false,
  onRowClick,
  className,
}: DataTableProps<T>) {
  const getRowKey = (row: T, index: number) => {
    if (keyField && row && row[keyField] != null) {
      return String(row[keyField]);
    }

    return index.toString();
  };

  const cellPadding = dense ? "px-3 py-2" : "px-4 py-3";

  return (
    <div
      className={clsx(
        "rounded-lg border border-[#E9E2C8] bg-white shadow-sm",
        className,
      )}
    >
      {/* ================= DESKTOP TABLE VIEW ================= */}
      <div className="w-full overflow-x-auto scroll-smooth">
        <table className="w-full text-sm"><thead className="bg-[#F8F4E3]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.id}
                  className={clsx(
                    cellPadding,
                    "text-xs font-semibold uppercase tracking-wide text-[#5E503F]",
                    col.align === "center" && "text-center",
                    col.align === "right" && "text-right",
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead><tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={clsx(cellPadding, "text-center")}
                >
                  <div className="flex items-center justify-center gap-2 text-[#5E503F]/70">
                    <Loader size="sm" />
                    <span className="text-xs">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={clsx(
                    cellPadding,
                    "text-center text-xs text-[#5E503F]/70",
                  )}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr
                  key={getRowKey(row, rowIndex)}
                  className={clsx(
                    striped && rowIndex % 2 === 1 ? "bg-[#FDFCF8]" : "bg-white",
                    onRowClick && "cursor-pointer hover:bg-[#F8F4E3]/70",
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => {
                    const content =
                      col.cell != null
                        ? col.cell(row, rowIndex)
                        : col.accessor
                          ? String(row[col.accessor] ?? "")
                          : null;

                    return (
                      <td
                        key={col.id}
                        className={clsx(
                          cellPadding,
                          "text-[#5E503F]",
                          col.align === "center" && "text-center",
                          col.align === "right" && "text-right",
                          col.className,
                        )}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody></table>
      </div>
    </div>
  );
}

export default DataTable;
