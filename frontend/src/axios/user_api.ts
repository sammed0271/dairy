import { api } from "./axiosInstance";

export const getUsers = () => api.get("/users");
export const createUser = (data: any) => api.put("users", data);
export const assignCentertoUser = (userId: string, centerId: string) => api.patch(`/users/${userId}/center`, { centerId });