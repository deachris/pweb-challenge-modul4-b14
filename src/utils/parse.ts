// src/utils/parse.ts
import { HttpError } from "./http-error";

// Ubah "12" -> 12, dan tolak nilai yang bukan bilangan bulat positif
export const parseId = (value: unknown): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "ID harus berupa bilangan bulat positif");
  }
  return id;
};