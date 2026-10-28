// src/controllers/postController.ts
import type { Request, Response } from "express";
import prisma from "../config/prisma";
import { HttpError } from "../utils/http-error";
import { parseId } from "../utils/parse";
import { sendSuccess } from "../utils/response";

const authorSelect = { select: { id: true, name: true, email: true } };

export const createPost = async (req: Request, res: Response) => {
  const { title, content, authorId } = req.body ?? {};

  if (!title || !authorId) {
    throw new HttpError(400, "Title dan authorId wajib diisi");
  }

  const author = await prisma.user.findUnique({
    where: { id: parseId(authorId) },
  });
  if (!author) throw new HttpError(404, "User tidak ditemukan");

  const post = await prisma.post.create({
    data: { title, content, authorId: author.id },
    include: { author: authorSelect },
  });

  sendSuccess(res, 201, "Post berhasil dibuat", post);
};

// GET /api/posts?page=1&limit=5&search=eco&published=true
export const getAllPosts = async (req: Request, res: Response) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const search = typeof req.query.search === "string" ? req.query.search : "";
  const published =
    req.query.published === undefined
      ? undefined
      : req.query.published === "true";

  const where = {
    ...(search && { title: { contains: search, mode: "insensitive" as const } }),
    ...(published !== undefined && { published }),
  };

  const [posts, total] = await prisma.$transaction([
    prisma.post.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { author: authorSelect },
    }),
    prisma.post.count({ where }),
  ]);

  sendSuccess(res, 200, "Berhasil mengambil data posts", posts, {
    currentPage: page,
    limit,
    totalItems: total,
    totalPages: Math.ceil(total / limit),
  });
};

// POST /api/posts/bulk
// Body: { "posts": [ { "title": "...", "content": "...", "authorId": 1 }, ... ] }
// createMany = 1 query INSERT untuk banyak baris. Validasi author dilakukan
// di dalam transaksi interaktif agar atomik: jika ada author yang hilang,
// seluruh penyisipan di-ROLLBACK (tidak ada yang terselip).
export const createPostsBulk = async (req: Request, res: Response) => {
  const { posts } = req.body ?? {};

  if (!Array.isArray(posts) || posts.length === 0) {
    throw new HttpError(400, "Body harus berisi array non-kosong pada field 'posts'");
  }

  const rows = posts.map((p) => {
    const { title, content, authorId } = p ?? {};
    if (!title || !authorId) {
      throw new HttpError(400, "Setiap post wajib punya 'title' dan 'authorId'");
    }
    return { title, content, authorId: parseId(authorId) };
  });

  const authorIds = [...new Set(rows.map((r) => r.authorId))];

  const created = await prisma.$transaction(async (tx) => {
    const authors = await tx.user.findMany({
      where: { id: { in: authorIds } },
      select: { id: true },
    });

    // PENTING: di dalam $transaction interaktif, pakai `tx` (bukan prisma)
    const missing = authorIds.filter(
      (id) => !authors.some((a) => a.id === id),
    );
    if (missing.length > 0) {
      throw new HttpError(404, `Author tidak ditemukan: ${missing.join(", ")}`);
    }

    return tx.post.createMany({ data: rows });
  });

  sendSuccess(res, 201, `${created.count} post berhasil dibuat sekaligus (bulk)`, {
    created: created.count,
  });
};

export const getPostStats = async (_req: Request, res: Response) => {
  const [overall, perAuthor] = await Promise.all([
    prisma.post.aggregate({
      _count: { id: true },
      _sum: { views: true },
      _avg: { views: true },
      _max: { views: true },
    }),
    prisma.post.groupBy({
      by: ["authorId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ]);

  sendSuccess(res, 200, "Berhasil mengambil statistik posts", {
    overall,
    perAuthor,
  });
};

// GET /api/posts/stats/daily
// Raw query: groupBy per hari. Prisma groupBy tidak mendukung date_trunc,
// jadi ini harus lewat SQL mentah.
//  - "Post" ditulis dengan kutip: nama tabel di Postgres case-sensitive
//  - COUNT(*)::int : COUNT(*) menghasilkan BigInt yang tidak bisa di-JSON.stringify
export const getPostDailyStats = async (_req: Request, res: Response) => {
  const daily = await prisma.$queryRaw<{ day: Date; total: number }[]>`
    SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::int AS total
    FROM "Post"
    GROUP BY day
    ORDER BY day ASC
  `;

  sendSuccess(res, 200, "Berhasil mengambil statistik posts per hari", daily);
};

export const getPostById = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);

  const post = await prisma.post.findUnique({
    where: { id },
    include: { author: authorSelect },
  });
  if (!post) throw new HttpError(404, "Post tidak ditemukan");

  sendSuccess(res, 200, "Berhasil mengambil data post", post);
};

export const updatePost = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const { title, content, published } = req.body ?? {};

  const post = await prisma.post.update({
    where: { id },
    data: {
      ...(title && { title }),
      ...(content !== undefined && { content }),
      ...(published !== undefined && { published }),
    },
    include: { author: authorSelect },
  });

  sendSuccess(res, 200, "Post berhasil diupdate", post);
};

export const deletePost = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);

  await prisma.post.delete({ where: { id } });

  sendSuccess(res, 200, "Post berhasil dihapus");
};