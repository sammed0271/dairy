import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../axios/axiosInstance";
import { loginUser } from "../axios/auth_api";

type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
  centerId?: string | null;
};

type AppContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

export const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 🔁 Restore session
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    if (storedUser && storedToken) {
      const parsedUser = JSON.parse(storedUser);

      setUser(parsedUser);
      setToken(storedToken);

      api.defaults.headers.common["Authorization"] = `Bearer ${storedToken}`;
    }

    setLoading(false);
  }, []);

  // 🔐 LOGIN
  const login = async (email: string, password: string) => {
    const res = await loginUser({ email, password });

    const { token, user } = res.data;

    setUser(user);
    setToken(token);

    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);

    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    return user;
  };

  // 🚪 LOGOUT
  const logout = () => {
    setUser(null);
    setToken(null);

    localStorage.removeItem("user");
    localStorage.removeItem("token");

    delete api.defaults.headers.common["Authorization"];
  };

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAdmin: user?.role === "admin",
        isSuperAdmin: user?.role === "superadmin",
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used inside AppProvider");
  return ctx;
};