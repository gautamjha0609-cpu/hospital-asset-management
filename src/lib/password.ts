// Password rules shared between change-own, admin-set, and reset flows.
export function validatePassword(pw: string): string | null {
  if (typeof pw !== "string") return "Password required.";
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (pw.length > 200) return "Password is too long (max 200).";
  if (!/[A-Za-z]/.test(pw)) return "Password must contain at least one letter.";
  if (!/[0-9]/.test(pw)) return "Password must contain at least one number.";
  return null;
}
