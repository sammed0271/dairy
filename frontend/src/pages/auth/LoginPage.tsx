import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import InputField from "../../components/inputField";
// import { loginUser } from "../../axios/auth_api";
import { useAppContext } from "../../context/AppContext";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAppContext();

  const handleLogin = async () => {

    setError(null);

    if (!email || !password) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);
      // const res = await loginUser({ email, password });
      const user = await login(email, password);

      if (user.role === "superadmin") {
        navigate("/sa/dashboard");
      } else {
        navigate("/dashboard");
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err: any) {
      // If the server provides a specific message (e.g., { message: "Database down" }), show it
      const message = err.response?.data?.message || "An internal server error occurred. Please try again later.";
      setError(message);
      console.error("Login Failed:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8F4E3]">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow">
        <h1 className="mb-4 text-xl font-bold text-[#5E503F]">Login</h1>

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
          onClick={handleLogin}
          disabled={loading}
          className="mt-4 w-full rounded-md bg-[#2A9D8F] py-2 text-sm font-medium text-white hover:bg-[#247B71] disabled:opacity-70"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p className="mt-3 text-center text-xs text-[#5E503F]/70">
          Don’t have an account?{" "}
          <span
            className="cursor-pointer text-[#2A9D8F]"
            onClick={() => navigate("/register")}
          >
            Register
          </span>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
