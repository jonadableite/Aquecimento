import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fileUpload from "express-fileupload";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import morgan from "morgan";
import path from "path";
import stripe from "stripe";
import { fileURLToPath } from "url";
import { handleWebhook } from "./controllers/stripeController.js";
import { authMiddleware } from "./middlewares/auth.js";
import authRoutes from "./routes/authRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import instanceRoutes from "./routes/instanceRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import warmupRoutes from "./routes/warmupRoutes.js";

dotenv.config();

const app = express();

// Configurações de CORS
const corsOptions = {
	origin: "*",
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization", "apikey"],
	credentials: true,
};
app.use(cors(corsOptions));

// Limitação de taxa de requisições
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 1000,
});
app.use(limiter);

// Middlewares
app.use(morgan("combined"));
app.use(express.json({ limit: "800mb" }));
app.use(express.urlencoded({ limit: "800mb", extended: true }));
app.use(fileUpload());

// Servir arquivos estáticos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// Conexão com o MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
mongoose
	.connect(MONGODB_URI)
	.then(() => {
		console.log("Conectado ao MongoDB");
	})
	.catch((error) => {
		console.error("Erro ao conectar ao MongoDB:", error);
	});

// Configurar o Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeInstance = stripe(stripeSecretKey);

// Rotas públicas
app.use("/sessions", sessionRoutes);
app.use("/users", userRoutes);
app.use("/auth", authRoutes);

// Rota para receber os webhooks do Stripe (sem autenticação)
app.post("/webhook", express.raw({ type: "application/json" }), handleWebhook);

// Middleware de autenticação para rotas protegidas
app.use(authMiddleware);

// Rotas protegidas
app.use("/instances", instanceRoutes);
app.use("/warmup", warmupRoutes);
app.use("/dashboard", dashboardRoutes);

const PORT = process.env.PORT || 3050;
app.listen(PORT, () => {
	console.log(`Servidor rodando na porta ${PORT}`);
});

export { stripeInstance };
