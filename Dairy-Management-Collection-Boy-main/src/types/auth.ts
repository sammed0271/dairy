export type AuthRole = "superadmin" | "admin";

export type AuthCentre = {
  _id: string;
  name: string;
  code: string;
  status: string;
  district?: string;
  village?: string;
};

export type AuthUser = {
  _id: string;
  name: string;
  email: string;
  role: AuthRole;
  centreId: string | AuthCentre | null;
  status?: string;
};

export type AuthResponse = {
  message: string;
  token: string;
  user: AuthUser;
};
