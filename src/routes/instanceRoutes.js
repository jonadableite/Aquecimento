import axios from "axios";
import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import Instance from "../models/Instance.js";
import User from "../models/User.js"; // Certifique-se de importar o modelo User
import WarmupStats from "../models/WarmupStats.js";

const router = express.Router();
const API_URL = "https://evo.whatlead.com.br";
const API_KEY = "429683C4C977415CAAFCCE10F7D57E11";

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// Rota para criar uma nova instância
router.post("/createInstance", async (req, res) => {
	try {
		const { instanceName, integration, number } = req.body;

		const evoResponse = await axios.post(
			`${API_URL}/instance/create`,
			{
				instanceName,
				integration: integration || "WHATSAPP-BAILEYS",
				number: number || "",
				qrcode: true,
			},
			{
				headers: {
					"Content-Type": "application/json",
					apikey: API_KEY,
				},
			},
		);

		if (evoResponse.status !== 201 || !evoResponse.data.instance) {
			return res.status(400).json({ error: "Erro ao criar instância na Evo" });
		}

		const instanceData = evoResponse.data.instance;

		const newInstance = await Instance.createInstanceForUser(req.user._id, {
			instanceName: instanceData.instanceName,
			integration: instanceData.integration,
			number: instanceData.number,
			connectionStatus: instanceData.status || "pending",
		});

		await WarmupStats.create({
			instanceId: instanceData.instanceName, // Usando instanceName como identificador
			user: req.user._id,
			status: "paused",
		});

		res
			.status(201)
			.json({ instance: newInstance, qrcode: evoResponse.data.qrcode });
	} catch (error) {
		console.error("Erro ao criar instância:", error);
		res.status(500).json({
			error: error.response?.data?.message || "Erro ao criar instância",
		});
	}
});

// Rota para listar todas as instâncias do usuário
router.get("/instances", async (req, res) => {
	try {
		const instances = await Instance.find({ user: req.user._id });
		const user = await User.findById(req.user._id);

		if (!user) {
			return res.status(404).json({ error: "Usuário não encontrado" });
		}

		const instanceLimits = {
			free: 2,
			pro: 5,
			enterprise: Number.POSITIVE_INFINITY,
		};

		const instanceLimit = instanceLimits[user.plan] || 0;
		const remainingSlots = instanceLimit - instances.length;

		res.status(200).json({
			instances,
			currentPlan: user.plan,
			instanceLimit,
			remainingSlots,
		});
	} catch (error) {
		console.error("Erro ao buscar instâncias:", error);
		res.status(500).json({ error: "Erro ao buscar instâncias" });
	}
});

// Rota para deletar uma instância
router.delete("/instance/:id", async (req, res) => {
	try {
		const instanceId = req.params.id;
		await Instance.deleteOne({ _id: instanceId, user: req.user._id });
		await WarmupStats.deleteOne({ instanceId: instanceId, user: req.user._id });
		res.status(200).json({ message: "Instância deletada com sucesso" });
	} catch (error) {
		console.error("Erro ao deletar instância:", error);
		res.status(500).json({ error: "Erro ao deletar instância" });
	}
});

// Rota para atualizar uma instância
router.put("/instance/:id", async (req, res) => {
	try {
		const instanceId = req.params.id;
		const updateData = req.body;
		const updatedInstance = await Instance.findOneAndUpdate(
			{ _id: instanceId, user: req.user._id },
			updateData,
			{ new: true },
		);
		res.status(200).json(updatedInstance);
	} catch (error) {
		console.error("Erro ao atualizar instância:", error);
		res.status(500).json({ error: "Erro ao atualizar instância" });
	}
});

export default router;
