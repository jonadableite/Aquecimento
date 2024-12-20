// src/routes/warmupRoutes.js
import express from "express";
import { authMiddleware } from "../middlewares/auth.js";
import warmupService from "../services/warmupService.js";

const router = express.Router();

// Middleware de autenticação
router.use(authMiddleware);

// Rota para configurar o aquecimento
router.post("/config", async (req, res) => {
	try {
		const { phoneInstances, contents, config } = req.body;

		console.log("Dados recebidos para configuração de aquecimento:", req.body);

		if (!phoneInstances || phoneInstances.length < 2) {
			return res
				.status(400)
				.json({ error: "Selecione pelo menos duas instâncias" });
		}

		// Atualizar o status para "active" e registrar o startTime
		for (const phoneInstance of phoneInstances) {
			let warmupStats = await WarmupStats.findOne({
				instanceId: phoneInstance.instanceId,
			});

			if (!warmupStats) {
				warmupStats = await WarmupStats.create({
					instanceId: phoneInstance.instanceId,
					user: req.user._id,
					status: "active",
					startTime: new Date(),
				});
			} else {
				warmupStats.status = "active";
				warmupStats.startTime = new Date();
				await warmupStats.save();
			}
		}

		await warmupService.startWarmup({
			phoneInstances: phoneInstances,
			contents: contents,
			config: config,
			user: req.user._id,
		});

		res.status(200).json({ success: true, message: "Aquecimento iniciado" });
	} catch (error) {
		console.error("Erro ao configurar aquecimento:", error);
		res.status(500).json({ error: "Erro ao configurar aquecimento" });
	}
});

// Rota para parar todos os aquecimentos
router.post("/stop-all", async (req, res) => {
	try {
		const warmupStats = await WarmupStats.find({
			user: req.user._id,
			status: "active",
		});

		for (const stats of warmupStats) {
			const timeDiff = Date.now() - new Date(stats.startTime).getTime();
			await WarmupStats.updateOne(
				{ _id: stats._id },
				{
					status: "paused",
					pauseTime: new Date(),
					$inc: {
						warmupTime: Math.floor(timeDiff / 1000),
					},
				},
			);
			await warmupService.stopWarmup(stats.instanceId);
		}

		console.log("Aquecimento parado para todas as instâncias:", warmupStats);

		res.status(200).json({ success: true, message: "Aquecimento parado" });
	} catch (error) {
		console.error("Erro ao parar aquecimento:", error);
		res.status(500).json({ error: "Erro ao parar aquecimento" });
	}
});

export default router;
