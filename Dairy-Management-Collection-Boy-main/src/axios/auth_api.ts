import { api } from "./axiosInstance";

export interface AuthResponse {
  message: string;
  token: string;
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
    centreId: string | null;
  };
}

export const registerUser = (data: {
  name: string;
  email: string;
  password: string;
}) => api.post<AuthResponse>("/auth/register", data);

export const loginUser = (data: { email: string; password: string }) =>
  api.post<AuthResponse>("/auth/login", data);
