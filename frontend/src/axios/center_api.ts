import { api } from "./axiosInstance";

// GET ALL CENTERS
export const getCenters = async () => {
  const res = await api.get("/centers");

  return res.data;
};
