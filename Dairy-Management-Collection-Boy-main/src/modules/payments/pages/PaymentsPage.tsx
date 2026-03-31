import React from "react";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { getBills } from "../../../axios/bill_api";
import { getCentres } from "../../../axios/centre_api";
import DataTable, { type DataTableColumn } from "../../../components/dataTable";
import Loader from "../../../components/loader";
import PayBillModal from "../../../pages/payments/payBillModal";
import type { Bill } from "../../../types/bills";
import type { CentreRecord } from "../../../types/superadmin";
import { getStoredUser } from "../../../utils/auth";
import { ChartCard, Header, Sidebar } from "../../shared/components";
import { fetchPayments } from "../api/payments";
import PaymentFilters from "../components/PaymentFilters";
import PaymentsSummary from "../components/PaymentsSummary";
import PaymentStatusBadge from "../components/PaymentStatusBadge";
import type { PaymentSummaryRecord } from "../types/payment";

const formatDateTime = (value?: string) => {
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

const formatPeriod = (
  periodFrom?: string,
  periodTo?: string,
  fallback = "-",
) => {
  if (!periodFrom || !periodTo) {
    return fallback;
  }

  return `${String(periodFrom).slice(0, 10)} to ${String(periodTo).slice(0, 10)}`;
};

const PaymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = getStoredUser();
  const isSuperadmin = user?.role === "superadmin";

  const [payments, setPayments] = React.useState<PaymentSummaryRecord[]>([]);
  const [pendingBills, setPendingBills] = React.useState<Bill[]>([]);
  const [centres, setCentres] = React.useState<CentreRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [payBillTarget, setPayBillTarget] = React.useState<Bill | null>(null);
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState("");
  const [centreId, setCentreId] = React.useState("");

  const loadPayments = React.useCallback(
    async (showLoader = true) => {
      try {
        setError(null);
        if (showLoader) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const [paymentResponse, centreResponse, billResponse] = await Promise.all([
          fetchPayments(),
          isSuperadmin ? getCentres() : Promise.resolve({ data: [] }),
          getBills(),
        ]);

        setPayments(paymentResponse.data);
        setCentres(centreResponse.data);
        setPendingBills(
          billResponse.data.filter((bill) => bill.status === "Pending"),
        );
      } catch (err) {
        const apiError = err as AxiosError<{ message?: string }>;
        setError(apiError.response?.data?.message ?? "Failed to load payments");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [isSuperadmin],
  );

  React.useEffect(() => {
    void loadPayments(true);
  }, [loadPayments]);

  const filteredPendingBills = React.useMemo(() => {
    return pendingBills.filter((bill) => {
      const term = search.trim().toLowerCase();
      const matchesSearch =
        term.length === 0 ||
        bill.farmerName.toLowerCase().includes(term) ||
        bill.farmerCode.toLowerCase().includes(term) ||
        bill.billNo.toLowerCase().includes(term);

      const matchesCentre =
        isSuperadmin && centreId ? bill.centreId?._id === centreId : true;

      return matchesSearch && matchesCentre;
    });
  }, [pendingBills, search, isSuperadmin, centreId, centres]);

  const filteredPayments = React.useMemo(() => {
    return payments.filter((payment) => {
      const matchesStatus = status ? payment.status === status : true;
      const matchesCentre =
        isSuperadmin && centreId ? payment.centreId?._id === centreId : true;

      const term = search.trim().toLowerCase();
      const matchesSearch =
        term.length === 0 ||
        payment.farmerId?.name?.toLowerCase().includes(term) ||
        payment.farmerId?.code?.toLowerCase().includes(term) ||
        payment.razorpayPayoutId?.toLowerCase().includes(term) ||
        payment.transactionId?.toLowerCase().includes(term);

      return Boolean(matchesStatus && matchesCentre && matchesSearch);
    });
  }, [payments, status, centreId, isSuperadmin, search]);

  const pendingBillColumns: DataTableColumn<Bill>[] = [
    {
      id: "billNo",
      header: "Bill",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.billNo}</div>
          <div className="text-xs text-[#5E503F]/70">{row.farmerCode}</div>
        </div>
      ),
    },
    {
      id: "farmer",
      header: "Farmer",
      cell: (row) => row.farmerName,
    },
    {
      id: "period",
      header: "Period",
      cell: (row) => formatPeriod(row.periodFrom, row.periodTo),
    },
    {
      id: "amount",
      header: "Net Payable",
      align: "right",
      cell: (row) => `Rs ${(row.netAmount ?? 0).toFixed(2)}`,
    },
    {
      id: "actions",
      header: "Actions",
      align: "center",
      cell: (row) => (
        <button
          type="button"
          onClick={() => setPayBillTarget(row)}
          className="rounded-md bg-[#2A9D8F] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#247B71]"
        >
          Initiate payout
        </button>
      ),
    },
  ];

  const columns: DataTableColumn<PaymentSummaryRecord>[] = [
    {
      id: "farmer",
      header: "Farmer",
      cell: (row) => (
        <div>
          <div className="font-medium">{row.farmerId?.name ?? "Unknown farmer"}</div>
          <div className="text-xs text-[#5E503F]/70">
            {row.farmerId?.code ?? "No code"}
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
      id: "period",
      header: "Bill Period",
      cell: (row) =>
        formatPeriod(row.billId?.periodFrom, row.billId?.periodTo, "Manual"),
    },
    {
      id: "amount",
      header: "Amount",
      align: "right",
      cell: (row) => `Rs ${(row.amount ?? 0).toFixed(2)}`,
    },
    {
      id: "status",
      header: "Status",
      align: "center",
      cell: (row) => <PaymentStatusBadge status={row.status} />,
    },
    {
      id: "reference",
      header: "Reference",
      cell: (row) => (
        <div className="text-xs leading-5">
          <div>{row.razorpayPayoutId ?? row.transactionId ?? "-"}</div>
          <div className="text-[#5E503F]/60">
            {row.accountHolderName ?? "Bank details not captured"}
          </div>
        </div>
      ),
    },
    {
      id: "createdAt",
      header: "Created",
      cell: (row) => formatDateTime(row.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <Header
        title="Payments"
        subtitle="Track payout attempts, webhook results, and centre-wise settlement history."
        actions={
          <>
            <button
              type="button"
              onClick={() => void loadPayments(false)}
              disabled={refreshing}
              className="rounded-md border border-[#E9E2C8] bg-white px-4 py-2 text-sm font-medium text-[#5E503F] hover:bg-[#F8F4E3] disabled:opacity-70"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/bills")}
              className="rounded-md bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#247B71]"
            >
              Review Bills
            </button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Sidebar
          title="Filters"
          description="Narrow payment history by farmer, payout state, and centre."
          footer={
            <div className="text-xs text-[#5E503F]/60">
              Payouts can start here now, while Bills still remains available for
              period review and reconciliation.
            </div>
          }
        >
          <PaymentFilters
            search={search}
            status={status}
            centreId={centreId}
            isSuperadmin={isSuperadmin}
            centres={centres.map((centre) => ({
              _id: centre._id,
              name: centre.name,
              code: centre.code,
            }))}
            onSearchChange={setSearch}
            onStatusChange={setStatus}
            onCentreChange={setCentreId}
            onReset={() => {
              setSearch("");
              setStatus("");
              setCentreId("");
            }}
          />
        </Sidebar>

        <div className="space-y-6">
          <PaymentsSummary payments={filteredPayments} />

          <ChartCard
            title="Pending Bill Payouts"
            subtitle="Use the standalone Payments module to initiate farmer payouts without returning to Bills."
            action={
              <div className="rounded-full bg-[#F8F4E3] px-3 py-1 text-xs font-medium text-[#5E503F]">
                {filteredPendingBills.length} pending bills
              </div>
            }
          >
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader size="md" message="Loading pending bills..." />
              </div>
            ) : (
              <DataTable
                data={filteredPendingBills}
                columns={pendingBillColumns}
                keyField="_id"
                emptyMessage="No pending bills are ready for payout."
                dense
              />
            )}
          </ChartCard>

          <ChartCard
            title="Payment History"
            subtitle="Recent payout records returned by the backend payment ledger."
            action={
              <div className="rounded-full bg-[#F8F4E3] px-3 py-1 text-xs font-medium text-[#5E503F]">
                {filteredPayments.length} records
              </div>
            }
          >
            {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader size="md" message="Loading payments..." />
              </div>
            ) : (
              <DataTable
                data={filteredPayments}
                columns={columns}
                keyField="_id"
                emptyMessage="No payment records match the current filters."
                dense
              />
            )}
          </ChartCard>
        </div>
      </div>

      {payBillTarget && (
        <PayBillModal
          billId={payBillTarget._id}
          farmerName={payBillTarget.farmerName}
          amount={payBillTarget.netAmount}
          onClose={() => setPayBillTarget(null)}
          onSuccess={() => void loadPayments(false)}
        />
      )}
    </div>
  );
};

export default PaymentsPage;
