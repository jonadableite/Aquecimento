// src/controllers/userController.js
import * as Yup from "yup";
import * as userService from "../services/userService.js";
import logger from "../utils/logger.js";

class UserController {
	async store(req, res) {
		const schema = Yup.object().shape({
			name: Yup.string().required("Nome é obrigatório"),
			email: Yup.string()
				.email("E-mail inválido")
				.required("E-mail é obrigatório"),
			password: Yup.string()
				.min(6, "A senha deve ter pelo menos 6 caracteres")
				.required("Senha é obrigatória"),
		});

		try {
			await schema.validate(req.body, { abortEarly: false });

			const { user, token } = await userService.createUser(req.body);

			return res.status(201).json({
				token,
				user: {
					id: user._id,
					name: user.name,
					email: user.email,
					plan: user.plan,
					status: user.status,
					maxInstances: user.maxInstances,
					trialEndDate: user.trialEndDate,
					stripeCustomerId: user.stripeCustomerId,
				},
			});
		} catch (error) {
			if (error instanceof Yup.ValidationError) {
				return res.status(400).json({
					message: "Erro de validação",
					errors: error.errors,
				});
			}

			console.error("Erro detalhado:", error);
			logger.error("Erro ao criar usuário:", error);
			return res.status(500).json({
				message: "Erro interno do servidor",
				error: error.message,
			});
		}
	}

	async index(req, res) {
		try {
			const users = await userService.listUsers();
			return res.json(users);
		} catch (error) {
			logger.error("Erro ao listar usuários:", error);
			return res.status(500).json({ error: "Erro ao listar usuários" });
		}
	}

	async show(req, res) {
		try {
			const { id } = req.params;
			const user = await userService.getUser(id);
			return res.json(user);
		} catch (error) {
			logger.error("Erro ao exibir usuário:", error);
			return res.status(500).json({ error: "Erro ao exibir usuário" });
		}
	}

	async delete(req, res) {
		try {
			const { id } = req.params;
			await userService.deleteUser(id);
			return res.status(204).send();
		} catch (error) {
			logger.error("Erro ao excluir usuário:", error);
			return res.status(500).json({ error: "Erro ao excluir usuário" });
		}
	}

	async update(req, res) {
		const schema = Yup.object().shape({
			name: Yup.string(),
			email: Yup.string().email(),
			oldPassword: Yup.string().when("password", (password, field) =>
				password ? field.required() : field,
			),
			password: Yup.string().min(6),
			confirmPassword: Yup.string().when("password", (password, field) =>
				password ? field.required().oneOf([Yup.ref("password")]) : field,
			),
			status: Yup.boolean(),
			plan: Yup.string().oneOf(["free", "pro", "enterprise"]),
			maxInstances: Yup.number(),
		});

		try {
			await schema.validate(req.body, { abortEarly: false });

			const { id } = req.params;
			const response = await userService.updateUser(id, req.body);

			return res.json(response);
		} catch (error) {
			if (error instanceof Yup.ValidationError) {
				return res.status(400).json({ errors: error.errors });
			}

			logger.error("Erro ao atualizar usuário:", error);
			return res.status(500).json({ error: "Erro ao atualizar usuário" });
		}
	}
}

export default new UserController();
