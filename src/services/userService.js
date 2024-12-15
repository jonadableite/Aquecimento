import bcrypt from "bcryptjs";
import User from "../models/User.js";

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

	// Cria o usuário
	const user = new User({
		name,
		email,
		password: hashedPassword,
		plan,
	});

	return user.save();
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
