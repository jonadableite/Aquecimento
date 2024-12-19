// src/services/warmupService.js
import axios from "axios";
import WarmupStatsModel from "../models/WarmupStats.js";

const URL_API = "https://evo.whatlead.com.br";
const API_KEY = "429683C4C977415CAAFCCE10F7D57E11";

class WarmupService {
	constructor() {
		this.activeInstances = new Map();
		this.stop = false;
	}

	async startWarmup(config) {
		this.stop = false;
		for (const instance of config.phoneInstances) {
			await this.startInstanceTimer(instance.instanceId);
			this.startInstanceWarmup(instance, config);
		}
	}

	async startInstanceTimer(instanceId) {
		let stats = await WarmupStatsModel.findOne({ instanceId });

		if (!stats) {
			stats = new WarmupStatsModel({ instanceId });
		}

		stats.status = "active";
		stats.startTime = new Date();
		await stats.save();

		const timer = setInterval(async () => {
			if (this.stop) {
				clearInterval(timer);
				return;
			}

			const currentStats = await WarmupStatsModel.findOne({ instanceId });
			if (currentStats && currentStats.status === "active") {
				const newWarmupTime = (currentStats.warmupTime || 0) + 1;
				const progress = (newWarmupTime / (480 * 3600)) * 100;

				await WarmupStatsModel.updateOne(
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
		this.stop = true;
		const timer = this.activeInstances.get(instanceId);
		if (timer) {
			clearInterval(timer);
			this.activeInstances.delete(instanceId);
		}

		await WarmupStatsModel.updateOne(
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

		while (!this.stop) {
			// Buscar o status da instância a cada iteração
			const stats = await WarmupStatsModel.findOne({
				instanceId: instance.instanceId,
			});
			if (stats && stats.status !== "active") {
				console.log(
					`Aquecimento para a instância ${instance.instanceId} foi pausado.`,
				);
				break;
			}
			for (const toInstance of config.phoneInstances) {
				if (this.stop || instance.instanceId === toInstance.instanceId)
					continue;

				try {
					// Enviar texto
					const randomText = this.getRandomItem(config.contents.texts);
					const textMessageId = await this.sendMessage(
						instance.instanceId,
						toInstance.phoneNumber,
						randomText,
						"text",
					);

					if (textMessageId) {
						await this.delay(config.config.minDelay, config.config.maxDelay);

						// Enviar reação
						if (Math.random() < config.config.reactionChance) {
							await this.sendReaction(
								instance.instanceId,
								toInstance.phoneNumber,
								textMessageId,
								config,
							);
						}

						// Enviar imagem
						if (
							config.contents.images &&
							config.contents.images.length > 0 &&
							Math.random() < config.config.stickerChance
						) {
							const randomImage = this.getRandomItem(config.contents.images);
							const base64Image = this.extractBase64(randomImage);
							if (base64Image) {
								await this.sendMessage(
									instance.instanceId,
									toInstance.phoneNumber,
									{ type: "image", url: base64Image },
									"image",
								);
							}
						}

						// Enviar áudio
						if (
							config.contents.audios &&
							config.contents.audios.length > 0 &&
							Math.random() < config.config.audioChance
						) {
							const randomAudio = this.getRandomItem(config.contents.audios);
							const base64Audio = this.extractBase64(randomAudio);
							if (base64Audio) {
								await this.sendAudioMessage(
									instance.instanceId,
									toInstance.phoneNumber,
									base64Audio,
								);
							}
						}
						// Enviar vídeo
						if (
							config.contents.videos &&
							config.contents.videos.length > 0 &&
							Math.random() < config.config.videoChance
						) {
							const randomVideo = this.getRandomItem(config.contents.videos);
							const base64Video = this.extractBase64(randomVideo);
							if (base64Video) {
								await this.sendMessage(
									instance.instanceId,
									toInstance.phoneNumber,
									{ type: "video", url: base64Video },
									"video",
								);
							}
						}
						// Enviar sticker
						if (
							config.contents.stickers &&
							config.contents.stickers.length > 0 &&
							Math.random() < config.config.stickerChance
						) {
							const randomSticker = this.getRandomItem(
								config.contents.stickers,
							);
							const base64Sticker = this.extractBase64(randomSticker);
							if (base64Sticker) {
								await this.sendStickerMessage(
									instance.instanceId,
									toInstance.phoneNumber,
									base64Sticker,
								);
							}
						}
					}

					await this.delay(5000, 30000);
				} catch (error) {
					console.error(`Erro no warmup de ${instance.instanceId}:`, error);
				}
			}
		}
	}

	async sendMessage(instanceId, to, content, messageType) {
		try {
			const isMedia = typeof content === "object" && content.type !== "text";

			const endpoint = isMedia
				? `${URL_API}/message/sendMedia/${instanceId}`
				: `${URL_API}/message/sendText/${instanceId}`;

			const payload = isMedia
				? {
						number: to,
						mediatype: content.type,
						media: content.url,
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
				`${messageType.toUpperCase()} enviado para ${to} via ${instanceId}. ID: ${messageId}`,
			);

			await this.updateMediaStats(instanceId, messageType);
			return messageId;
		} catch (error) {
			console.error(
				`Erro ao enviar ${messageType} para ${to}:`,
				error.response?.data || error.message,
			);
			return false;
		}
	}
	async sendAudioMessage(instanceId, to, audioBase64) {
		try {
			const response = await axios.post(
				`${URL_API}/message/sendWhatsAppAudio/${instanceId}`,
				{
					number: to,
					audio: audioBase64,
					encoding: true, // Adicionando a opção de encoding
				},
				{
					headers: {
						"Content-Type": "application/json",
						apikey: API_KEY,
					},
				},
			);
			const messageId = response.data?.key?.id;
			console.log(
				`AUDIO enviado para ${to} via ${instanceId}. ID: ${messageId}`,
			);
			await this.updateMediaStats(instanceId, "audio");
			return messageId;
		} catch (error) {
			console.error(
				`Erro ao enviar áudio para ${to}:`,
				error.response?.data || error.message,
			);
			return false;
		}
	}
	async sendStickerMessage(instanceId, to, stickerBase64) {
		try {
			const response = await axios.post(
				`${URL_API}/message/sendSticker/${instanceId}`,
				{
					number: to,
					sticker: stickerBase64,
				},
				{
					headers: {
						"Content-Type": "application/json",
						apikey: API_KEY,
					},
				},
			);
			const messageId = response.data?.key?.id;
			console.log(
				`STICKER enviado para ${to} via ${instanceId}. ID: ${messageId}`,
			);
			await this.updateMediaStats(instanceId, "sticker");
			return messageId;
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

			await axios.post(
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

	getRandomItem(items) {
		return items[Math.floor(Math.random() * items.length)];
	}

	delay(min, max) {
		const delay = Math.floor(Math.random() * (max - min + 1)) + min;
		return new Promise((resolve) => setTimeout(resolve, delay));
	}
	async updateMediaStats(instanceId, mediaType) {
		try {
			const stats = await WarmupStatsModel.findOne({ instanceId });
			if (stats) {
				const mediaStats = stats.mediaStats || {};
				mediaStats[mediaType] = (mediaStats[mediaType] || 0) + 1;
				await WarmupStatsModel.updateOne(
					{ instanceId },
					{ $set: { mediaStats } },
				);
			}
		} catch (error) {
			console.error(
				`Erro ao atualizar estatísticas de mídia para ${instanceId}:`,
				error,
			);
		}
	}
	extractBase64(dataUrl) {
		try {
			return dataUrl.split(",")[1];
		} catch (error) {
			console.error("Erro ao extrair base64:", error);
			return null;
		}
	}
}

export default new WarmupService();
