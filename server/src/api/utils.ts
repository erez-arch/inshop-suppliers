import { ParsedQs } from 'qs';

// Safely extract a single string value from express query params
export function qs(val: string | string[] | ParsedQs | ParsedQs[] | undefined): string | undefined {
  if (val === undefined || val === null) return undefined;
  if (typeof val === 'string') return val || undefined;
  if (Array.isArray(val)) {
    const first = val[0];
    return first ? String(first) : undefined;
  }
  return undefined;
}
