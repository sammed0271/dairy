// src/pages/deduction/addDeduction.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../../components/inputField";
import SelectField from "../../components/selectField";
import Loader from "../../components/loader";
// import type { DeductionCategory } from "../../types/deduction";
import type { Farmer } from "../../types/farmer";
import { getFarmers } from "../../axios/farmer_api";
import { addDeduction } from "../../axios/deduction_api";
import toast from "react-hot-toast";

const AddDeductionPage: React.FC = () => {
  const navigate = useNavigate();

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loadingFarmers, setLoadingFarmers] = useState(true);

  // Form fields
  const [date, setDate] = useState<string>(todayISO);
  const [farmerId, setFarmerId] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const [errors, setErrors] = useState<{
    date?: string;
    farmerId?: string;
    amount?: string;
  }>({});

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getFarmers();
        setFarmers(res.data);
      } catch (err) {
        console.error("Failed to load farmers:", err);
        toast.error("Failed to load farmers");
      } finally {
        setLoadingFarmers(false);
      }
    };

    load();
  }, []);

  const validate = () => {
    const next: typeof errors = {};
    const amt = parseFloat(amount);
    if (!date) next.date = "Date is required.";
    if (!farmerId) next.farmerId = "Farmer is required.";
    if (!amount || amt <= 0 || Number.isNaN(amt)) {
      next.amount = "Amount must be greater than 0.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCancel = () => {
    navigate("/deduction");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the form errors");
      return;
    }

    try {
      setSaving(true);

      await addDeduction({
        date,
        farmerId,
        category,
        amount: parseFloat(amount),
        description: description.trim() || undefined,
      });
      toast.success("Deduction added successfully");

      navigate("/deduction");
    } catch (err) {
      console.error("Failed to save deduction:", err);
      toast.error("Failed to save deduction");
    } finally {
      setSaving(false);
    }
  };

  const farmerOptions = farmers.map((f) => ({
    label: `${f.code} - ${f.name}`,
    value: f._id,
  }));

  return (
    <div className="h-full w-full overflow-auto bg-[#F8F4E3] p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md border border-[#E9E2C8] bg-white px-3 py-2 text-sm text-[#5E503F] hover:bg-[#F8F4E3]"
            >
              ← Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#5E503F]">
                Add Deduction
              </h1>
              <p className="text-sm text-[#5E503F]/70">
                Record advance, food or medical deduction for a farmer.
              </p>
            </div>
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-xl border border-[#E9E2C8] bg-white p-6 shadow-sm">
          {loadingFarmers ? (
            <div className="flex items-center justify-center py-10">
              <Loader size="md" message="Loading farmers..." />
            </div>
          ) : farmers.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-sm text-[#5E503F]/70">
              <p>No farmers found. Please add farmers first.</p>
              <button
                type="button"
                onClick={() => navigate("/farmers/add")}
                className="rounded-md bg-[#2A9D8F] px-4 py-2 text-xs font-medium text-white hover:bg-[#247B71]"
              >
                Add Farmer
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <InputField
                  label="Date"
                  type="date"
                  requiredLabel
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  error={errors.date}
                />
                <SelectField
                  label="Farmer"
                  requiredLabel
                  value={farmerId}
                  onChange={(e) => setFarmerId(e.target.value)}
                  options={[
                    { label: "Select farmer", value: "" },
                    ...farmerOptions,
                  ]}
                  error={errors.farmerId}
                />
                {/* <SelectField
                  label="Category"
                  value={category}
                  onChange={(e) =>
                    setCategory(e.target.value as DeductionCategory)
                  }
                  options={[
                    { label: "Advance", value: "Advance" },
                    { label: "Food", value: "Food" },
                    { label: "Medical", value: "Medical" },
                  ]}
                /> */}
                <InputField
                  label="Category"
                  requiredLabel
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Advance / Food / Medical / Other"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <InputField
                  label="Amount"
                  requiredLabel
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  error={errors.amount}
                  leftIcon={<span className="text-xs">₹</span>}
                />
                <InputField
                  label="Remaining Amount"
                  type="text"
                  value={
                    amount && parseFloat(amount) > 0
                      ? `₹ ${parseFloat(amount).toFixed(2)}`
                      : "₹ 0.00"
                  }
                  readOnly
                  helperText="Initially remaining = total amount. It decreases when adjusted."
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#5E503F]">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-[#E9E2C8] bg-white px-3 py-2 text-sm text-[#5E503F] outline-none focus:ring-2 focus:ring-[#2A9D8F]"
                  placeholder="Reason / details for this deduction..."
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-md border border-[#E9E2C8] bg-white px-4 py-2 text-sm text-[#5E503F] hover:bg-[#F8F4E3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-md bg-[#2A9D8F] px-5 py-2 text-sm font-medium text-white shadow hover:bg-[#247B71] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Saving..." : "Save Deduction"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddDeductionPage;
