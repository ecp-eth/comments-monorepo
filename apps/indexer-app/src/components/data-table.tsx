import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  type Table as TableType,
  type TableState,
  useReactTable,
  type PaginationState,
  type OnChangeFn,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";

type PaginationRenderFunctionProps<TData> = {
  table: TableType<TData>;
};

type PaginationRenderFunction<TData> = (
  props: PaginationRenderFunctionProps<TData>,
) => React.ReactNode;

type BasicPaginationOptions<TData> = {
  render: PaginationRenderFunction<TData>;
  paginationRowCount: number;
  onPaginationChange: OnChangeFn<PaginationState>;
  state: PaginationState;
};

type CursorPaginationOptions<TData> = {
  render: PaginationRenderFunction<TData>;
  onPaginationChange: OnChangeFn<PaginationState>;
  state: PaginationState;
};

type PaginationOptionsFunction<TData> = () =>
  | BasicPaginationOptions<TData>
  | CursorPaginationOptions<TData>;

type DataTableProps<TData = unknown> = {
  data: TData[];
  columns: ColumnDef<TData>[];
  state?: Partial<TableState>;
  tableActions?: React.ReactNode;
  pagination?: PaginationOptionsFunction<TData>;
};

export function DataTable<TData = unknown>({
  data,
  columns,
  state,
  tableActions,
  pagination,
}: DataTableProps<TData>) {
  const paginationOptions = pagination?.();

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state,
    manualPagination: true,
    // page based pagination (basic)
    ...(paginationOptions &&
      "paginationRowCount" in paginationOptions && {
        rowCount: paginationOptions.paginationRowCount,
      }),
    // both pagination types can change the limit (pageSize)
    ...(paginationOptions &&
      "state" in paginationOptions && {
        state: {
          ...state,
          pagination: paginationOptions.state,
        },
      }),
    onPaginationChange: paginationOptions?.onPaginationChange,
  });

  return (
    <div className="flex flex-col w-full justify-start gap-6">
      <div className="flex items-center justify-between">
        {tableActions && (
          <div className="ml-auto flex items-center gap-2">{tableActions}</div>
        )}
      </div>
      <div className="overflow-hidden rounded-lg border w-full">
        <Table>
          <TableHeader className="bg-muted sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="**:data-[slot=table-cell]:first:w-8">
            {table.getRowModel().rows?.length ? (
              <>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {paginationOptions?.render({ table })}
    </div>
  );
}
