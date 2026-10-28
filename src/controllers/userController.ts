// src/controllers/userController.ts
import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import prisma from "../config/prisma";
import { HttpError } from "../utils/http-error";
import { parseId } from "../utils/parse";
import { sendSuccess } from "../utils/response";
import { validateEmail, validatePassword } from "../utils/validate";

export const createUser = async (req: Request, res: Response) => {
  // Express 5: req.body = undefined jika body tidak ter-parse, jadi beri fallback {}
  const { email, name, password } = req.body ?? {};

  if (!email || !password) {
    throw new HttpError(400, "Email dan password wajib diisi");
  }

  validateEmail(email);
  validatePassword(password);

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new HttpError(409, "Email sudah terdaftar");
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: await bcrypt.hash(password, 10), // jangan pernah simpan password polos
    },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  sendSuccess(res, 201, "User berhasil dibuat", user);
};

export const getAllUsers = async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      _count: { select: { posts: true } },
    },
  });

  sendSuccess(res, 200, "Berhasil mengambil data users", users);
};

export const getUserById = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      posts: {
        select: { id: true, title: true, published: true, createdAt: true },
      },
    },
  });

  if (!user) throw new HttpError(404, "User tidak ditemukan");

  sendSuccess(res, 200, "Berhasil mengambil data user", user);
};

export const updateUser = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const { email, name } = req.body ?? {};

  // Validasi hanya field yang memang dikirim (bagian update)
  if (email !== undefined) validateEmail(email);
  // name boleh null (untuk mengosongkan), tapi kalau ada isinya harus string singkat
  if (name !== undefined && name !== null && (typeof name !== "string" || name.length > 50)) {
    throw new HttpError(400, "Name maksimal 50 karakter");
  }

  // Jika id tidak ada, Prisma melempar error P2025 -> ditangani errorHandler (404)
  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(email && { email }),
      ...(name && { name }),
    },
    select: { id: true, email: true, name: true, updatedAt: true },
  });

  sendSuccess(res, 200, "User berhasil diupdate", user);
};

// GET /api/users/:id/posts?page=1&limit=5&search=eco&published=true&minViews=10
// Endpoint nested: posts milik satu user, dengan filtering + pagination
export const getUserPosts = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);

  const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!user) throw new HttpError(404, "User tidak ditemukan");

  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const search = typeof req.query.search === "string" ? req.query.search : "";
  const published =
    req.query.published === undefined ? undefined : req.query.published === "true";
  const minViews = Number(req.query.minViews) || undefined;

  // Filtering bag. 14: contains -> ILIKE, perbandingan angka -> gte
  const where = {
    authorId: id,
    ...(search && { title: { contains: search, mode: "insensitive" as const } }),
    ...(published !== undefined && { published }),
    ...(minViews && { views: { gte: minViews } }),
  };

  const [posts, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, content: true, published: true, views: true, createdAt: true },
    }),
    prisma.post.count({ where }), // count WAJIB pakai where yang sama
  ]);

  sendSuccess(res, 200, `Berhasil mengambil posts milik user ${user.id}`, posts, {
    currentPage: page,
    limit,
    totalItems: total,
    totalPages: Math.ceil(total / limit),
  });
};

export const deleteUser = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);

  // Post milik user ikut terhapus karena `onDelete: Cascade` di schema
  await prisma.user.delete({ where: { id } });

  sendSuccess(res, 200, "User berhasil dihapus");
};