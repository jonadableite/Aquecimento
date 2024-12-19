// src/routes/sessionRoutes.js
import express from "express";
import SessionController from "../controllers/sessionController.js";

const router = express.Router();

// Rota para login
router.post("/", SessionController.store);

// Rota para obter o status da sessão do Stripe
router.get("/session-status", SessionController.getSessionStatus);

export default router;
