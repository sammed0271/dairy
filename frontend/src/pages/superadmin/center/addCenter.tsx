import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react"; // Assuming lucide-react is installed
import { createCenter } from "../../../axios/center_api";
import toast from "react-hot-toast";

export default function AddCenterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: "",
    ownerName: "",
    mobile: "",
    village: "",
    taluka: "",
    district: "",
    state: "",
    pincode: "",
    latitude: "",
    longitude: "",
    address: "",
    milkType: "",
    rateType: "",
    unit: "liter",
    defaultRate: "",
    shift: "both",
    paymentCycle: "weekly",
    paymentMode: "cash",
    commission: "0",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrs = { ...prev };
        delete newErrs[name];
        return newErrs;
      });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // Required Fields Validation
    if (!form.name.trim()) newErrors.name = "Center name is required";
    if (!form.ownerName.trim()) newErrors.ownerName = "Owner name is required";

    // Mobile Validation
    if (!form.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(form.mobile)) {
      newErrors.mobile = "Must be exactly 10 digits";
    }

    // Business Config Validation
    if (!form.milkType) newErrors.milkType = "Please select a milk type";
    if (!form.rateType) newErrors.rateType = "Please select a rate type";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await createCenter({
        ...form,
        milkType: [form.milkType],
      });
      console.log('Success:', res.data);
      navigate("/centers");
    } catch (err) {
      toast.error("Failed to create center. Please try again.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Center</h1>
          <p className="text-gray-500 text-sm mt-1">Onboard a new dairy collection center to the network.</p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-white transition-all shadow-sm bg-white/50"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div className="space-y-6">
        {/* Basic Details Section */}
        <FormSection title="Basic Details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input label="Center Name *" name="name" onChange={handleChange} error={errors.name} />
            <Input label="Owner Name *" name="ownerName" onChange={handleChange} error={errors.ownerName} />
            <Input label="Mobile * (10 digits)" name="mobile" onChange={handleChange} error={errors.mobile} />
          </div>
        </FormSection>

        {/* Location Section */}
        <FormSection title="Location">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input label="Village" name="village" onChange={handleChange} />
            <Input label="Taluka" name="taluka" onChange={handleChange} />
            <Input label="District" name="district" onChange={handleChange} />
            <Input label="State" name="state" onChange={handleChange} />
            <Input label="Pincode (6 digits)" name="pincode" onChange={handleChange} />
            <Input label="Latitude" name="latitude" onChange={handleChange} />
            <Input label="Longitude" name="longitude" onChange={handleChange} />
          </div>
          <div className="mt-6">
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Address</label>
            <textarea
              name="address"
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
            />
          </div>
        </FormSection>

        {/* Business Configuration */}
        <FormSection title="Business Configuration">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Select label="Milk Type *" name="milkType" onChange={handleChange} error={errors.milkType}>
              <option value="">— Select —</option>
              <option value="cow">Cow</option>
              <option value="buffalo">Buffalo</option>
              <option value="mix">mix</option>
            </Select>
            <Select label="Rate Type *" name="rateType" onChange={handleChange} error={errors.rateType}>
              <option value="">— Select —</option>
              <option value="fat_snf">FAT / SNF</option>
              <option value="fixed">Fixed Rate</option>
            </Select>
            <Select label="Unit" name="unit" onChange={handleChange} defaultValue="liter">
              <option value="liter">Liter</option>
              <option value="kg">Kg</option>
            </Select>
            <Input label="Default Rate" name="defaultRate" onChange={handleChange} />
            <Select label="Shift" name="shift" onChange={handleChange} defaultValue="Both">
              <option value="both">Both</option>
              <option value="morning">Morning</option>
              <option value="evening">Evening</option>
            </Select>
          </div>
        </FormSection>

        {/* Payment Section */}
        <FormSection title="Payment">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Select label="Payment Cycle" name="paymentCycle" onChange={handleChange} defaultValue="weekly">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="10days">10 Days</option>
              <option value="monthly">Monthly</option>
            </Select>
            <Select label="Payment Mode" name="paymentMode" onChange={handleChange} defaultValue="cash">
              <option value="cash">Cash</option>
              <option value="bank">Bank Transfer</option>
              <option value="upi">UPI</option>
            </Select>
            <Input label="Commission" name="commission" placeholder="0" onChange={handleChange} />
          </div>
        </FormSection>


        {/* Form Actions */}
        <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="px-6 py-2 border border-gray-200 rounded-lg font-semibold text-gray-700 hover:bg-white transition-all shadow-sm"
          >
            Cancel
          </button>
          <button
            disabled={loading}
            onClick={() => handleSubmit()}
            className="px-8 py-2 bg-[#3b82f6] text-white font-bold rounded-lg hover:bg-blue-600 transition-all shadow-md"
          >
            Create Center
          </button>
        </div>
      </div>
    </div>
  );
}

// Sub-components for cleaner structure
function FormSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">{title}</h2>
      {children}
    </div>
  );
}

function Input({ label, error, ...props }: any) {
  return (
    <div className="w-full">
      <label className="text-sm font-semibold text-gray-700 mb-2 block">{label}</label>
      <input
        {...props}
        className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:outline-none transition-all ${error
          ? "border-red-500 bg-red-50/30 focus:ring-red-200"
          : "border-gray-100 bg-gray-50/30 focus:ring-blue-500 focus:bg-white"
          }`}
      />
      {error && (
        <p className="text-red-500 text-xs mt-1 flex items-center gap-1 font-medium">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}

function Select({ label, error, children, ...props }: any) {
  return (
    <div className="w-full">
      <label className="text-sm font-semibold text-gray-700 mb-2 block">{label}</label>
      <select
        {...props}
        className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:outline-none transition-all appearance-none cursor-pointer ${error
          ? "border-red-500 bg-red-50/30 focus:ring-red-200"
          : "border-gray-100 bg-gray-50/30 focus:ring-blue-500 focus:bg-white"
          }`}
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
      >
        {children}
      </select>
      {error && (
        <p className="text-red-500 text-xs mt-1 flex items-center gap-1 font-medium">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
}