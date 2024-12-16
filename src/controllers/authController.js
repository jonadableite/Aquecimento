import bcrypt from "bcryptjs";
import crypto from "crypto";
import Redis from "ioredis";
import nodemailer from "nodemailer";
import User from "../models/User.js";

const redis = new Redis(process.env.REDIS_URL); // Configuração do Redis para armazenar códigos temporariamente

export const forgotPasswordController = {
	async sendResetCode(req, res) {
		const { email } = req.body;

		try {
			// Verificar se o usuário existe
			const user = await User.findOne({ email });
			if (!user) {
				return res.status(404).json({
					success: false,
					message: "Usuário não encontrado",
				});
			}

			// Gerar código de recuperação
			const resetCode = crypto.randomInt(100000, 999999).toString();

			// Armazenar código no Redis com expiração de 15 minutos
			await redis.set(`reset_code:${email}`, resetCode, "EX", 900);

			// Enviar email
			const transporter = nodemailer.createTransport({
				// Configurações do seu serviço de email
				service: "gmail",
				auth: {
					user: process.env.EMAIL_USER,
					pass: process.env.EMAIL_PASS,
				},
			});

			await transporter.sendMail({
				from: '"Sua Plataforma" <noreply@suaplataforma.com>',
				to: email,
				subject: "Código de Recuperação de Senha",
				html: `
                    <h1>Código de Recuperação</h1>
                    <p>Seu código de recuperação é: <strong>${resetCode}</strong></p>
                    <p>Este código expira em 15 minutos.</p>
                `,
			});

			res.status(200).json({
				success: true,
				message: "Código de recuperação enviado",
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				message: "Erro ao processar recuperação de senha",
			});
		}
	},

	async verifyResetCode(req, res) {
		const { email, code } = req.body;

		try {
			const storedCode = await redis.get(`reset_code:${email}`);

			if (storedCode === code) {
				res.status(200).json({
					success: true,
					message: "Código verificado com sucesso",
				});
			} else {
				res.status(400).json({
					success: false,
					message: "Código inválido",
				});
			}
		} catch (error) {
			res.status(500).json({
				success: false,
				message: "Erro ao verificar código",
			});
		}
	},

	async resetPassword(req, res) {
		const { email, newPassword, code } = req.body;

		try {
			// Verificar código
			const storedCode = await redis.get(`reset_code:${email}`);
			if (storedCode !== code) {
				return res.status(400).json({
					success: false,
					message: "Código de recuperação inválido",
				});
			}

			// Encontrar usuário
			const user = await User.findOne({ email });
			if (!user) {
				return res.status(404).json({
					success: false,
					message: "Usuário não encontrado",
				});
			}

			// Hash da nova senha
			const hashedPassword = await bcrypt.hash(newPassword, 10);

			// Atualizar senha
			user.password = hashedPassword;
			await user.save();

			// Remover código do Redis
			await redis.del(`reset_code:${email}`);

			res.status(200).json({
				success: true,
				message: "Senha redefinida com sucesso",
			});
		} catch (error) {
			res.status(500).json({
				success: false,
				message: "Erro ao redefinir senha",
			});
		}
	},
};
