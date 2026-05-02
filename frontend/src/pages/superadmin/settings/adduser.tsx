import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { createUser } from "../../../axios/user_api";
import { getCenters } from "../../../axios/center_api";

export default function AddUserPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [centers, setCenters] = useState<{ _id: string; name: string; code: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    centerId: "",
    role: "admin", // default
  });

  // Fetch centers on mount
  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const res = await getCenters();
        setCenters(res.data);
      } catch (err) {
        console.error("Failed to fetch centers", err);
      }
    };
    fetchCenters();
  }, []);

  const isSuperAdmin = form.role === "superadmin";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    // Clear centerId when switching to superadmin
    if (name === "role" && value === "superadmin") {
      setForm((prev) => ({ ...prev, role: value, centerId: "" }));
      setErrors((prev) => {
        const newErrs = { ...prev };
        delete newErrs.centerId;
        return newErrs;
      });
      return;
    }

    setForm({ ...form, [name]: value });

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

    if (!form.name.trim()) newErrors.name = "Name is required";

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Enter a valid email address";
    }

    if (!form.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(form.mobile)) {
      newErrors.mobile = "Must be exactly 10 digits";
    }

    // centerId only required for admin
    if (!isSuperAdmin && !form.centerId) {
      newErrors.centerId = "Please select a center";
    }

    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await createUser(form);
      navigate("/settings");
    } catch (err) {
      console.error(err);
      alert("Failed to create user. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add User</h1>
          <p className="text-gray-500 text-sm mt-1">
            Create a new user and assign them to a collection center.
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-white transition-all shadow-sm bg-white/50"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div className="space-y-6">
        {/* Basic Details */}
        <FormSection title="Basic Details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input label="Full Name *" name="name" onChange={handleChange} error={errors.name} />
            <Input label="Email *" name="email" type="email" onChange={handleChange} error={errors.email} />
            <Input label="Mobile * (10 digits)" name="mobile" onChange={handleChange} error={errors.mobile} />
          </div>
        </FormSection>

        {/* Role & Center Assignment */}
        <FormSection title="Role & Center Assignment">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Select label="Role *" name="role" onChange={handleChange} value={form.role}>
              <option value="admin">Admin</option>
              <option value="superadmin">Super Admin</option>
            </Select>
            <Select
              label={`Assign Center ${isSuperAdmin ? "" : "*"}`}
              name="centerId"
              onChange={handleChange}
              value={form.centerId}
              error={errors.centerId}
              disabled={isSuperAdmin}
            >
              <option value="">
                {isSuperAdmin ? "— Not applicable for Super Admin —" : "— Select Center —"}
              </option>
              {centers.map((center) => (
                <option key={center._id} value={center._id}>
                  {center.code} — {center.name}
                </option>
              ))}
            </Select>
          </div>
        </FormSection>

        {/* Account Security */}
        <FormSection title="Account Security">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Input label="Password *" name="password" type="password" onChange={handleChange} error={errors.password} />
            <Input label="Confirm Password *" name="confirmPassword" type="password" onChange={handleChange} error={errors.confirmPassword} />
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
            onClick={handleSubmit}
            disabled={loading}
            className="px-8 py-2 bg-[#3b82f6] text-white font-bold rounded-lg hover:bg-blue-600 transition-all shadow-md disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create User"}
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