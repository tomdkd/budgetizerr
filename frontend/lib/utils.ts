import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Relative path so the browser always calls the same origin; Next.js rewrites proxy it to the backend
export const API_URL = '/api';