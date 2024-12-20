import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getDashboardStats = async (req, res) => {
	const userId = req.user.id;
	try {
		const stats = await prisma.warmupStats.findMany({
			where: { userId: userId },
		});

		console.log(
			"Dados do WarmupStats:",
			stats.map((stat) => ({
				instanceId: stat.instanceId,
				warmupTime: stat.warmupTime,
			})),
		);

		const totalWarmups = stats.length;
		const activeInstances = stats.filter(
			(stat) => stat.status === "active",
		).length;
		const totalMessages = stats.reduce(
			(sum, stat) => sum + (stat.messagesSent || 0),
			0,
		);

		const totalWarmupTime = stats.reduce(
			(sum, stat) => sum + (stat.warmupTime || 0),
			0,
		);
		const averageTimeInHours =
			totalWarmups > 0 ? totalWarmupTime / (totalWarmups * 3600) : 0;

		const instanceProgress = stats.map((stat) => {
			const progress = Math.min(
				((stat.warmupTime || 0) / (480 * 3600)) * 100,
				100,
			);
			return {
				label: stat.instanceId,
				value: progress,
				color: progress >= 100 ? "bg-green-500" : "bg-blue-500",
			};
		});

		const messageTypes = [
			{
				label: "Text",
				value: stats.reduce(
					(sum, stat) => sum + (stat.mediaStats?.text || 0),
					0,
				),
				color: "bg-green-500",
			},
			{
				label: "Image",
				value: stats.reduce(
					(sum, stat) => sum + (stat.mediaStats?.image || 0),
					0,
				),
				color: "bg-blue-500",
			},
			{
				label: "Video",
				value: stats.reduce(
					(sum, stat) => sum + (stat.mediaStats?.video || 0),
					0,
				),
				color: "bg-red-500",
			},
			{
				label: "Audio",
				value: stats.reduce(
					(sum, stat) => sum + (stat.mediaStats?.audio || 0),
					0,
				),
				color: "bg-yellow-500",
			},
			{
				label: "Sticker",
				value: stats.reduce(
					(sum, stat) => sum + (stat.mediaStats?.sticker || 0),
					0,
				),
				color: "bg-purple-500",
			},
		];

		res.json({
			totalWarmups,
			activeInstances,
			totalMessages,
			averageTime: averageTimeInHours.toFixed(2),
			instanceProgress,
			messageTypes,
			instances: stats,
		});
	} catch (error) {
		console.error("Erro ao buscar estatísticas do dashboard:", error.message);
		res.status(500).json({ error: "Erro ao buscar estatísticas do dashboard" });
	}
};
