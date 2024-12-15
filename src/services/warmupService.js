import axios from "axios";
import WarmupStats from "../models/WarmupStats.js";

const URL_API = "https://evo.whatlead.com.br";
const API_KEY = "429683C4C977415CAAFCCE10F7D57E11";

class WarmupService {
	constructor() {
		this.activeInstances = new Map();
	}

	async startWarmup(config) {
		for (const instance of config.phoneInstances) {
			const stats = await WarmupStats.findOne({
				instanceId: instance.instanceId,
			});
			if (stats && stats.status === "active") {
				await this.startInstanceTimer(instance.instanceId);
				this.startInstanceWarmup(instance, config);
			}
		}
	}

	async startInstanceTimer(instanceId) {
		let stats = await WarmupStats.findOne({ instanceId });

		if (!stats) {
			stats = new WarmupStats({ instanceId });
		}

		stats.status = "active";
		stats.startTime = new Date();
		await stats.save();

		const timer = setInterval(async () => {
			const currentStats = await WarmupStats.findOne({ instanceId });
			if (currentStats && currentStats.status === "active") {
				const newWarmupTime = currentStats.warmupTime + 1;
				const progress = (newWarmupTime / (480 * 3600)) * 100;

				await WarmupStats.updateOne(
					{ instanceId },
					{
						$set: {
							warmupTime: newWarmupTime,
							progress: Math.min(progress, 100),
							lastActive: new Date(),
						},
					},
				);
			}
		}, 1000);

		this.activeInstances.set(instanceId, timer);
	}

	async stopWarmup(instanceId) {
		const timer = this.activeInstances.get(instanceId);
		if (timer) {
			clearInterval(timer);
			this.activeInstances.delete(instanceId);
		}

		await WarmupStats.updateOne(
			{ instanceId },
			{
				$set: {
					status: "paused",
					pauseTime: new Date(),
				},
			},
		);
	}

	async startInstanceWarmup(instance, config) {
		console.log(
			`Iniciando aquecimento para a instância ${instance.instanceId}`,
		);

		while (true) {
			const stats = await WarmupStats.findOne({
				instanceId: instance.instanceId,
			});
			if (!stats || stats.status !== "active") {
				break;
			}

			for (const toInstance of config.phoneInstances) {
				if (instance.instanceId === toInstance.instanceId) continue;

				const randomText = this.getRandomItem(config.contents.texts);
				const randomImage = this.getRandomItem(config.contents.images);
				const randomAudio = this.getRandomItem(config.contents.audios);
				const randomSticker = this.getRandomItem(config.contents.stickers);

				const textSentMessageId = await this.sendMessage(
					instance.instanceId,
					toInstance.phoneNumber,
					randomText,
				);

				if (textSentMessageId) {
					await this.delay(config.config.minDelay, config.config.maxDelay);

					if (Math.random() < config.config.reactionChance) {
						await this.sendReaction(
							instance.instanceId,
							toInstance.phoneNumber,
							textSentMessageId,
							config,
						);
					}

					if (Math.random() < config.config.imageChance) {
						await this.sendMessage(
							instance.instanceId,
							toInstance.phoneNumber,
							{
								type: "image",
								url: randomImage,
							},
						);
					}

					if (Math.random() < config.config.audioChance) {
						await this.sendAudio(
							instance.instanceId,
							toInstance.phoneNumber,
							randomAudio,
						);
					}

					if (Math.random() < config.config.stickerChance) {
						await this.sendSticker(
							instance.instanceId,
							toInstance.phoneNumber,
							randomSticker,
						);
					}
				}

				await this.delay(5000, 30000);
			}
		}
	}

	async sendMessage(instanceId, to, content) {
		const instanceExists = await this.checkInstanceExists(instanceId);
		if (!instanceExists) {
			console.error(`Instância ${instanceId} não está disponível`);
			return false;
		}

		try {
			const isImage = typeof content !== "string" && content.type === "image";

			const endpoint = isImage
				? `${URL_API}/message/sendMedia/${instanceId}`
				: `${URL_API}/message/sendText/${instanceId}`;

			const payload = isImage
				? {
						number: to,
						mediatype: "image",
						media: content.url,
						fileName: "image.jpg",
						options: { delay: 5, linkPreview: false },
					}
				: {
						number: to,
						text: content,
						options: { delay: 0, linkPreview: false },
					};

			const response = await axios.post(endpoint, payload, {
				headers: {
					"Content-Type": "application/json",
					apikey: API_KEY,
				},
			});

			const messageId = response.data?.key?.id;
			console.log(
				`Mensagem enviada para ${to} via ${instanceId}. ID: ${messageId}`,
			);

			await WarmupStats.updateOne(
				{ instanceId },
				{
					$inc: {
						messagesSent: 1,
						[`mediaStats.${isImage ? "image" : "text"}`]: 1,
					},
					$set: {
						lastActive: new Date(),
					},
				},
			);

			if (Math.random() < 0.5) {
				await WarmupStats.updateOne(
					{ instanceId },
					{
						$inc: {
							messagesReceived: 1,
						},
					},
				);
			}

			return messageId || true;
		} catch (error) {
			console.error(
				`Erro ao enviar mensagem para ${to}:`,
				error.response?.data || error.message,
			);
			return false;
		}
	}

	async sendAudio(instanceId, to, audioUrl) {
		try {
			const payload = {
				number: to,
				audio: audioUrl,
				options: {
					delay: 1200,
					encoding: true,
				},
			};

			const response = await axios.post(
				`${URL_API}/message/sendWhatsAppAudio/${instanceId}`,
				payload,
				{
					headers: {
						"Content-Type": "application/json",
						apikey: API_KEY,
					},
				},
			);

			const messageId = response.data?.key?.id;
			console.log(
				`Áudio enviado para ${to} via ${instanceId}. ID: ${messageId}`,
			);

			await WarmupStats.updateOne(
				{ instanceId },
				{
					$inc: {
						messagesSent: 1,
						"mediaStats.audio": 1,
					},
					$set: {
						lastActive: new Date(),
					},
				},
			);

			return messageId || true;
		} catch (error) {
			console.error(
				`Erro ao enviar áudio para ${to}:`,
				error.response?.data || error.message,
			);
			return false;
		}
	}

	async sendSticker(instanceId, to, stickerUrl) {
		try {
			const payload = {
				number: to,
				sticker: stickerUrl,
				options: {
					delay: 1200,
				},
			};

			const response = await axios.post(
				`${URL_API}/message/sendSticker/${instanceId}`,
				payload,
				{
					headers: {
						"Content-Type": "application/json",
						apikey: API_KEY,
					},
				},
			);

			console.log(`Sticker enviado para ${to} via ${instanceId}`);
			return true;
		} catch (error) {
			console.error(
				`Erro ao enviar sticker para ${to}:`,
				error.response?.data || error.message,
			);
			return false;
		}
	}

	async sendReaction(instanceId, to, messageId, config) {
		try {
			const reaction = this.getRandomItem(config.contents.emojis);

			const payload = {
				key: {
					remoteJid: to,
					fromMe: true,
					id: messageId,
				},
				reaction: reaction,
			};

			const response = await axios.post(
				`${URL_API}/message/sendReaction/${instanceId}`,
				payload,
				{
					headers: {
						"Content-Type": "application/json",
						apikey: API_KEY,
					},
				},
			);

			console.log(`Reação ${reaction} enviada para ${to} via ${instanceId}`);
			return true;
		} catch (error) {
			console.error(
				`Erro ao enviar reação para ${to}:`,
				error.response?.data || error.message,
			);
			return false;
		}
	}

	async checkInstanceExists(instanceId) {
		try {
			const response = await axios.get(
				`${URL_API}/instance/connect/${instanceId}`,
				{
					headers: {
						"Content-Type": "application/json",
						apikey: API_KEY,
					},
				},
			);
			return response.status === 200;
		} catch (error) {
			console.error(`Erro ao verificar instância ${instanceId}:`, error);
			return false;
		}
	}

	getRandomItem(items) {
		return items[Math.floor(Math.random() * items.length)];
	}

	delay(min, max) {
		const delay = Math.floor(Math.random() * (max - min + 1)) + min;
		return new Promise((resolve) => setTimeout(resolve, delay));
	}

	async getInstanceStats(instanceId) {
		return WarmupStats.findOne({ instanceId });
	}

	async getAllInstancesStats() {
		return WarmupStats.find();
	}
}

export default new WarmupService();
