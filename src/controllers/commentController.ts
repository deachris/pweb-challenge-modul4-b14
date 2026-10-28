// src/controllers/commentController.ts
import type { Request, Response } from "express";
import prisma from "../config/prisma";
import { HttpError } from "../utils/http-error";
import { parseId } from "../utils/parse";
import { sendSuccess } from "../utils/response";

// Sertakan data pembuat dan post-nya (ringkas: cukup id + name/title)
const includeRefs = {
  include: {
    user: { select: { id: true, name: true, email: true } },
    post: { select: { id: true, title: true } },
  },
};

export const createComment = async (req: Request, res: Response) => {
  const { content, userId, postId } = req.body ?? {};

  if (!content || !userId || !postId) {
    throw new HttpError(400, "Content, userId, dan postId wajib diisi");
  }

  const uid = parseId(userId);
  const pid = parseId(postId);

  // Cek kedua relasi sebelum insert (kalau tidak, P2003 -> 400 dari error handler)
  const [user, post] = await Promise.all([
    prisma.user.findUnique({ where: { id: uid } }),
    prisma.post.findUnique({ where: { id: pid } }),
  ]);
  if (!user) throw new HttpError(404, "User tidak ditemukan");
  if (!post) throw new HttpError(404, "Post tidak ditemukan");

  const comment = await prisma.comment.create({
    data: { content, userId: uid, postId: pid },
    ...includeRefs,
  });

  sendSuccess(res, 201, "Comment berhasil dibuat", comment);
};

// GET /api/comments?postId=3&page=1&limit=10
export const getAllComments = async (req: Request, res: Response) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
  const postId = req.query.postId ? parseId(req.query.postId) : undefined;
  const userId = req.query.userId ? parseId(req.query.userId) : undefined;

  const where = {
    ...(postId !== undefined && { postId }),
    ...(userId !== undefined && { userId }),
  };

  const [comments, total] = await prisma.$transaction([
    prisma.comment.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      ...includeRefs,
    }),
    prisma.comment.count({ where }),
  ]);

  sendSuccess(res, 200, "Berhasil mengambil data comments", comments, {
    currentPage: page,
    limit,
    totalItems: total,
    totalPages: Math.ceil(total / limit),
  });
};

export const getCommentById = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);

  const comment = await prisma.comment.findUnique({ where: { id }, ...includeRefs });
  if (!comment) throw new HttpError(404, "Comment tidak ditemukan");

  sendSuccess(res, 200, "Berhasil mengambil data comment", comment);
};

export const updateComment = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);
  const { content } = req.body ?? {};

  const comment = await prisma.comment.update({
    where: { id },
    data: { ...(content !== undefined && { content }) },
    ...includeRefs,
  });

  sendSuccess(res, 200, "Comment berhasil diupdate", comment);
};

export const deleteComment = async (req: Request, res: Response) => {
  const id = parseId(req.params.id);

  await prisma.comment.delete({ where: { id } });

  sendSuccess(res, 200, "Comment berhasil dihapus");
};
