// src/routes/post.routes.ts
import { Router } from "express";
import {
  createPost,
  createPostsBulk,
  deletePost,
  getAllPosts,
  getPostById,
  getPostDailyStats,
  getPostStats,
  updatePost,
} from "../controllers/postController";

const router = Router();

router.post("/", createPost);
router.post("/bulk", createPostsBulk); // bulk create, taruh sebelum route dinamis
router.get("/", getAllPosts);
router.get("/stats", getPostStats); // HARUS di atas "/:id", kalau tidak "stats" dianggap sebagai id
router.get("/stats/daily", getPostDailyStats); // raw query date_trunc
router.get("/:id", getPostById);
router.patch("/:id", updatePost);
router.delete("/:id", deletePost);

export default router;