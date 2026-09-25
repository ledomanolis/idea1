// The scheme's advisers, and which columns on `schemes` hold each one's
// name and appointment date (see supabase/003_advisers.sql). Key contacts
// live in `adviser_contacts`, tagged with the adviser id.

export const ADVISERS: { id: string; label: string; nameColumn: string; dateColumn: string }[] = [
  { id: "admin", label: "Administrator", nameColumn: "admin_name", dateColumn: "admin_appointed_date" },
  { id: "investment", label: "Investment consultant", nameColumn: "provider_name", dateColumn: "appointed_date" },
  { id: "actuary", label: "Actuary", nameColumn: "actuary_name", dateColumn: "actuary_appointed_date" },
];
