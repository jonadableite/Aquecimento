import { PrismaClient } from "@prisma/client"; // Importação correta
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export const register = async (req, res) => {
	try {
		const { name, email, password } = req.body;

		// Verificar se o usuário já existe
		const userExists = await prisma.user.findUnique({ where: { email } });
		if (userExists) {
			return res.status(400).json({ error: "Usuário já cadastrado" });
		}

		// Criptografar a senha
		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		// Criar o usuário no banco de dados
		const user = await prisma.user.create({
			data: {
				name,
				email,
				password: hashedPassword,
			},
		});

		// Gerar o token JWT
		const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
			expiresIn: "1d",
		});

		res.status(201).json({
			success: true,
			message: "Usuário criado com sucesso",
			token,
		});
	} catch (error) {
		console.error("Erro ao criar usuário:", error);
		res.status(500).json({ error: "Erro ao criar usuário" });
	}
};

export const login = async (req, res) => {
	try {
		const { email, password } = req.body;

		// Verificar se o usuário existe
		const user = await prisma.user.findUnique({ where: { email } });
		if (!user) {
			return res.status(400).json({ error: "Usuário não encontrado" });
		}

		// Verificar a senha
		const isMatch = await bcrypt.compare(password, user.password);
		if (!isMatch) {
			return res.status(400).json({ error: "Senha inválida" });
		}

		// Gerar o token JWT
		const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
			expiresIn: "1d",
		});

		res.status(200).json({
			success: true,
			message: "Login realizado com sucesso",
			token,
		});
	} catch (error) {
		console.error("Erro ao fazer login:", error);
		res.status(500).json({ error: "Erro ao fazer login" });
	}
};

export const getMe = async (req, res) => {
	try {
		const user = await prisma.user.findUnique({
			where: { id: req.user.id },
		});
		if (!user) {
			return res.status(404).json({ error: "Usuário não encontrado" });
		}
		res.status(200).json({ success: true, user });
	} catch (error) {
		console.error("Erro ao obter usuário:", error);
		res.status(500).json({ error: "Erro ao obter usuário" });
	}
};

export const updateUser = async (req, res) => {
	try {
		const { name, email } = req.body;
		const user = await prisma.user.update({
			where: { id: req.user.id },
			data: { name, email },
		});
		res.status(200).json({ success: true, user });
	} catch (error) {
		console.error("Erro ao atualizar usuário:", error);
		res.status(500).json({ error: "Erro ao atualizar usuário" });
	}
};

export const deleteUser = async (req, res) => {
	try {
		await prisma.user.delete({ where: { id: req.user.id } });
		res.status(200).json({ success: true, message: "Usuário excluído" });
	} catch (error) {
		console.error("Erro ao excluir usuário:", error);
		res.status(500).json({ error: "Erro ao excluir usuário" });
	}
};

export default { register, login, getMe, updateUser, deleteUser };
