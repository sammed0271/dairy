import type { AuthResponse, AuthUser } from "../types/auth";
import { api } from "./axiosInstance";

export const registerUser = (data: {
  name: string;
  email: string;
  password: string;
}) => api.post<AuthResponse>("/auth/register", data);

export const loginUser = (data: { email: string; password: string }) =>
  api.post<AuthResponse>("/auth/login", data);

export const getCurrentUser = () => api.get<AuthUser>("/auth/me");

export const updateCurrentUser = (data: { name: string; email: string }) =>
  api.put<AuthUser>("/auth/me", data);

export const changeCurrentUserPassword = (data: {
  currentPassword: string;
  newPassword: string;
}) => api.put<{ message: string }>("/auth/change-password", data);
