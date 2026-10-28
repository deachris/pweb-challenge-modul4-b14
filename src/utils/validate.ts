// src/utils/validate.ts
import { HttpError } from "./http-error";

// Format email sederhana: ada @, ada domain, ada tld (bukan validasi RFC penuh)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const validateEmail = (email: unknown): string => {
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    throw new HttpError(400, "Format email tidak valid");
  }
  return email;
};

export const validatePassword = (password: unknown): string => {
  if (typeof password !== "string" || password.length < 8) {
    throw new HttpError(400, "Password minimal 8 karakter");
  }
  return password;
};
