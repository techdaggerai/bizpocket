// src/lib/phone.ts
// E.164 phone normalization and validation.
// Source spec: docs/AUTH_DESIGN_v1.md §11 rule 4 — "No phone number is stored
// or compared in any format other than E.164. All inputs normalized at the edge."

import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

export type PhoneValidationResult =
  | { valid: true; e164: string; country: CountryCode }
  | { valid: false; reason: string };

/**
 * Normalize and validate a phone number to E.164 format.
 * Accepts free-form input; returns canonical E.164 ("+12025551234") or an error.
 *
 * @param input - User-supplied phone string. May or may not include country code.
 * @param defaultCountry - Fallback country when input lacks a country code. Default 'US'.
 */
export function toE164(
  input: string,
  defaultCountry: CountryCode = 'US'
): PhoneValidationResult {
  if (!input || typeof input !== 'string') {
    return { valid: false, reason: 'empty_input' };
  }

  const trimmed = input.trim();
  if (trimmed.length < 4) {
    return { valid: false, reason: 'too_short' };
  }

  try {
    const parsed = parsePhoneNumberFromString(trimmed, defaultCountry);
    if (!parsed) {
      return { valid: false, reason: 'unparseable' };
    }
    if (!parsed.isValid()) {
      return { valid: false, reason: 'invalid_for_country' };
    }
    return {
      valid: true,
      e164: parsed.number,
      country: parsed.country ?? defaultCountry,
    };
  } catch {
    return { valid: false, reason: 'parse_error' };
  }
}

/**
 * Cheap pre-check: is this string already a syntactically valid E.164?
 */
export function isE164(input: string): boolean {
  return typeof input === 'string' && /^\+[1-9]\d{6,14}$/.test(input);
}
