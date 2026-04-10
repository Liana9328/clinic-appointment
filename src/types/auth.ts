export const ROLE_PRIORITY = {
  patient: 1,
  clinician: 2,
  admin: 3,
} as const;

export type Role = keyof typeof ROLE_PRIORITY;
