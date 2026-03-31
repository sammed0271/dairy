import React, { useEffect, useMemo, useState } from "react";
import { saveAs } from "file-saver";
import { getCentres } from "../../axios/centre_api";
import { getAuditTrailReport } from "../../axios/report_api";
import type { AuditTrailReportResponse } from "../../axios/report_api";
import DataTable, { type DataTableColumn } from "../../components/dataTable";
import InputField from "../../components/inputField";
import ReportSwitcher from "../../components/ReportSwitcher";
import SelectField from "../../components/selectField";
import StatCard from "../../components/statCard";
import { getStoredUser } from "../../utils/auth";

const formatDate = (value: Date) => value.toISOString().slice(0, 10);

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const stringifyDetails = (value: Record<string, unknown>) => {
  const serialized = JSON.stringify(value ?? {});

  if (!serialized || serialized === "{}") {
    return "-";
  }

  return serialized.length > 80 ? `${serialized.slice(0, 77)}...` : serialized;
};

const AuditTrailReportPage: React.FC = () => {
  const user = getStoredUser();
  const isSuperadmin = user?.role === "superadmin";
  const today = useMemo(() => new Date(), []);
  const weekAgo = useMemo(() => {
    const value = new Date();
    value.setDate(value.getDate() - 6);
    return value;
  }, []);

  const [fromDate, setFromDate] = useState(formatDate(weekAgo));
  const [toDate, setToDate] = useState(formatDate(today));
  const [centreId, setCentreId] = useState("");
  const [action, setAction] = useState("all");
  const [entityType, setEntityType] = useState("all");
  const [centres, setCentres] = useState<Array<{ _id: string; name: string; code: string }>>([]);
  const [report, setReport] = useState<AuditTrailReportResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSuperadmin) {
      return;
    }

    getCentres()
      .then((response) => {
        setCentres(
          response.data
            .filter((centre) => centre.status === "active")
            .map((centre) => ({
              _id: centre._id,
              name: centre.name,
              code: centre.code,
            })),
        );
      })
      .catch((error) => {
        console.error("Failed to load centres:", error);
      });
  }, [isSuperadmin]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await getAuditTrailReport({
          from: fromDate,
          to: toDate,
          centreId: isSuperadmin && centreId ? centreId : undefined,
          action: action === "all" ? undefined : action,
          entityType: entityType === "all" ? undefined : entityType,
          limit: 250,
        });
        setReport(response.data);
      } catch (error) {
        console.error("Failed to load audit trail:", error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [fromDate, toDate, centreId, action, entityType, isSuperadmin]);

  const actionOptions = useMemo(() => {
    const dynamicOptions =
      report?.actionBreakdown.map((item) => ({
        label: `${item.action} (${item.count})`,
        value: item.action,
      })) ?? [];

    return [{ label: "All actions", value: "all" }, ...dynamicOptions];
  }, [report]);

  const entityOptions = useMemo(() => {
    const dynamicOptions =
      report?.entityBreakdown.map((item) => ({
        label: `${item.entityType} (${item.count})`,
        value: item.entityType,
      })) ?? [];

    return [{ label: "All entities", value: "all" }, ...dynamicOptions];
  }, [report]);

  const columns: DataTableColumn<AuditTrailReportResponse["rows"][number]>[] = [
    {
      id: "timestamp",
      header: "Timestamp",
      cell: (row) => formatDateTime(row.timestamp),
    },
    {
      id: "action",
      header: "Action",
      cell: (row) => (
        <span className="rounded-full bg-[#F8F4E3] px-2 py-1 text-xs font-medium">
          {row.action}
        </span>
      ),
    },
    {
      id: "entity",
      header: "Entity",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.entityType}</div>
          <div className="text-xs text-[#5E503F]/70">{row.entityId}</div>
        </div>
      ),
    },
    {
      id: "user",
      header: "User",
      cell: (row) => (
        <div>
          <div>{row.userId?.name ?? "System"}</div>
          <div className="text-xs text-[#5E503F]/70">
            {row.userId?.email ?? "-"}
          </div>
        </div>
      ),
    },
    {
      id: "centre",
      header: "Centre",
      cell: (row) =>
        row.centreId ? `${row.centreId.name} (${row.centreId.code})` : "-",
    },
    {
      id: "details",
      header: "Details",
      cell: (row) => (
        <span className="font-mono text-xs text-[#5E503F]/70">
          {stringifyDetails(row.details)}
        </span>
      ),
    },
  ];

  const exportCsv = () => {
    const rows = report?.rows ?? [];

    if (rows.length === 0) {
      return;
    }

    const csvRows = [
      [
        "Timestamp",
        "Action",
        "Entity Type",
        "Entity Id",
        "User",
        "Email",
        "Centre",
        "Details",
      ],
      ...rows.map((row) => [
        row.timestamp,
        row.action,
        row.entityType,
        row.entityId,
        row.userId?.name ?? "System",
        row.userId?.email ?? "",
        row.centreId ? `${row.centreId.name} (${row.centreId.code})` : "",
        JSON.stringify(row.details ?? {}),
      ]),
    ];

    const csv = csvRows
      .map((columns) =>
        columns
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    saveAs(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      `audit-trail-${fromDate}-to-${toDate}.csv`,
    );
  };

  return (
    <div className="h-full w-full overflow-auto bg-[#F8F4E3] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#5E503F]">Audit Trail</h1>
            <p className="text-sm text-[#5E503F]/70">
              Review who changed operational records across centres and modules.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportCsv}
              disabled={(report?.rows.length ?? 0) === 0}
              className="rounded-md border border-[#E9E2C8] bg-white px-3 py-2 text-sm font-medium text-[#5E503F] disabled:opacity-60"
            >
              Export CSV
            </button>
            <InputField
              type="date"
              label="From"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <InputField
              type="date"
              label="To"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
            <SelectField
              label="Action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              options={actionOptions}
            />
            <SelectField
              label="Entity"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              options={entityOptions}
            />
            {isSuperadmin && (
              <SelectField
                label="Centre"
                value={centreId}
                onChange={(e) => setCentreId(e.target.value)}
                options={[
                  { label: "All centres", value: "" },
                  ...centres.map((centre) => ({
                    label: `${centre.name} (${centre.code})`,
                    value: centre._id,
                  })),
                ]}
              />
            )}
          </div>
        </div>

        <ReportSwitcher />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Actions"
            value={report?.summary.totalActions ?? 0}
            subtitle="Visible audit events"
          />
          <StatCard
            title="Users"
            value={report?.summary.uniqueUsers ?? 0}
            subtitle="Users represented"
            variant="blue"
          />
          <StatCard
            title="Entities"
            value={report?.summary.uniqueEntities ?? 0}
            subtitle="Entity records touched"
            variant="orange"
          />
          <StatCard
            title="Latest Action"
            value={report?.summary.latestActionAt ? "Recent" : "None"}
            subtitle={formatDateTime(report?.summary.latestActionAt)}
            variant="green"
          />
        </div>

        <div className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-[#5E503F]">Audit Events</h2>
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-[#5E503F]/60">
              Loading audit trail...
            </div>
          ) : (
            <DataTable
              data={report?.rows ?? []}
              columns={columns}
              keyField="_id"
              dense
              striped
              emptyMessage="No audit records found for the selected filters."
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditTrailReportPage;
