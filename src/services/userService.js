// src/services/userService.js
import bcrypt from "bcryptjs";
import { stripeInstance } from "../app.js";
import User from "../models/User.js";
import WarmupStats from "../models/WarmupStats.js";
import { generateToken } from "./sessionService.js";

/**
 * Cria um novo usuário.
 * @param {Object} userData - Dados do usuário.
 * @returns {Promise<Object>} - Usuário criado.
 */
export const createUser = async (userData) => {
	const { name, email, password, plan } = userData;

	// Verifica se o usuário já existe
	const existingUser = await User.findOne({ email });
	if (existingUser) {
		throw new Error("Usuário já cadastrado com este email");
	}

	// Hash da senha
	const hashedPassword = await bcrypt.hash(password, 10);

	// Define a data de expiração do período de teste (7 dias a partir da data de criação)
	const trialEndDate = new Date();
	trialEndDate.setDate(trialEndDate.getDate() + 7);

	// Cria o usuário
	const user = new User({
		name,
		email,
		password: hashedPassword,
		plan,
		trialEndDate,
	});

	// Salva o usuário no banco de dados
	await user.save();

	// Cria o cliente no Stripe
	const customer = await stripeInstance.customers.create({
		email,
		name,
	});

	// Atualiza o usuário com o ID do cliente do Stripe
	user.stripeCustomerId = customer.id;
	await user.save();

	// Cria o WarmupStats para o usuário
	await WarmupStats.create({ userId: user._id });

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
	return User.find({}, "-password"); // Exclui a senha dos resultados
};

/**
 * Obtém um usuário pelo ID.
 * @param {String} id - ID do usuário.
 * @returns {Promise<Object>} - Usuário encontrado.
 */
export const getUser = async (id) => {
	return User.findById(id, "-password"); // Exclui a senha do resultado
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
	return User.findByIdAndUpdate(id, updateData, {
		new: true,
		runValidators: true,
	});
};

/**
 * Exclui um usuário pelo ID.
 * @param {String} id - ID do usuário.
 * @returns {Promise<void>}
 */
export const deleteUser = async (id) => {
	await User.findByIdAndDelete(id);
};
