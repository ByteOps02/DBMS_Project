const IST_LOCALE = "en-IN";
const IST_TZ = "Asia/Kolkata";

export function formatIST(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "N/A";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleString(IST_LOCALE, {
    timeZone: IST_TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatISTTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "N/A";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "N/A";
  return date.toLocaleTimeString(IST_LOCALE, {
    timeZone: IST_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function getISTTodayRange(): [string, string] {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; 
  const nowInIST = new Date(Date.now() + IST_OFFSET_MS);
  const istMidnight = new Date(nowInIST);
  istMidnight.setUTCHours(0, 0, 0, 0);

  const todayStartUTC = new Date(istMidnight.getTime() - IST_OFFSET_MS);
  const todayEndUTC = new Date(todayStartUTC.getTime() + 24 * 60 * 60 * 1000);

  return [todayStartUTC.toISOString(), todayEndUTC.toISOString()];
}

export function getISTTodayDateString(): string {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const nowInIST = new Date(Date.now() + IST_OFFSET_MS);
  return nowInIST.toISOString().split("T")[0]; 
}
