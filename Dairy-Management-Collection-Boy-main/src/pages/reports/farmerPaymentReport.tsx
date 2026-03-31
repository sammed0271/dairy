import React, { useEffect, useMemo, useState } from "react";
import { getCentres } from "../../axios/centre_api";
import { getFarmerPaymentReport } from "../../axios/report_api";
import type { FarmerPaymentReportResponse } from "../../axios/report_api";
import DataTable, { type DataTableColumn } from "../../components/dataTable";
import InputField from "../../components/inputField";
import ReportSwitcher from "../../components/ReportSwitcher";
import SelectField from "../../components/selectField";
import StatCard from "../../components/statCard";
import { getStoredUser } from "../../utils/auth";

const FarmerPaymentReportPage: React.FC = () => {
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
  const [centres, setCentres] = useState<Array<{ _id: string; name: string; code: string }>>([]);
  const [report, setReport] = useState<FarmerPaymentReportResponse | null>(null);
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
        const response = await getFarmerPaymentReport(fromDate, toDate, {
          centreId: isSuperadmin && centreId ? centreId : undefined,
        });
        setReport(response.data);
      } catch (error) {
        console.error("Failed to load farmer payment report:", error);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [fromDate, toDate, centreId, isSuperadmin]);

  const columns: DataTableColumn<FarmerPaymentReportResponse["rows"][number]>[] = [
    { id: "code", header: "Code", accessor: "farmerCode", align: "center" },
    { id: "name", header: "Farmer", accessor: "farmerName", align: "center" },
    { id: "mobile", header: "Mobile", accessor: "mobile", align: "center" },
    {
      id: "period",
      header: "Period",
      align: "center",
      cell: (row) =>
        `${String(row.periodFrom).slice(0, 10)} to ${String(row.periodTo).slice(0, 10)}`,
    },
    {
      id: "net",
      header: "Net Payable",
      align: "center",
      cell: (row) => row.netPayable.toFixed(2),
    },
    {
      id: "paid",
      header: "Paid",
      align: "center",
      cell: (row) => row.totalPaidAmount.toFixed(2),
    },
    {
      id: "pending",
      header: "Pending",
      align: "center",
      cell: (row) => row.pendingAmount.toFixed(2),
    },
    {
      id: "status",
      header: "Bill Status",
      align: "center",
      accessor: "billStatus",
    },
  ];

  return (
    <div className="h-full w-full overflow-auto bg-[#F8F4E3] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#5E503F]">
              Farmer Payment Report
            </h1>
            <p className="text-sm text-[#5E503F]/70">
              Bill, payment, and pending balances by farmer.
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
            title="Bills"
            value={report?.summary.billCount ?? 0}
            subtitle="Included in range"
          />
          <StatCard
            title="Net Payable"
            value={(report?.summary.netPayable ?? 0).toFixed(2)}
            subtitle="Total billed value"
            variant="blue"
          />
          <StatCard
            title="Paid Amount"
            value={(report?.summary.totalPaidAmount ?? 0).toFixed(2)}
            subtitle="Recorded payouts"
            variant="green"
          />
          <StatCard
            title="Pending Amount"
            value={(report?.summary.pendingAmount ?? 0).toFixed(2)}
            subtitle="Still outstanding"
            variant="orange"
          />
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-[#5E503F]/60">
            Loading farmer payment report...
          </div>
        ) : (
          <DataTable
            data={report?.rows ?? []}
            columns={columns}
            keyField="billId"
            dense
            striped
            emptyMessage="No farmer payment data found for the selected range."
          />
        )}
      </div>
    </div>
  );
};

export default FarmerPaymentReportPage;
