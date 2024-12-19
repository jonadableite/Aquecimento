// src/middlewares/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authMiddleware = async (req, res, next) => {
	const authHeader = req.headers.authorization;

	if (!authHeader) {
		return res.status(401).json({ error: "Token não fornecido" });
	}

	const parts = authHeader.split(" ");

	if (parts.length !== 2) {
		return res.status(401).json({ error: "Erro no token" });
	}

	const [scheme, token] = parts;

	if (!/^Bearer$/i.test(scheme)) {
		return res.status(401).json({ error: "Token mal formatado" });
	}

	try {
		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const user = await User.findById(decoded.userId);

		if (!user) {
			return res.status(401).json({ error: "Usuário não encontrado" });
		}

		if (user.plan === "free" && new Date() > user.trialEndDate) {
			return res.status(403).json({
				error:
					"Seu período de teste expirou. Por favor, escolha um plano para continuar.",
			});
		}

		req.user = user;
		next();
	} catch (error) {
		return res.status(401).json({ error: "Token inválido" });
	}
};
