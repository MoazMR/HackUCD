import type { AgeRange } from "../profile/types";

export const UNDER_18 = "under-18" as const;
export type AgeAnswer = AgeRange | typeof UNDER_18 | "";

export type AgeCheck = { ok: true; ageRange: AgeRange } | { ok: false; blocked: boolean; message: string };

/**
 * ThirdPlace is for adults. We ask for an age range and a confirmation rather
 * than a birth date, so no birth date is ever held.
 */
export function checkAge(answer: AgeAnswer, confirmedAdult: boolean): AgeCheck {
  if (answer === "") return { ok: false, blocked: false, message: "Choose your age range." };
  if (answer === UNDER_18) {
    return { ok: false, blocked: true, message: "ThirdPlace is only for people aged 18 or over, so you can't create an account yet." };
  }
  if (!confirmedAdult) return { ok: false, blocked: false, message: "Confirm that you are 18 or over to continue." };
  return { ok: true, ageRange: answer };
}

export function checkDisplayName(name: string): string | undefined {
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Enter the name you want people to see, at least 2 characters.";
  if (trimmed.length > 30) return "Keep your name to 30 characters or fewer.";
  if (/@|\d{5,}|https?:|www\./i.test(trimmed)) return "Leave phone numbers, emails and links out of your name.";
  return undefined;
}
