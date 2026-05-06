import { useState } from "react";
import { api } from "../../../axios/axiosInstance";

export default function EditUserModal({
  user,
  onClose,
  onSuccess,
}: any) {
  const [form, setForm] = useState({
    name: user.name || "",
    email: user.email || "",
    mobile: user.mobile || "",
    role: user.role || "admin",
    password: "",
    confirmPassword: "",
  });

  const [resetPassword, setResetPassword] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const isSuperAdmin = user.role === "superadmin";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

    // remove field error while typing
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: "",
      });
    }
  };

  /* ================= VALIDATION ================= */

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
    ) {
      newErrors.email = "Enter valid email";
    }

    if (!form.mobile.trim()) {
      newErrors.mobile = "Mobile number is required";
    } else if (!/^\d{10}$/.test(form.mobile)) {
      newErrors.mobile = "Must be 10 digits";
    }

    // validate password only if reset enabled
    if (resetPassword) {
      if (!form.password) {
        newErrors.password = "Password is required";
      } else if (form.password.length < 6) {
        newErrors.password =
          "Password must be at least 6 characters";
      }

      if (!form.confirmPassword) {
        newErrors.confirmPassword =
          "Please confirm password";
      } else if (
        form.password !== form.confirmPassword
      ) {
        newErrors.confirmPassword =
          "Passwords do not match";
      }
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  /* ================= SUBMIT ================= */

  const handleSubmit = async () => {
    try {
      if (!validate()) return;

      setLoading(true);

      const payload: any = {
        name: form.name,
        email: form.email,
        mobile: form.mobile,
        role: form.role,
      };

      // only send password if resetting
      if (resetPassword) {
        payload.password = form.password;
      }

      const res = await api.put(
        `/users/${user._id}`,
        payload
      );

      onSuccess(res.data);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white w-[420px] rounded-xl p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-5">
          Edit User
        </h2>

        <div className="space-y-4">

          {/* NAME */}
          <div>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Name"
              className="w-full px-3 py-2 border rounded-lg"
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">
                {errors.name}
              </p>
            )}
          </div>

          {/* EMAIL */}
          <div>
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Email"
              className="w-full px-3 py-2 border rounded-lg"
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">
                {errors.email}
              </p>
            )}
          </div>

          {/* MOBILE */}
          <div>
            <input
              name="mobile"
              value={form.mobile}
              onChange={handleChange}
              placeholder="Mobile"
              className="w-full px-3 py-2 border rounded-lg"
            />
            {errors.mobile && (
              <p className="text-red-500 text-xs mt-1">
                {errors.mobile}
              </p>
            )}
          </div>

          {/* ROLE */}
          <div>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              disabled={isSuperAdmin}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          {/* RESET PASSWORD */}
          {!resetPassword ? (
            <button
              type="button"
              onClick={() => setResetPassword(true)}
              className="text-sm text-blue-600 hover:underline"
            >
              Reset Password
            </button>
          ) : (
            <div className="space-y-4 border-t pt-4">

              {/* PASSWORD */}
              <div>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="New Password"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {errors.password && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* CONFIRM PASSWORD */}
              <div>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm Password"
                  className="w-full px-3 py-2 border rounded-lg"
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg"
          >
            Cancel
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}