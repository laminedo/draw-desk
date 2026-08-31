import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number) {
  return Number(value || 0).toLocaleString();
}

export function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString()}`;
}
