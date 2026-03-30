export type AuthResponse = {
  message: string;
  token: string;
  user: {
    _id: string;
    name: string;
    email: string;
  };
};
