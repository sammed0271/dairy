import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { label: "Milk Collection", path: "/reports/daily" },
  { label: "Cow / Buffalo Yield", path: "/reports/milk-yield" },
  { label: "Billing", path: "/reports/billing" },
  { label: "Inventory", path: "/reports/inventory" },
];

const ReportSwitcher: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const isMilkCollection =
    location.pathname.includes("/reports/daily") ||
    location.pathname.includes("/reports/monthly");

  return (
    <div className="flex flex-wrap gap-2 border-b border-[#E9E2C8] pb-3">
      {tabs.map((t) => {
        const active =
          t.label === "Milk Collection"
            ? isMilkCollection
            : pathname === t.path;

        return (
          <button
            key={t.path}
            onClick={() => navigate(t.path)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              active
                ? "bg-[#2A9D8F] text-white"
                : "bg-[#E9E2C8] text-[#5E503F] hover:bg-[#d9cfaa]"
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
};

export default ReportSwitcher;
