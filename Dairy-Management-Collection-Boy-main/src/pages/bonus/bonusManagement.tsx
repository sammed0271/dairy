// src/pages/bonus/bonusManagement.tsx
import React, { useEffect, useMemo, useState } from "react";
import InputField from "../../components/inputField";
import SelectField from "../../components/selectField";
import DataTable, { type DataTableColumn } from "../../components/dataTable";
import StatCard from "../../components/statCard";
import ConfirmModal from "../../components/confirmModal";
import Loader from "../../components/loader";
import type { BonusRule, BonusType, Bonus } from "../../types/bonus";

import type { Farmer } from "../../types/farmer";

import { getFarmers } from "../../axios/farmer_api";
import { addBonus, getBonus, previewBonus } from "../../axios/bonus_api";
import toast from "react-hot-toast";

const BONUS_RULES_KEY = "dairy_bonusRules";

type DateFilterMode = "thisMonth" | "custom";

interface CalculatedBonusRow {
  farmerId: string;
  farmerCode: string;
  farmerName: string;
  liters: number;
  amount: number;
  bonus: number;
}

// ---------- storage helpers (only for rules + collections) ----------
function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function saveJSON<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data));
}

// ---------- main component ----------
const BonusManagementPage: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const todayISO = useMemo(() => today.toISOString().slice(0, 10), [today]);

  const firstOfMonthISO = useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    return d.toISOString().slice(0, 10);
  }, [today]);

  // Data
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [rules, setRules] = useState<BonusRule[]>([]);
  const [payments, setPayments] = useState<Bonus[]>([]);

  // Bonus calculation
  const [dateMode, setDateMode] = useState<DateFilterMode>("thisMonth");
  const [periodFrom, setPeriodFrom] = useState<string>(firstOfMonthISO);
  const [periodTo, setPeriodTo] = useState<string>(todayISO);
  const [selectedRuleId, setSelectedRuleId] = useState<string>("");

  const [calculating, setCalculating] = useState(false);
  const [calculatedRows, setCalculatedRows] = useState<CalculatedBonusRow[]>(
    [],
  );
  const [calculatedTotalBonus, setCalculatedTotalBonus] = useState<number>(0);
  const [saveLoading, setSaveLoading] = useState(false);

  // Rule modal
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<BonusRule | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [ruleType, setRuleType] = useState<BonusType>("Percentage");
  const [ruleValue, setRuleValue] = useState<string>("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [ruleActive, setRuleActive] = useState(true);
  const [ruleErrors, setRuleErrors] = useState<{
    name?: string;
    value?: string;
  }>({});
  const [rulePerAmount, setRulePerAmount] = useState<string>("");

  // Delete rule confirm
  const [deleteRuleTarget, setDeleteRuleTarget] = useState<BonusRule | null>(
    null,
  );

  // ---------------- BACKEND LOADERS ----------------

  const loadFarmersFromBackend = async () => {
    try {
      const res = await getFarmers();
      setFarmers(res.data);
    } catch (error) {
      console.error("Error fetching farmers:", error);
    }
  };

  const loadBonusPaymentsFromBackend = async () => {
    try {
      const res = await getBonus();
      setPayments(res.data);
    } catch (error) {
      console.error("Error fetching bonus payments:", error);
    }
  };

  // ---------- load data on mount ----------
  useEffect(() => {
    // Load rules from localStorage (backend not available for rules)
    let r = loadJSON<BonusRule[]>(BONUS_RULES_KEY, []);
    if (!r || r.length === 0) {
      const nowISO = new Date().toISOString();
      r = [
        {
          _id: crypto.randomUUID ? crypto.randomUUID() : "bonus-rule-default",
          name: "2% Bonus on Milk Amount",
          type: "Percentage",
          value: 2,
          description: "Default bonus: 2% of milk amount in period",
          active: true,
          createdAt: nowISO,
          updatedAt: nowISO,
        },
      ];
      saveJSON(BONUS_RULES_KEY, r);
    }
    setRules(r);

    if (r.length > 0) {
      setSelectedRuleId(r[0]._id);
    }

    // Load backend data
    void loadFarmersFromBackend();
    void loadBonusPaymentsFromBackend();
  }, []);

  // ---------- stats ----------
  const monthBonusPaid = useMemo(() => {
    const y = today.getFullYear();
    const m = today.getMonth();
    let total = 0;

    payments.forEach((p) => {
      if (!p.createdAt) return;
      const d = new Date(p.createdAt);

      if (d.getFullYear() === y && d.getMonth() === m) {
        total += p.amount;
      }
    });

    return total;
  }, [payments, today]);

  const selectedRule = useMemo(
    () => rules.find((r) => r._id === selectedRuleId) || null,
    [rules, selectedRuleId],
  );

  // ---------- rule modal helpers ----------
  const openAddRule = () => {
    setEditingRule(null);
    setRuleName("");
    setRuleType("Percentage");
    setRuleValue("");
    setRuleDescription("");
    setRuleActive(true);
    setRuleErrors({});
    setShowRuleModal(true);
    setRulePerAmount("");
  };

  const openEditRule = (rule: BonusRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleType(rule.type);
    setRuleValue(String(rule.value));
    setRuleDescription(rule.description ?? "");
    setRuleActive(rule.active);
    setRuleErrors({});
    setShowRuleModal(true);
    setRulePerAmount(rule.perAmount ? String(rule.perAmount) : "");
  };

  const closeRuleModal = () => setShowRuleModal(false);

  const validateRule = () => {
    const next: typeof ruleErrors = {};
    if (!ruleName.trim()) next.name = "Rule name is required.";

    const v = parseFloat(ruleValue);
    if (Number.isNaN(v) || v <= 0) {
      next.value = "Enter a value greater than 0.";
    } else if (ruleType === "Percentage" && v > 100) {
      next.value = "Percentage cannot exceed 100.";
    }

    if (ruleType === "PerAmount") {
      const p = parseFloat(rulePerAmount);
      if (Number.isNaN(p) || p <= 0) {
        next.value = "Per Amount must be greater than 0.";
      }
    }

    setRuleErrors(next);
    return Object.keys(next).length === 0;
  };

  const perAmt =
    ruleType === "PerAmount" ? parseFloat(rulePerAmount) : undefined;

  const saveRule = () => {
    if (!validateRule()) return;

    const v = parseFloat(ruleValue);
    const nowISO = new Date().toISOString();

    if (editingRule) {
      const updated: BonusRule = {
        ...editingRule,
        name: ruleName.trim(),
        type: ruleType,
        value: v,
        perAmount: perAmt,

        description: ruleDescription.trim() || undefined,
        active: ruleActive,
        updatedAt: nowISO,
      };

      const list = rules.map((r) => (r._id === updated._id ? updated : r));
      setRules(list);
      saveJSON(BONUS_RULES_KEY, list);
      setSelectedRuleId(updated._id);
    } else {
      const newRule: BonusRule = {
        _id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        name: ruleName.trim(),
        type: ruleType,
        value: v,
        perAmount: ruleType === "PerAmount" ? perAmt : undefined,
        description: ruleDescription.trim() || undefined,
        active: ruleActive,
        createdAt: nowISO,
        updatedAt: nowISO,
      };

      const list = [...rules, newRule];
      setRules(list);
      saveJSON(BONUS_RULES_KEY, list);
      setSelectedRuleId(newRule._id);
    }
    toast.success(editingRule ? "Bonus rule updated" : "Bonus rule added");

    setShowRuleModal(false);
  };

  const deleteRule = () => {
    if (!deleteRuleTarget) return;

    const list = rules.filter((r) => r._id !== deleteRuleTarget._id);
    setRules(list);
    saveJSON(BONUS_RULES_KEY, list);

    if (selectedRuleId === deleteRuleTarget._id && list.length) {
      setSelectedRuleId(list[0]._id);
    }

    setDeleteRuleTarget(null);
    toast.success("Bonus rule deleted");
  };

  // ---------- bonus calculation ----------
  const handleDateModeChange = (mode: DateFilterMode) => {
    setDateMode(mode);
    if (mode === "thisMonth") {
      setPeriodFrom(firstOfMonthISO);
      setPeriodTo(todayISO);
    }
  };

  const calculateBonus = async () => {
    if (!selectedRule) {
      toast.error("Please select a bonus rule.");
      return;
    }

    try {
      setCalculating(true);

      const res = await previewBonus({
        periodFrom,
        periodTo,
        rule: {
          type: selectedRule.type,
          value: selectedRule.value,
          perAmount: selectedRule.perAmount,
        },
      });

      setCalculatedRows(res.data);
      toast.success("Bonus calculated successfully");

      const total = res.data.reduce(
        (sum: number, r: CalculatedBonusRow) => sum + r.bonus,
        0,
      );

      setCalculatedTotalBonus(total);
    } catch (err) {
      console.error("calculateBonus error:", err);
      toast.error("Failed to calculate bonus");
    } finally {
      setCalculating(false);
    }
  };

  const saveDistribution = async () => {
    if (!selectedRule) {
      toast.error("Please select a bonus rule.");
      return;
    }

    if (calculatedRows.length === 0) {
      toast.error("No bonus calculated to save.");
      return;
    }

    try {
      setSaveLoading(true);

      for (const r of calculatedRows) {
        await addBonus({
          farmerId: r.farmerId,
          amount: r.bonus,
          reason: selectedRule.name,
          date: periodTo,
        });
      }

      toast.success("Bonus distribution saved successfully!");
      setCalculatedRows([]);
      setCalculatedTotalBonus(0);
      await loadBonusPaymentsFromBackend();
    } catch (error) {
      console.error("Error saving bonus distribution:", error);
      toast.error("Failed to save bonus distribution.");
    } finally {
      setSaveLoading(false);
    }
  };

  const bonusColumns: DataTableColumn<CalculatedBonusRow>[] = [
    {
      id: "code",
      header: "Farmer Code",
      accessor: "farmerCode",
      align: "center",
    },
    {
      id: "name",
      header: "Farmer Name",
      accessor: "farmerName",
      align: "center",
    },
    {
      id: "liters",
      header: "Liters",
      cell: (row) => row.liters.toFixed(2),
      align: "center",
    },
    {
      id: "amount",
      header: "Milk Amount",
      cell: (row) => `₹ ${row.amount.toFixed(2)}`,
      align: "center",
    },
    {
      id: "bonus",
      header: "Bonus",
      cell: (row) => `₹ ${row.bonus.toFixed(2)}`,
      align: "center",
    },
  ];

  const ruleCountActive = rules.filter((r) => r.active).length;

  return (
    <div className="h-full w-full overflow-auto bg-[#F8F4E3] p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#5E503F]">
              Bonus Management
            </h1>
            <p className="text-sm text-[#5E503F]/70">
              Configure bonus rules and distribute bonus to farmers based on
              milk collection.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddRule}
            className="rounded-md bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white shadow hover:bg-[#247B71]"
          >
            + Add Bonus Rule
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Bonus Rules"
            value={rules.length}
            subtitle="Total configured rules"
            variant="teal"
          />
          <StatCard
            title="Active Rules"
            value={ruleCountActive}
            subtitle="Available for use"
            variant="green"
          />
          <StatCard
            title="Bonus Paid (This Month)"
            value={`₹ ${monthBonusPaid.toFixed(2)}`}
            variant="orange"
            subtitle={undefined}
          />
          <StatCard
            title="Farmers"
            value={farmers.length}
            subtitle="Eligible farmers"
            variant="blue"
          />
        </div>

        {/* Rules list */}
        <div className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#5E503F]">
              Bonus Rules
            </h2>
            <span className="text-xs text-[#5E503F]/60">
              Configure how bonus is calculated.
            </span>
          </div>

          {rules.length === 0 ? (
            <div className="py-6 text-center text-sm text-[#5E503F]/60">
              No bonus rules configured yet.
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E9E2C8] bg-[#F8F4E3] px-3 py-2"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#5E503F]">
                        {rule.name}
                      </span>
                      <span
                        className={`rounded-full px-2 py-[2px] text-[10px] font-medium ${
                          rule.active
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {rule.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#5E503F]/70">
                      {rule.type === "Percentage" &&
                        `Percentage: ${rule.value}% of milk amount`}

                      {rule.type === "Fixed" &&
                        `Fixed: ₹ ${rule.value.toFixed(2)} per farmer within period`}

                      {rule.type === "PerAmount" &&
                        `₹ ${rule.value} on every ₹ ${rule.perAmount}`}

                      {rule.type === "PerLiter" && `₹ ${rule.value} per liter`}
                    </div>
                    {rule.description && (
                      <div className="text-[11px] text-[#5E503F]/70">
                        {rule.description}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => openEditRule(rule)}
                      className="rounded-md border border-[#E9E2C8] bg-white px-3 py-1 text-[#5E503F] hover:bg-[#F8F4E3]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteRuleTarget(rule)}
                      className="rounded-md border border-[#E9E2C8] bg-white px-3 py-1 text-[#E76F51] hover:bg-[#E76F51]/10"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const toggled = {
                          ...rule,
                          active: !rule.active,
                          updatedAt: new Date().toISOString(),
                        };
                        const list = rules.map((r) =>
                          r._id === toggled._id ? toggled : r,
                        );
                        setRules(list);
                        saveJSON(BONUS_RULES_KEY, list);
                      }}
                      className="rounded-md border border-[#E9E2C8] bg-white px-3 py-1 text-[#5E503F] hover:bg-[#F8F4E3]"
                    >
                      {rule.active ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bonus calculation */}
        <div className="rounded-xl border border-[#E9E2C8] bg-white p-5 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#5E503F]">
              Calculate & Distribute Bonus
            </h2>
            <span className="text-xs text-[#5E503F]/60">
              Choose a period and an active rule, then calculate.
            </span>
          </div>

          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="text-xs font-medium text-[#5E503F]">
                Date Mode
              </label>
              <div className="mt-1 flex gap-2">
                {(["thisMonth", "custom"] as DateFilterMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleDateModeChange(mode)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium ${
                      dateMode === mode
                        ? "bg-[#2A9D8F] text-white"
                        : "bg-[#E9E2C8] text-[#5E503F]"
                    }`}
                  >
                    {mode === "thisMonth" ? "This Month" : "Custom"}
                  </button>
                ))}
              </div>
            </div>

            <InputField
              label="Period From"
              type="date"
              value={periodFrom}
              onChange={(e) => setPeriodFrom(e.target.value)}
              requiredLabel
            />
            <InputField
              label="Period To"
              type="date"
              value={periodTo}
              onChange={(e) => setPeriodTo(e.target.value)}
              requiredLabel
            />

            <div className="md:col-span-2 lg:col-span-1">
              <SelectField
                label="Bonus Rule"
                requiredLabel
                value={selectedRuleId}
                onChange={(e) => setSelectedRuleId(e.target.value)}
                options={[
                  { label: "Select rule", value: "" },
                  ...rules.map((r) => ({
                    label: `${r.name} ${r.active ? "" : "(Inactive)"}`,
                    value: r._id,
                  })),
                ]}
              />
            </div>
          </div>

          {/* Action */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-xs text-[#5E503F]/60">
              Bonus is calculated from milk collection entries between selected
              dates.
            </div>
            <button
              type="button"
              onClick={calculateBonus}
              disabled={calculating}
              className="rounded-md bg-[#2A9D8F] px-4 py-2 text-sm font-medium text-white shadow hover:bg-[#247B71] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {calculating ? "Calculating..." : "Calculate Bonus"}
            </button>
          </div>

          {/* Results */}
          <div className="mt-6">
            {calculating ? (
              <div className="flex items-center justify-center py-8">
                <Loader size="md" message="Calculating bonus..." />
              </div>
            ) : calculatedRows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-[#E9E2C8] bg-[#F8F4E3] py-8 text-center text-sm text-[#5E503F]/60">
                No bonus calculated yet. Select period and rule, then click
                &quot;Calculate Bonus&quot;.
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-xs text-[#5E503F]/70">
                    Calculated for {calculatedRows.length} farmers.
                  </div>
                  <div className="text-sm font-semibold text-[#5E503F]">
                    Total Bonus:{" "}
                    <span className="text-[#2A9D8F]">
                      ₹ {calculatedTotalBonus.toFixed(2)}
                    </span>
                  </div>
                </div>

                <DataTable
                  data={calculatedRows}
                  columns={bonusColumns}
                  keyField="farmerId"
                  dense
                  striped
                />

                <div className="mt-4 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCalculatedRows([]);
                      toast("Bonus preview cleared", { icon: "🧹" });
                    }}
                    className="rounded-md border border-[#E9E2C8] bg-white px-4 py-2 text-sm text-[#5E503F] hover:bg-[#F8F4E3]"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={saveDistribution}
                    disabled={saveLoading}
                    className="rounded-md bg-[#2A9D8F] px-5 py-2 text-sm font-medium text-white shadow hover:bg-[#247B71] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saveLoading ? "Saving..." : "Save Bonus Distribution"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Rule Add/Edit Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-lg border border-[#E9E2C8] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E9E2C8] bg-[#2A9D8F] px-4 py-2">
              <span className="text-sm font-semibold text-white">
                {editingRule ? "Edit Bonus Rule" : "Add Bonus Rule"}
              </span>
              <button
                type="button"
                onClick={closeRuleModal}
                className="text-sm text-white/80 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <InputField
                label="Rule Name"
                requiredLabel
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                error={ruleErrors.name}
              />
              <div>
                <span className="text-xs font-medium text-[#5E503F]">
                  Rule Type
                </span>
                <div className="mt-1 flex gap-2">
                  {(
                    [
                      "Percentage",
                      "Fixed",
                      "PerAmount",
                      "PerLiter",
                    ] as BonusType[]
                  ).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setRuleType(t)}
                      className={`flex-1 rounded-md border px-3 py-1.5 text-xs font-medium ${
                        ruleType === t
                          ? "border-[#2A9D8F] bg-[#2A9D8F]/10 text-[#2A9D8F]"
                          : "border-[#E9E2C8] text-[#5E503F]"
                      }`}
                    >
                      {t === "Percentage"
                        ? "Percentage (%)"
                        : t === "Fixed"
                          ? "Fixed (₹)"
                          : t === "PerAmount"
                            ? "₹ Per Amount"
                            : "₹ Per Liter"}
                    </button>
                  ))}
                </div>
              </div>
              <InputField
                label={
                  ruleType === "Percentage" ? "Value (%)" : "Value (₹ flat)"
                }
                requiredLabel
                type="number"
                step="0.01"
                min="0"
                value={ruleValue}
                onChange={(e) => setRuleValue(e.target.value)}
                error={ruleErrors.value}
              />
              {ruleType === "PerAmount" && (
                <InputField
                  label="Per Amount (₹)"
                  requiredLabel
                  type="number"
                  step="1"
                  min="1"
                  value={rulePerAmount}
                  onChange={(e) => setRulePerAmount(e.target.value)}
                />
              )}
              <div>
                <label className="text-xs font-medium text-[#5E503F]">
                  Description (optional)
                </label>
                <textarea
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-md border border-[#E9E2C8] bg-white px-3 py-2 text-sm text-[#5E503F] outline-none focus:ring-2 focus:ring-[#2A9D8F]"
                  placeholder="Any notes about this rule..."
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-[#5E503F]">
                <input
                  id="rule-active"
                  type="checkbox"
                  checked={ruleActive}
                  onChange={(e) => setRuleActive(e.target.checked)}
                  className="h-3 w-3 rounded border-[#E9E2C8] text-[#2A9D8F] focus:ring-[#2A9D8F]"
                />
                <label htmlFor="rule-active">Rule is active</label>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#E9E2C8] bg-[#F8F4E3] px-4 py-2">
              <button
                type="button"
                onClick={closeRuleModal}
                className="rounded-md border border-[#E9E2C8] bg-white px-4 py-1.5 text-xs font-medium text-[#5E503F] hover:bg-[#F8F4E3]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveRule}
                className="rounded-md bg-[#2A9D8F] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#247B71]"
              >
                {editingRule ? "Save Changes" : "Add Rule"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete rule confirm */}
      <ConfirmModal
        open={!!deleteRuleTarget}
        title="Delete Bonus Rule"
        variant="danger"
        description={
          deleteRuleTarget && (
            <div className="space-y-1 text-sm">
              <p>Are you sure you want to delete this bonus rule?</p>
              <p className="text-xs text-[#5E503F]/70">
                {deleteRuleTarget.name}
              </p>
            </div>
          )
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={deleteRule}
        onCancel={() => setDeleteRuleTarget(null)}
      />
    </div>
  );
};

export default BonusManagementPage;
