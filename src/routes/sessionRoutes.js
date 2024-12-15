import express from "express";
import SessionController from "../controllers/sessionController.js";

const router = express.Router();

// Rota para login
router.post("/", SessionController.store);

export default router;
