import express from "express";
import UserController from "../controllers/userController.js";

const router = express.Router();

// Rota para criar um novo usuário (pública)
router.post("/", UserController.store);

export default router;
