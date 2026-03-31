import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { getCentres } from "../../axios/centre_api";
import InputField from "../../components/inputField";
import SelectField from "../../components/selectField";
import { ROUTES } from "../../constants/routes";
import { useFarmerContext } from "../../context/FarmerContext";
import type { MilkType, MilkTypeUI } from "../../types/farmer";
import { getStoredUser } from "../../utils/auth";

const AddFarmerPage: React.FC = () => {
  const navigate = useNavigate();
  const { addFarmer } = useFarmerContext();
  const user = getStoredUser();
  const isSuperadmin = user?.role === "superadmin";

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [milkType, setMilkType] = useState<MilkType[]>(["cow"]);
  const [address, setAddress] = useState("");
  const [centreId, setCentreId] = useState("");
  const [centres, setCentres] = useState<
    Array<{ _id: string; name: string; code: string; status: string }>
  >([]);
  const [errors, setErrors] = useState<{
    name?: string;
    mobile?: string;
  }>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSuperadmin) {
      return;
    }

    getCentres()
      .then((response) => {
        setCentres(response.data.filter((centre) => centre.status === "active"));
      })
      .catch((error) => {
        console.error("Failed to load centres:", error);
      });
  }, [isSuperadmin]);

  const validate = () => {
    if (milkType.length === 0) {
      toast.error("Select at least one milk type");
      return false;
    }

    if (isSuperadmin && !centreId) {
      toast.error("Select a collection centre");
      return false;
    }

    const next: typeof errors = {};
    if (!name.trim()) {
      next.name = "Farmer name is required.";
    }

    if (!mobile.trim()) {
      next.mobile = "Mobile number is required.";
    } else if (!/^\d{10}$/.test(mobile.trim())) {
      next.mobile = "Enter a valid 10-digit mobile.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleCancel = () => {
    navigate(ROUTES.farmers.list.path);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Please fix the form errors");
      return;
    }

    try {
      setSaving(true);

      await addFarmer({
        name,
        mobile,
        milkType,
        address,
        centreId: isSuperadmin ? centreId : undefined,
      });

      toast.success("Farmer added successfully");
      navigate(ROUTES.farmers.list.path);
    } catch (error) {
      console.error("Error adding farmer:", error);
      toast.error("Failed to add farmer. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setName("");
    setMobile("");
    setMilkType(["cow"]);
    setAddress("");
    setCentreId("");
    setErrors({});
  };

  const toggleMilkType = (type: MilkTypeUI) => {
    setMilkType((prev) => {
      if (type === "both") {
        if (prev.includes("cow") && prev.includes("buffalo")) {
          return [];
        }
        return ["cow", "buffalo"];
      }

      if (type === "mix") {
        if (prev.includes("mix")) {
          return prev.filter((value) => value !== "mix");
        }
        return ["mix"];
      }

      let updated = prev.includes(type)
        ? prev.filter((value) => value !== type)
        : [...prev, type];

      updated = updated.filter((value) => value !== "mix");
      return updated;
    });
  };

  return (
    <div className="h-full w-full overflow-auto bg-[#F8F4E3] p-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-md border border-[#E9E2C8] bg-white px-3 py-2 text-sm text-[#5E503F] hover:bg-[#F8F4E3]"
            >
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#5E503F]">
                Add New Farmer
              </h1>
              <p className="text-sm text-[#5E503F]/70">
                Register a new farmer in the dairy system.
              </p>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-[#E9E2C8] bg-white p-6 shadow-sm"
        >
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-[#5E503F]">
              Basic Information
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {isSuperadmin && (
                <SelectField
                  label="Collection Centre"
                  value={centreId}
                  onChange={(e) => setCentreId(e.target.value)}
                  options={[
                    { label: "Select centre", value: "" },
                    ...centres.map((centre) => ({
                      label: `${centre.name} (${centre.code})`,
                      value: centre._id,
                    })),
                  ]}
                />
              )}

              <InputField
                label="Farmer Name"
                requiredLabel
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={errors.name}
              />

              <div>
                <label className="text-xs font-medium text-[#5E503F]">
                  Mobile <span className="text-red-500">*</span>
                </label>
                <div className="mt-1 flex rounded-md border border-[#E9E2C8] bg-white focus-within:ring-2 focus-within:ring-[#2A9D8F]">
                  <span className="flex items-center px-3 text-xs text-[#5E503F]/70">
                    +91
                  </span>
                  <input
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    maxLength={10}
                    className="flex-1 rounded-r-md px-3 py-2 text-sm text-[#5E503F] outline-none"
                    placeholder="10-digit mobile number"
                  />
                </div>
                {errors.mobile && (
                  <p className="mt-1 text-xs text-red-600">{errors.mobile}</p>
                )}
              </div>

              <div className="sm:col-span-2">
                <span className="text-xs font-medium text-[#5E503F]">
                  Milk Type <span className="text-red-500">*</span>
                </span>
                <div className="mt-1 flex gap-3">
                  {(["cow", "buffalo", "both", "mix"] as MilkTypeUI[]).map(
                    (value) => {
                      const active =
                        value === "both"
                          ? milkType.includes("cow") &&
                            milkType.includes("buffalo")
                          : milkType.includes(value as MilkType);

                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleMilkType(value)}
                          className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium ${
                            active
                              ? "border-[#2A9D8F] bg-[#2A9D8F]/10 text-[#2A9D8F]"
                              : "border-[#E9E2C8] text-[#5E503F]"
                          }`}
                        >
                          {value === "cow" && "Cow"}
                          {value === "buffalo" && "Buffalo"}
                          {value === "both" && "Both"}
                          {value === "mix" && "Mix"}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[#5E503F]">
              Address (optional)
            </h2>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-[#E9E2C8] bg-white px-3 py-2 text-sm text-[#5E503F] outline-none focus:ring-2 focus:ring-[#2A9D8F]"
              placeholder="Village / Area / Landmark"
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
                {saving ? "Saving..." : "Save Farmer"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFarmerPage;
