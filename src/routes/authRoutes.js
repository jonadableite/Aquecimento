import express from "express";
import { forgotPasswordController } from "../controllers/authController.js";

const router = express.Router();

// Rota para enviar código de recuperação
router.post("/forgot-password", forgotPasswordController.sendResetCode);

// Rota para verificar código de recuperação
router.post("/verify-reset-code", forgotPasswordController.verifyResetCode);

// Rota para redefinir senha
router.post("/reset-password", forgotPasswordController.resetPassword);

export default router;
