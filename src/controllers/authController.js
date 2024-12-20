import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import dotenv from "dotenv";
import Redis from "ioredis";
import nodemailer from "nodemailer";

dotenv.config();

const prisma = new PrismaClient();

const redis = new Redis({
	host: process.env.REDIS_HOST || "painel.whatlead.com.br",
	port: process.env.REDIS_PORT || 6379,
	password: process.env.REDIS_PASSWORD || "91238983Jonadab",
});

const SMTP_SENDER_EMAIL =
	process.env.SMTP_SENDER_EMAIL || "whatLead Warmup <contato@whatlead.com.br>";
const SMTP_HOST = process.env.SMTP_HOST || "smtp.zoho.com";
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USERNAME = process.env.SMTP_USERNAME || "contato@whatlead.com.br";
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || "Brayan2802@";
const SMTP_AUTH_DISABLED = process.env.SMTP_AUTH_DISABLED === "true" || false;

export const forgotPasswordController = {
	async sendResetCode(req, res) {
		const { email } = req.body;

		try {
			// Verificar se o usuário existe
			const user = await prisma.user.findUnique({ where: { email } });
			if (!user) {
				return res.status(404).json({
					success: false,
					message: "Usuário não encontrado com este email.",
				});
			}

			// Gerar código de recuperação
			const resetCode = crypto.randomInt(100000, 999999).toString();

			// Armazenar código no Redis com expiração de 15 minutos
			await redis.set(`reset_code:${email}`, resetCode, "EX", 900);

			// Enviar email
			const transporter = nodemailer.createTransport({
				host: SMTP_HOST,
				port: SMTP_PORT,
				auth: {
					user: SMTP_USERNAME,
					pass: SMTP_PASSWORD,
				},
				tls: {
					minVersion: "TLSv1.2",
					requireTLS: true,
				},
			});

			await transporter.sendMail({
				from: SMTP_SENDER_EMAIL,
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
				message: "Código de recuperação enviado para seu email.",
			});
		} catch (error) {
			console.error("Erro ao enviar código de recuperação:", error);
			res.status(500).json({
				success: false,
				message:
					"Erro ao processar recuperação de senha. Tente novamente mais tarde.",
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
					message: "Código verificado com sucesso.",
				});
			} else {
				res.status(400).json({
					success: false,
					message: "Código de verificação inválido.",
				});
			}
		} catch (error) {
			console.error("Erro ao verificar código:", error);
			res.status(500).json({
				success: false,
				message: "Erro ao verificar código. Tente novamente mais tarde.",
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
					message: "Código de recuperação inválido.",
				});
			}

			// Encontrar usuário
			const user = await prisma.user.findUnique({ where: { email } });
			if (!user) {
				return res.status(404).json({
					success: false,
					message: "Usuário não encontrado com este email.",
				});
			}

			// Hash da nova senha
			const hashedPassword = await bcrypt.hash(newPassword, 10);

			// Atualizar senha
			await prisma.user.update({
				where: { email },
				data: { password: hashedPassword },
			});

			// Remover código do Redis
			await redis.del(`reset_code:${email}`);

			res.status(200).json({
				success: true,
				message: "Senha redefinida com sucesso.",
			});
		} catch (error) {
			console.error("Erro ao redefinir senha:", error);
			res.status(500).json({
				success: false,
				message: "Erro ao redefinir senha. Tente novamente mais tarde.",
			});
		}
	},
};
