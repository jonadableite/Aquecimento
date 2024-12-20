import bcrypt from "bcryptjs";
import { prisma } from "../app.js";
import { generateToken } from "./sessionService.js";

/**
 * Cria um novo usuário.
 * @param {Object} userData - Dados do usuário.
 * @returns {Promise<Object>} - Usuário criado.
 */
export const createUser = async (userData) => {
	const { name, email, password, plan } = userData;

	// Verifica se o usuário já existe
	const existingUser = await prisma.user.findUnique({ where: { email } });
	if (existingUser) {
		throw new Error("Usuário já cadastrado com este email");
	}

	// Hash da senha
	const hashedPassword = await bcrypt.hash(password, 10);

	// Define a data de expiração do período de teste (7 dias a partir da data de criação)
	const trialEndDate = new Date();
	trialEndDate.setDate(trialEndDate.getDate() + 7);

	// Cria o usuário
	const user = await prisma.user.create({
		data: {
			name,
			email,
			password: hashedPassword,
			plan,
			trialEndDate,
		},
	});

	// Cria o WarmupStats para o usuário
	await prisma.warmupStats.create({
		data: { userId: user.id },
	});

	const token = generateToken(user);

	return {
		user,
		token,
	};
};

/**
 * Lista todos os usuários.
 * @returns {Promise<Array>} - Lista de usuários.
 */
export const listUsers = async () => {
	return prisma.user.findMany({
		select: {
			id: true,
			name: true,
			email: true,
			plan: true,
			trialEndDate: true,
			stripeCustomerId: true,
			stripeSubscriptionId: true,
			stripeSubscriptionStatus: true,
		},
	}); // Exclui a senha dos resultados
};

/**
 * Obtém um usuário pelo ID.
 * @param {String} id - ID do usuário.
 * @returns {Promise<Object>} - Usuário encontrado.
 */
export const getUser = async (id) => {
	return prisma.user.findUnique({
		where: { id },
		select: {
			id: true,
			name: true,
			email: true,
			plan: true,
			trialEndDate: true,
			stripeCustomerId: true,
			stripeSubscriptionId: true,
			stripeSubscriptionStatus: true,
		},
	}); // Exclui a senha do resultado
};

/**
 * Atualiza um usuário pelo ID.
 * @param {String} id - ID do usuário.
 * @param {Object} updateData - Dados para atualização.
 * @returns {Promise<Object>} - Usuário atualizado.
 */
export const updateUser = async (id, updateData) => {
	if (updateData.password) {
		updateData.password = await bcrypt.hash(updateData.password, 10);
	}
	return prisma.user.update({
		where: { id },
		data: updateData,
		select: {
			id: true,
			name: true,
			email: true,
			plan: true,
			trialEndDate: true,
			stripeCustomerId: true,
			stripeSubscriptionId: true,
			stripeSubscriptionStatus: true,
		},
	});
};

/**
 * Exclui um usuário pelo ID.
 * @param {String} id - ID do usuário.
 * @returns {Promise<void>}
 */
export const deleteUser = async (id) => {
	await prisma.user.delete({ where: { id } });
};
