// src/routes/instanceRoutes.js
import axios from "axios";
import express from "express";
import { authMiddleware } from "../middlewares/auth.js";

const router = express.Router();
const API_URL = "https://evo.whatlead.com.br";
const API_KEY = "429683C4C977415CAAFCCE10F7D57E11";

// Aplicar middleware de autenticação em todas as rotas
router.use(authMiddleware);

// Função para buscar e atualizar o status das instâncias
const fetchAndUpdateInstanceStatuses = async () => {
	try {
		const instances = await Instance.find();

		for (const instance of instances) {
			try {
				const response = await axios.get(
					`${API_URL}/instance/connectionState/${instance.instanceName}`,
					{
						headers: {
							apikey: API_KEY,
						},
					},
				);

				if (response.status === 200 && response.data.instance) {
					const currentStatus = response.data.instance.state;

					if (instance.connectionStatus !== currentStatus) {
						instance.connectionStatus = currentStatus;
						await instance.save();
						console.log(
							`Status da instância ${instance.instanceName} atualizado para ${currentStatus}`,
						);
					}
				}
			} catch (error) {
				console.error(
					`Erro ao verificar status da instância ${instance.instanceName}:`,
					error.message,
				);
			}
		}
	} catch (error) {
		console.error("Erro ao atualizar status das instâncias:", error);
	}
};

// Rota para criar uma nova instância
router.post("/createInstance", async (req, res) => {
	try {
		const { instanceName } = req.body;

		const evoResponse = await axios.post(
			`${API_URL}/instance/create`,
			{
				instanceName,
				integration: "WHATSAPP-BAILEYS",
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
			instanceName: instanceName,
			integration: instanceData.integration,
			connectionStatus: instanceData.status || "pending",
		});

		await WarmupStats.create({
			instanceId: newInstance._id, // Usar o _id da instância recém-criada
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
router.get("/", async (req, res) => {
	try {
		await fetchAndUpdateInstanceStatuses(); // Busca e atualiza o status antes de listar

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

		// Buscar todas as instâncias da API da Evo
		const evoResponse = await axios.get(`${API_URL}/instance/fetchInstances`, {
			headers: {
				apikey: API_KEY,
			},
		});

		if (evoResponse.status !== 200 || !evoResponse.data) {
			console.error(
				"Erro ao buscar instâncias da API da Evo:",
				evoResponse.data,
			);
			return res
				.status(500)
				.json({ error: "Erro ao buscar instâncias da API da Evo" });
		}

		const evoInstances = evoResponse.data;

		// Mapear as instâncias do banco de dados com as da API da Evo
		const instancesWithRemoteJid = await Promise.all(
			instances.map(async (instance) => {
				const evoInstance = evoInstances.find(
					(evo) => evo.name === instance.instanceName,
				);
				if (evoInstance) {
					// Atualizar a instância com os dados da API da Evo
					instance.ownerJid = evoInstance.ownerJid;
					instance.profilePicUrl = evoInstance.profilePicUrl;
					instance.integration = evoInstance.integration;
					instance.token = evoInstance.token;
					instance.createdAt = evoInstance.createdAt;
					instance.updatedAt = evoInstance.updatedAt;
					await instance.save();

					return {
						...instance.toObject(),
						ownerJid: evoInstance.ownerJid,
						profileName: evoInstance.profileName,
						profilePicUrl: evoInstance.profilePicUrl,
						integration: evoInstance.integration,
						token: evoInstance.token,
						createdAt: evoInstance.createdAt,
						updatedAt: evoInstance.updatedAt,
					};
				}
				return instance.toObject();
			}),
		);

		res.status(200).json({
			instances: instancesWithRemoteJid,
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
