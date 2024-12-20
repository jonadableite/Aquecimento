// // src/models/WarmupStats.js
// import mongoose from "mongoose";

// const warmupStatsSchema = new mongoose.Schema(
// 	{
// 		instanceId: {
// 			type: String,
// 			required: true,
// 			unique: true,
// 		},
// 		status: {
// 			type: String,
// 			enum: ["paused", "running", "active"],
// 			default: "paused",
// 		},
// 		messagesSent: { type: Number, default: 0 },
// 		messagesReceived: { type: Number, default: 0 },
// 		mediaStats: {
// 			text: { type: Number, default: 0 },
// 			image: { type: Number, default: 0 },
// 			audio: { type: Number, default: 0 },
// 			sticker: { type: Number, default: 0 },
// 			reaction: { type: Number, default: 0 }, // Adicionado contador para reações enviadas
// 		},
// 		mediaReceived: {
// 			text: { type: Number, default: 0 },
// 			image: { type: Number, default: 0 },
// 			audio: { type: Number, default: 0 },
// 			sticker: { type: Number, default: 0 },
// 			reaction: { type: Number, default: 0 }, // Adicionado contador para reações recebidas
// 		},
// 		warmupTime: { type: Number, default: 0 },
// 		lastActive: { type: Date, default: Date.now },
// 		startTime: { type: Date },
// 		pauseTime: { type: Date },
// 		progress: { type: Number, default: 0 },
// 		user: {
// 			type: mongoose.Schema.Types.ObjectId,
// 			ref: "User",
// 		},
// 	},
// 	{ timestamps: true },
// );

// const WarmupStats = mongoose.model("WarmupStats", warmupStatsSchema);

// export default WarmupStats;
