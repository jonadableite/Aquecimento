import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fileUpload from "express-fileupload";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { authMiddleware } from "./middlewares/auth.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import instanceRoutes from "./routes/instanceRoutes.js";
import sessionRoutes from "./routes/sessionRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import warmupRoutes from "./routes/warmupRoutes.js";

// Configurar dotenv
dotenv.config();

const app = express();

// Configurações de CORS
const corsOptions = {
	origin: "*", // Em produção, especifique os domínios permitidos
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization", "apikey"],
	credentials: true,
};
app.use(cors(corsOptions));

// Limitação de taxa de requisições
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutos
	max: 1000, // Limite de 1000 requisições por IP
});
app.use(limiter);

// Middlewares
app.use(morgan("combined")); // Logs de requisições
app.use(express.json({ limit: "800mb" }));
app.use(express.urlencoded({ limit: "800mb", extended: true }));
app.use(fileUpload()); // Use o middleware aqui

// Servir arquivos estáticos
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// Conexão com o MongoDB
mongoose
	.connect(process.env.MONGODB_URI)
	.then(() => {
		console.log("Conectado ao MongoDB");
	})
	.catch((error) => {
		console.error("Erro ao conectar ao MongoDB:", error);
	});

// Rotas públicas
app.use("/sessions", sessionRoutes); // Rotas de sessão para login
app.use("/users", userRoutes); // Rotas de usuário para registro (pública)

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
