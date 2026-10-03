export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export const fmtTime = (s: number) => { s = Math.max(0, Math.floor(s)); const m = Math.floor(s / 60); return `${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
export const fmtDuration = (s: number) => `${Math.floor(s / 60)}m ${s % 60}s`;
export const dhakaDate = (d = new Date()) => new Date(d.getTime() + 6 * 3600_000).toISOString().slice(0, 10);
export function isoWeek(ymd: string): string {
  const d = new Date(Date.parse(ymd + "T00:00:00Z")); const day = d.getUTCDay() || 7; d.setUTCDate(d.getUTCDate() + 4 - day);
  const y = d.getUTCFullYear(); return `${y}-W${String(Math.ceil(((d.getTime() - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7)).padStart(2, "0")}`;
}
export function friendlyError(e: unknown): string {
  const err = e as { code?: string; message?: string };
  const code = err?.code ?? "";
  if (typeof navigator !== "undefined" && !navigator.onLine) return "Your internet connection was interrupted. Your answers are saved locally and will sync when you're back online.";
  if (code.includes("unavailable")) return "Firebase is unreachable right now. Please try again in a moment.";
  if (code.includes("permission-denied")) return "You don't have permission to do that.";
  if (code.includes("unauthenticated")) return "Your session expired. Please sign in again.";
  if (code.includes("not-found")) return "That item is unavailable.";
  if (code.includes("already-exists") || code.includes("failed-precondition")) return err.message || "That action isn't allowed right now.";
  if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password") || code.includes("auth/user-not-found")) return "Wrong email or password.";
  if (code.includes("auth/email-already-in-use")) return "That email is already registered. Try logging in.";
  if (code.includes("auth/weak-password")) return "Password must be at least 6 characters.";
  if (code.includes("storage/")) return "Upload failed. Check the file (image, under 1 MB) and try again.";
  return err.message || "Something went wrong. Please try again.";
}
export function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ""));
}
export async function resizeImage(file: File, maxW: number): Promise<Blob> {
  const bmp = await createImageBitmap(file); const scale = Math.min(1, maxW / bmp.width);
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Image processing failed"))), "image/jpeg", 0.8));
}
