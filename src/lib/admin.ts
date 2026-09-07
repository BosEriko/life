export const ADMIN_EMAIL = "bos@eriko.ph";

export function isAdminEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && email.toLowerCase() === ADMIN_EMAIL;
}
