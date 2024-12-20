import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

/**
 * Autentica um usuário.
 * @param {String} email - Email do usuário.
 * @param {String} password - Senha do usuário.
 * @returns {Promise<Object>} - Usuário autenticado.
 */
export const authenticateUser = async (email, password) => {
	try {
		const user = await prisma.user.findUnique({ where: { email } });
		if (!user) {
			throw new Error("Credenciais inválidas");
		}

		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			throw new Error("Credenciais inválidas");
		}

		return user;
	} catch (error) {
		console.error("Erro ao autenticar usuário:", error);
		throw error;
	}
};

/**
 * Gera um token JWT para um usuário.
 * @param {Object} user - Usuário para o qual o token será gerado.
 * @returns {String} - Token JWT.
 */
export const generateToken = (user) => {
	try {
		return jwt.sign(
			{ userId: user.id, plan: user.plan },
			process.env.JWT_SECRET,
			{
				expiresIn: "30d",
			},
		);
	} catch (error) {
		console.error("Erro ao gerar token:", error);
		throw error;
	}
};
