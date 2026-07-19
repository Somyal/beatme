export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatHumanDate(dateStr: string): string {
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return dateStr;
  }
  const [year, month, day] = parts;
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${day} ${monthNames[month - 1]} ${year}`;
}

/**
 * Returns a list of the last 365 days in YYYY-MM-DD format (local time), starting from today and going backward.
 */
export function getLast365Days(): string[] {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(getLocalDateString(d));
  }
  // Reverse to make it oldest to newest
  return dates.reverse();
}
