import express from "express";
import {
	createCheckoutSession,
	createSubscription,
	manageSubscription,
} from "../controllers/stripeController.js";
import UserController from "../controllers/userController.js";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();

// Rota para criar um novo usuário (pública)
router.post("/", UserController.store);

// Middleware de autenticação para as rotas do Stripe
router.use(authMiddleware);

// Rota para criar uma assinatura no Stripe
router.post("/create-subscription", createSubscription);

// Rota para gerenciar a assinatura do cliente
router.get("/manage-subscription", manageSubscription);

// Rota para criar a sessão de checkout do Stripe
router.post("/create-checkout-session", createCheckoutSession);

export default router;
