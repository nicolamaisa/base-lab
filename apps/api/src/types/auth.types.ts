export type AuthUser = {
  id: string;
  email: string | null;
  role: string | null;
};

export type AuthVariables = {
  user: AuthUser;
};
