// src/services/sessionService.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

// Use uma chave secreta diretamente no código para teste
const JWT_SECRET = "jhDesEF5YmLz6SUcTHglPqaYISJSLzJwk057q1jRZI8";

/**
 * Autentica um usuário.
 * @param {String} email - Email do usuário.
 * @param {String} password - Senha do usuário.
 * @returns {Promise<Object>} - Usuário autenticado.
 */
export const authenticateUser = async (email, password) => {
	const user = await User.findOne({ email });
	if (!user) {
		throw new Error("Credenciais inválidas");
	}

	const isMatch = await bcrypt.compare(password, user.password);
	if (!isMatch) {
		throw new Error("Credenciais inválidas");
	}

	return user;
};

/**
 * Gera um token JWT para um usuário.
 * @param {Object} user - Usuário para o qual o token será gerado.
 * @returns {String} - Token JWT.
 */
export const generateToken = (user) => {
	try {
		return jwt.sign({ userId: user._id, plan: user.plan }, JWT_SECRET, {
			expiresIn: "30d",
		});
	} catch (error) {
		console.error("Erro ao gerar token:", error);
		throw error;
	}
};
