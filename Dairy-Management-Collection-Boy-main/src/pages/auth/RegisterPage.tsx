import React, { useState } from "react";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import InputField from "../../components/inputField";
import { registerUser } from "../../axios/auth_api";
import { setSession } from "../../utils/auth";

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);

    if (!name || !email || !password) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);

      const res = await registerUser({ name, email, password });
      setSession(res.data.token, res.data.user);
      navigate("/dashboard");
    } catch (err) {
      const apiError = err as AxiosError<{ message?: string }>;
      setError(apiError.response?.data?.message ?? "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F4E3]">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow">
        <h1 className="mb-4 text-xl font-bold text-[#5E503F]">Bootstrap Setup</h1>

        <InputField
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <InputField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <InputField
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <button
          onClick={handleRegister}
          disabled={loading}
          className="mt-4 w-full rounded-md bg-[#2A9D8F] py-2 text-sm font-medium text-white hover:bg-[#247B71] disabled:opacity-70"
        >
          {loading ? "Creating account..." : "Create Superadmin"}
        </button>

        <p className="mt-3 text-center text-xs text-[#5E503F]/70">
          This screen is only used for first-time ERP bootstrap.
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
