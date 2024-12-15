import mongoose from "mongoose";

const warmupStatsSchema = new mongoose.Schema({
	instanceId: { type: String, required: true, unique: true },
	messagesSent: { type: Number, default: 0 },
	messagesReceived: { type: Number, default: 0 },
	mediaStats: {
		text: { type: Number, default: 0 },
		image: { type: Number, default: 0 },
		video: { type: Number, default: 0 },
		audio: { type: Number, default: 0 },
		sticker: { type: Number, default: 0 },
	},
	warmupTime: { type: Number, default: 0 },
	lastActive: { type: Date, default: Date.now },
	status: { type: String, enum: ["active", "paused"], default: "paused" },
	startTime: { type: Date },
	pauseTime: { type: Date },
	user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const WarmupStats = mongoose.model("WarmupStats", warmupStatsSchema);

export default WarmupStats;
