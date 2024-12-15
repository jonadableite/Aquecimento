import express from "express";
import WarmupStats from "../models/WarmupStats.js";
import warmupService from "../services/warmupService.js";

const router = express.Router();

// Rota para iniciar a configuração de aquecimento
router.post("/warmup/config", async (req, res) => {
	try {
		const config = req.body;

		// Extrai os IDs das instâncias do corpo da requisição
		const instanceIds = config.phoneInstances.map((inst) => inst.instanceId);

		// Atualiza o status das instâncias para "active"
		await WarmupStats.updateMany(
			{ instanceId: { $in: instanceIds }, user: req.user._id },
			{
				status: "active",
				startTime: new Date(),
			},
		);

		// Inicia o aquecimento usando o serviço
		await warmupService.startWarmup(config);
		res.json({
			success: true,
			message: "Configuração de aquecimento iniciada com sucesso",
		});
	} catch (error) {
		console.error("Erro ao configurar aquecimento:", error);
		res
			.status(500)
			.json({ success: false, message: "Erro ao configurar aquecimento" });
	}
});

// Rota para parar o aquecimento de uma instância específica
router.post("/stop/:instanceId", async (req, res) => {
	try {
		const { instanceId } = req.params;
		await warmupService.stopWarmup(instanceId);
		res.json({ success: true, message: "Aquecimento parado com sucesso" });
	} catch (error) {
		console.error("Erro ao parar aquecimento:", error);
		res
			.status(500)
			.json({ success: false, message: "Erro ao parar aquecimento" });
	}
});

// Rota para parar o aquecimento de todas as instâncias
router.post("/stop-all", async (req, res) => {
	try {
		await WarmupStats.updateMany(
			{ status: "active", user: req.user._id },
			{
				status: "paused",
				pauseTime: new Date(),
			},
		);
		res.json({
			success: true,
			message: "Aquecimento de todas as instâncias parado com sucesso",
		});
	} catch (error) {
		console.error("Erro ao parar aquecimento de todas as instâncias:", error);
		res.status(500).json({
			success: false,
			message: "Erro ao parar aquecimento de todas as instâncias",
		});
	}
});

// Rota para obter estatísticas de uma instância específica
router.get("/stats/:instanceId", async (req, res) => {
	try {
		const { instanceId } = req.params;
		const stats = await warmupService.getInstanceStats(instanceId);
		res.json(stats);
	} catch (error) {
		console.error("Erro ao buscar estatísticas:", error);
		res.status(500).json({ error: "Erro ao buscar estatísticas" });
	}
});

// Rota para obter estatísticas de todas as instâncias
router.get("/stats", async (req, res) => {
	try {
		const stats = await warmupService.getAllInstancesStats();
		res.json(stats);
	} catch (error) {
		console.error("Erro ao buscar estatísticas:", error);
		res.status(500).json({ error: "Erro ao buscar estatísticas" });
	}
});

export default router;
