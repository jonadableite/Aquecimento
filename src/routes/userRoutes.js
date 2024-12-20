import express from "express";
import {
	createCheckoutSessionController,
	createCustomer,
	createSubscription,
	manageSubscription,
} from "../controllers/stripeController.js";
import {
	deleteUser,
	getMe,
	login,
	register,
	updateUser,
} from "../controllers/userController.js";
import { authMiddleware as protect } from "../middlewares/auth.js";

const router = express.Router();

// Rotas de usuário (sem autenticação)
router.post("/", register);
router.post("/login", login);

// Rotas de usuário (com autenticação)
router.get("/me", protect, getMe);
router.put("/update", protect, updateUser);
router.delete("/delete", protect, deleteUser);

// Rotas do Stripe (com autenticação)
router.post("/create-customer", protect, createCustomer);
router.post("/create-subscription", protect, createSubscription);
router.post("/manage-subscription", protect, manageSubscription);
router.post(
	"/create-checkout-session",
	protect,
	createCheckoutSessionController,
);

export default router;
