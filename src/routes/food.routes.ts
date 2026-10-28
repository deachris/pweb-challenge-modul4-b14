// src/routes/food.routes.ts
import { Router, Request, Response } from "express";

const router = Router();

// === Latihan bag. 5 modul ===
router.get("/pizza", (_, res) => {
  res.status(200).send("Mmm... Pizza... 🍕");
});

router.get("/cookie", (_, res) => {
  res.status(200).send("Get some Cookie... 🍪");
});

router.get("/donut", (_, res) => {
  res.status(200).send("Do Not... 🍩");
});

// === Endpoint latihan request/response (dipindah dari user.routes.ts,
//     sebabnya: tertelan oleh GET /:id sehingga tidak terjangkau) ===

// Request headers (bag. 7)
router.get("/headers", (req: Request, res: Response) => {
  const contentType = req.headers["content-type"];
  const authorization = req.headers["authorization"];

  res.status(200).json({
    message: "Headers received",
    headers: { contentType, authorization },
  });
});

// Request query (bag. 7) — contoh: /api/food/search?keyword=eco&page=2&limit=5
router.get("/search", (req: Request, res: Response) => {
  const { keyword, page, limit } = req.query;

  res.status(200).json({
    message: "Search results",
    filters: {
      keyword,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    },
  });
});

// Response (bag. 8.1)
router.get("/response-demo", (_req: Request, res: Response) => {
  res.set("Cache-Control", "no-store");
  res.status(200).json({
    status: true,
    message: "Contoh response JSON",
  });
});

router.get("/response-text", (_req: Request, res: Response) => {
  res.status(200).send("<h1>Halo dari Express</h1>");
});

router.get("/response-empty", (_req: Request, res: Response) => {
  res.sendStatus(204);
});

router.get("/response-redirect", (_req: Request, res: Response) => {
  res.redirect(302, "/api/food/pizza"); // Express 5: kode status ditulis lebih dulu
});

// Request body (bag. 7)
router.post("/data", (req: Request, res: Response) => {
  const { name, email } = req.body ?? {};

  res.status(201).json({
    message: "Data received",
    data: { name, email },
  });
});

// CRUD mock tanpa database (bag. 6)
router.get("/users", (_req: Request, res: Response) => {
  res.status(200).json({ message: "Retrieve all users" });
});

router.get("/users/:id", (req: Request, res: Response) => {
  const { id } = req.params;

  res.status(200).json({ message: `User with ID: ${id} found` });
});

router.post("/users", (req: Request, res: Response) => {
  const { name, email } = req.body ?? {};
  res.status(201).json({ message: "User created", data: { name, email } });
});

router.patch("/users/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const { email } = req.body ?? {};
  res.status(200).json({ message: `User with ID: ${id} updated`, data: { email } });
});

router.put("/users/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, email } = req.body ?? {};
  res.status(200).json({ message: `User with ID: ${id} replaced`, data: { name, email } });
});

router.delete("/users/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  res.status(200).json({ message: `User with ID: ${id} deleted` });
});

// Demo Express 5: error dari handler async otomatis diteruskan ke errorHandler
router.get("/boom", async (_req: Request, _res: Response) => {
  throw new Error("boom");
});

export default router;
