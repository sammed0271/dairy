import React, { useEffect, useMemo, useState } from "react";
import { getCentres } from "../../axios/centre_api";
import { getMilkQualityAnalysisReport } from "../../axios/report_api";
import type { MilkQualityAnalysisResponse } from "../../axios/report_api";
import DataTable, { type DataTableColumn } from "../../components/dataTable";
import InputField from "../../components/inputField";
import ReportSwitcher from "../../components/ReportSwitcher";
import SelectField from "../../components/selectField";
import StatCard from "../../components/statCard";
import { getStoredUser } from "../../utils/auth";

const MilkQualityReportPage: React.FC = () => {
  const user = getStoredUser();
  const isSuperadmin = user?.role === "superadmin";
  const today = useMemo(() => new Date(), []);
  const tenDaysAgo = useMemo(() => {
    const value = new Date();
    value.setDate(value.getDate() - 9);
    return value;
  }, []);
  const formatDate = (value: Date) => value.toISOString().slice(0, 10);

  const [fromDate, setFromDate] = useState(formatDate(tenDaysAgo));
  const [toDate, setToDate] = useState(formatDate(today));
  const [centreId, setCentreId] = useState("");
  const [shift, setShift] = useState<"all" | "morning" | "evening">("all");
  const [milkType, setMilkType] = useState<"all" | "cow" | "buffalo" | "mix">("all");
  const [centres, setCentres] = useState<Array<{ _id: string; name: string; code: string }>>([]);
  const [report, setReport] = useState<MilkQualityAnalysisResponse | null>(null);
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
        const response = await getMilkQualityAnalysisReport({
          from: fromDate,
          to: toDate,
          centreId: isSuperadmin && centreId ? centreId : undefined,
          shift,
          milkType,
        });
        setReport(response.data);
      } catch (error) {
        console.error("Failed to load milk quality analysis:", error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [fromDate, toDate, centreId, shift, milkType, isSuperadmin]);

  const breakdownColumns: DataTableColumn<
    NonNullable<MilkQualityAnalysisResponse["milkTypeBreakdown"]>[number]
  >[] = [
    { id: "type", header: "Milk Type", align: "center", cell: (row) => row._id },
    {
      id: "fat",
      header: "Avg FAT",
      align: "center",
      cell: (row) => row.averageFat.toFixed(2),
    },
    {
      id: "snf",
      header: "Avg SNF",
      align: "center",
      cell: (row) => row.averageSnf.toFixed(2),
    },
    {
      id: "rate",
      header: "Avg Rate",
      align: "center",
      cell: (row) => row.averageRate.toFixed(2),
    },
    {
      id: "liters",
      header: "Liters",
      align: "center",
      cell: (row) => row.liters.toFixed(2),
    },
  ];

  const farmerColumns: DataTableColumn<
    NonNullable<MilkQualityAnalysisResponse["farmerRows"]>[number]
  >[] = [
    { id: "code", header: "Code", accessor: "farmerCode", align: "center" },
    { id: "name", header: "Farmer", accessor: "farmerName", align: "center" },
    {
      id: "fat",
      header: "Avg FAT",
      align: "center",
      cell: (row) => row.averageFat.toFixed(2),
    },
    {
      id: "snf",
      header: "Avg SNF",
      align: "center",
      cell: (row) => row.averageSnf.toFixed(2),
    },
    {
      id: "rate",
      header: "Avg Rate",
      align: "center",
      cell: (row) => row.averageRate.toFixed(2),
    },
    {
      id: "liters",
      header: "Liters",
      align: "center",
      cell: (row) => row.liters.toFixed(2),
    },
  ];

  return (
    <div className="h-full w-full overflow-auto bg-[#F8F4E3] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#5E503F]">
              Milk Quality Analysis
            </h1>
            <p className="text-sm text-[#5E503F]/70">
              FAT, SNF, rate, and quality trends by milk type and farmer.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
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
              label="Shift"
              value={shift}
              onChange={(e) =>
                setShift(e.target.value as "all" | "morning" | "evening")
              }
              options={[
                { label: "All shifts", value: "all" },
                { label: "Morning", value: "morning" },
                { label: "Evening", value: "evening" },
              ]}
            />
            <SelectField
              label="Milk Type"
              value={milkType}
              onChange={(e) =>
                setMilkType(e.target.value as "all" | "cow" | "buffalo" | "mix")
              }
              options={[
                { label: "All types", value: "all" },
                { label: "Cow", value: "cow" },
                { label: "Buffalo", value: "buffalo" },
                { label: "Mix", value: "mix" },
              ]}
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
            title="Entries"
            value={report?.summary.entryCount ?? 0}
            subtitle="Milk samples in range"
          />
          <StatCard
            title="Average FAT"
            value={(report?.summary.averageFat ?? 0).toFixed(2)}
            subtitle="Across filtered entries"
            variant="orange"
          />
          <StatCard
            title="Average SNF"
            value={(report?.summary.averageSnf ?? 0).toFixed(2)}
            subtitle="Across filtered entries"
            variant="blue"
          />
          <StatCard
            title="Average Rate"
            value={(report?.summary.averageRate ?? 0).toFixed(2)}
            subtitle="Applied rate quality"
            variant="green"
          />
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-[#5E503F]/60">
            Loading milk quality analysis...
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-[#5E503F]">
                  Milk Type Breakdown
                </h2>
              </div>
              <DataTable
                data={report?.milkTypeBreakdown ?? []}
                columns={breakdownColumns}
                keyField="_id"
                dense
                striped
                emptyMessage="No quality breakdown found for the selected filters."
              />
            </div>

            <div className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-[#5E503F]">
                  Farmer Quality Breakdown
                </h2>
              </div>
              <DataTable
                data={report?.farmerRows ?? []}
                columns={farmerColumns}
                keyField="farmerId"
                dense
                striped
                emptyMessage="No farmer quality data found for the selected filters."
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MilkQualityReportPage;
