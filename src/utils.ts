const DELIVERY_DAYS = [1, 2, 4, 5];

export function parseLocalDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

export function toDateInputValue(date: Date): string {
  const copy = new Date(date);
  copy.setHours(12, 0, 0, 0);
  return copy.toISOString().slice(0, 10);
}

export function addDays(date: Date, amount: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

export function getTomorrowDate(from = new Date()): string {
  return toDateInputValue(addDays(from, 1));
}

export function getNextDeliveryDate(from = new Date()): string {
  let cursor = addDays(from, 1);

  for (let index = 0; index < 14; index += 1) {
    if (DELIVERY_DAYS.includes(cursor.getDay())) {
      return toDateInputValue(cursor);
    }

    cursor = addDays(cursor, 1);
  }

  return toDateInputValue(cursor);
}

export function getUpcomingDeliveryDates(count = 5, from = new Date()): string[] {
  const dates: string[] = [];
  let cursor = from;

  while (dates.length < count) {
    const nextDate = getNextDeliveryDate(cursor);
    dates.push(nextDate);
    cursor = parseLocalDate(nextDate);
  }

  return dates;
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(parseLocalDate(value));
}

export function formatDateLong(value: string): string {
  const formatted = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(parseLocalDate(value));

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function formatQuantity(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseQuantity(value: string): number {
  return Number(value.trim().replace(",", "."));
}

export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
