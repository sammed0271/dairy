// src/pages/inventory/addInventory.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InputField from "../../components/inputField";
// import SelectField from "../../components/selectField";
import type { InventoryItem } from "../../types/inventory";
import { addInventoryItem, getInventoryItems } from "../../axios/inventory_api";
import toast from "react-hot-toast";

function generateNextCode(items: InventoryItem[]): string {
  const nums = items
    .map((i) => parseInt(i.code.replace(/^I/i, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1;
  return `I${String(next).padStart(3, "0")}`;
}

const AddInventoryPage: React.FC = () => {
  const navigate = useNavigate();

  const [code, setCode] = useState<string>("");

  const [name, setName] = useState<string>("");
  // const [category, setCategory] = useState<InventoryCategory>("Feed");
  const [category, setCategory] = useState<string>("");
  const [unit, setUnit] = useState<string>("Kg");
  const [openingStock, setOpeningStock] = useState<string>("");
  const [minStock, setMinStock] = useState<string>("0");
  const [purchaseRate, setPurchaseRate] = useState<string>("");
  const [sellingRate, setSellingRate] = useState<string>("");

  const [errors, setErrors] = useState<{
    name?: string;
    unit?: string;
  }>({});

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await getInventoryItems();
      setCode(generateNextCode(res.data));
    };
    load();
  }, []);

  const validate = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = "Item name is required.";
    if (!unit.trim()) next.unit = "Unit is required.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const resetForm = () => {
    setName("");
    setCategory("Feed");
    setUnit("Kg");
    setOpeningStock("");
    setMinStock("0");
    setPurchaseRate("");
    setSellingRate("");
    setErrors({});
    toast("Form reset");
  };

  const handleCancel = () => {
    navigate("/inventory");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setSaving(true);

      await addInventoryItem({
        name: name.trim(),
        category,
        unit: unit.trim(),
        openingStock: parseFloat(openingStock) || 0,
        minStock: parseFloat(minStock) || 0,
        purchaseRate: purchaseRate ? parseFloat(purchaseRate) : undefined,
        sellingRate: sellingRate ? parseFloat(sellingRate) : undefined,
      });
      toast.success("Inventory item added successfully");

      navigate("/inventory");
    } catch (err) {
      console.error("Failed to add inventory item:", err);
      toast.error("Failed to save inventory item");
    } finally {
      setSaving(false);
    }
  };

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
                Add Inventory Item
              </h1>
              <p className="text-sm text-[#5E503F]/70">
                Define a new item for stock tracking.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5E503F]/70">Item Code</span>
            <span className="rounded-md bg-[#2A9D8F] px-3 py-1 text-sm font-semibold text-white">
              {code || "I---"}
            </span>
          </div>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-[#E9E2C8] bg-white p-6 shadow-sm"
        >
          {/* Basic info */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#5E503F]">
              Basic Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <InputField
                label="Item Name"
                requiredLabel
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
              />
              {/* <SelectField
                label="Category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as InventoryCategory)
                }
                options={[
                  { label: "Feed", value: "Feed" },
                  { label: "Equipment", value: "Equipment" },
                  { label: "Testing", value: "Testing" },
                  { label: "Stationery", value: "Stationery" },
                  { label: "Other", value: "Other" },
                ]}
              /> */}
              <InputField
                label="Category"
                requiredLabel
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Feed / Equipment / Medicine / Testing /Stationery /Other"
                helperText="You can enter a custom category"
              />

              <InputField
                label="Unit"
                requiredLabel
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                error={errors.unit}
                helperText="Example: Kg, Ltr, Pieces"
              />
              <InputField
                label="Minimum Stock"
                type="number"
                step="0.01"
                min="0"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                helperText="Alert when stock drops below this."
              />
            </div>
          </div>

          {/* Stock / Rates */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#5E503F]">
              Opening Stock & Rates
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <InputField
                label="Opening Stock"
                type="number"
                step="0.01"
                min="0"
                value={openingStock}
                onChange={(e) => setOpeningStock(e.target.value)}
              />
              <InputField
                label="Purchase Rate (per unit)"
                type="number"
                step="0.01"
                min="0"
                value={purchaseRate}
                onChange={(e) => setPurchaseRate(e.target.value)}
                leftIcon={<span className="text-xs">₹</span>}
              />
              <InputField
                label="Selling Rate (per unit)"
                type="number"
                step="0.01"
                min="0"
                value={sellingRate}
                onChange={(e) => setSellingRate(e.target.value)}
                leftIcon={<span className="text-xs">₹</span>}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md border border-[#E9E2C8] bg-white px-4 py-2 text-sm text-[#5E503F] hover:bg-[#F8F4E3]"
            >
              Cancel
            </button>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="rounded-md border border-[#E9E2C8] bg-white px-4 py-2 text-sm text-[#5E503F] hover:bg-[#F8F4E3]"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-md bg-[#2A9D8F] px-5 py-2 text-sm font-medium text-white shadow hover:bg-[#247B71] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? "Saving..." : "Save Item"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddInventoryPage;
