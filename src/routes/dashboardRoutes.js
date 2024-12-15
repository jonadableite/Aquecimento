import express from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";

const router = express.Router();

// Define a rota para obter as estatísticas do dashboard
router.get("/", getDashboardStats);

export default router;
