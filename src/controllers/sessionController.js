// src/controllers/sessionController.js
import * as Yup from "yup";
import { stripeInstance } from "../app.js";
import * as sessionService from "../services/sessionService.js";

class SessionController {
	async store(req, res) {
		const schema = Yup.object().shape({
			email: Yup.string()
				.email("E-mail inválido")
				.required("E-mail é obrigatório"),
			password: Yup.string().required("Senha é obrigatória"),
		});

		try {
			// Validação dos dados de entrada
			await schema.validate(req.body, { abortEarly: false });

			const { email, password } = req.body;

			// Autentica o usuário usando o serviço
			const user = await sessionService.authenticateUser(email, password);

			if (!user) {
				return res.status(401).json({ error: "Usuário não encontrado" });
			}

			// Gera o token JWT
			const token = sessionService.generateToken(user);

			const { _id, name, plan, status } = user;

			// Retorna a resposta de sucesso
			return res.json({
				token,
				user: {
					id: _id,
					name,
					email,
					plan,
					status,
				},
			});
		} catch (error) {
			if (error instanceof Yup.ValidationError) {
				return res.status(400).json({ errors: error.errors });
			}
			console.error("Erro ao autenticar usuário:", error);
			return res.status(500).json({ error: "Erro ao autenticar usuário" });
		}
	}

	async getSessionStatus(req, res) {
		const { session_id } = req.query;

		try {
			const session =
				await stripeInstance.checkout.sessions.retrieve(session_id);
			res.status(200).json({
				status: session.status,
				customer_email: session.customer_details.email,
			});
		} catch (error) {
			console.error("Erro ao obter status da sessão:", error);
			res.status(500).json({ error: "Erro ao obter status da sessão" });
		}
	}
}

export default new SessionController();
