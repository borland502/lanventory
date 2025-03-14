"use client";
import { networkScan } from "@/actions/probes/nmap";
import { NowSchema } from "@/db/schema";

import {
  ColumnDef,
  AccessorFn,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { selectAllHosts } from "../services/host.data-service";
import React from "react";
import ReactDOM from "react-dom/client";

import "bootstrap/dist/css/bootstrap.min.css";

import { Table as BTable } from "react-bootstrap";

const columns: ColumnDef<NowSchema>[] = [
  {
    header: "NMAP Scan Results",
    footer: (props) => props.column.id,
    columns: [
      {
        accessorKey: "id",
        header: () => <span>ID</span>,
      },
      {
        accessorKey: "name",
        header: () => <span>Name</span>,
      },
      {
        accessorKey: "host_name",
        header: () => <span>Host Name</span>,
      },
      {
        accessorKey: "ip",
        header: () => <span>IP</span>,
      },
      {
        accessorKey: "mac",
        header: () => <span>MAC</span>,
      },
      {
        accessorKey: "hw",
        header: () => <span>HW</span>,
      },
      {
        accessorKey: "date",
        header: () => <span>Date</span>,
      },
      {
        accessorKey: "known",
        header: () => <span>Known</span>,
      },
      {
        accessorKey: "now",
        header: () => <span>Now</span>,
      },
    ],
  },
];

export default function DashboardPage() {
  const [data, setData] = React.useState<NowSchema[]>([]);
  React.useEffect(() => {
    selectAllHosts().then(setData);
  }, []);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div>
      <h1>Dashboard</h1>

      <form>
        <input type="text" name="ipRange" placeholder="IP Range" />
        <input
          type="text"
          name="outputFilename"
          placeholder="Output Filename"
        />
        <button
          type="submit"
          formAction={async (formData: FormData) => {
            const ipRange = formData.get("ipRange");
            const outputFilename = formData.get("outputFilename");
            if (
              typeof ipRange !== "string" ||
              typeof outputFilename !== "string"
            )
              return;
            await networkScan(ipRange, outputFilename);
          }}
        >
          Network Scan
        </button>
      </form>
      <div>
        <BTable striped bordered hover responsive size="lg">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </BTable>
      </div>
    </div>
  );
}
