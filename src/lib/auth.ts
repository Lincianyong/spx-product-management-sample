import type { Role } from "./types";
import { seedUsers } from "./mock-data";

const MOCK_PASSWORD = "12345678";

export interface MockAccount {
  email: string;
  password: string;
  role: Role;
  displayName: string;
  description: string;
}

export const mockAccounts: MockAccount[] = [
  {
    email: "pm@spxexpress.com",
    password: MOCK_PASSWORD,
    role: "pm",
    displayName: "Albert Halim",
    description: "Product Manager · owns Epics, runs Triage, commits sprint",
  },
  {
    email: "pmlead@spxexpress.com",
    password: MOCK_PASSWORD,
    role: "leadership",
    displayName: "Diana Wijaya",
    description: "Head of AI · portfolio health, leadership comments",
  },
  {
    email: "eng@spxexpress.com",
    password: MOCK_PASSWORD,
    role: "engineer",
    displayName: "Andre Halim",
    description: "Senior SWE (Forecasting pod) · daily ticket execution",
  },
  {
    email: "guest@spxexpress.com",
    password: MOCK_PASSWORD,
    role: "guest",
    displayName: "Ronaldo Tan",
    description: "Ops · files Bug Reports only",
  },
];

export function authenticate(email: string, password: string) {
  const account = mockAccounts.find((a) => a.email.toLowerCase() === email.toLowerCase());
  if (!account) return { ok: false as const, error: "We don't recognize that email." };
  if (account.password !== password) return { ok: false as const, error: "Password doesn't match." };

  const user = seedUsers.find((u) => u.email === account.email);
  if (!user) return { ok: false as const, error: "User profile not provisioned." };
  return { ok: true as const, userId: user.id };
}
