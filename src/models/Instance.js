import mongoose from "mongoose";

const instanceSchema = new mongoose.Schema(
	{
		instanceName: { type: String, required: true, unique: true },
		connectionStatus: {
			type: String,
			enum: ["open", "connecting", "disconnected", "pending"],
			default: "pending",
		},
		ownerJid: { type: String, default: null },
		profilePicUrl: { type: String, default: null },
		integration: {
			type: String,
			enum: ["WHATSAPP-BAILEYS", "WHATSAPP-BUSINESS", "EVOLUTION"],
			default: "WHATSAPP-BAILEYS",
		},
		token: { type: String, default: null },
		number: { type: String, default: null },
		clientName: { type: String, default: null },
		profileName: { type: String, default: null },
		user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		createdAt: { type: Date, default: Date.now },
		updatedAt: { type: Date, default: Date.now },
		disconnectedAt: { type: Date, default: null },
		disconnectionObject: { type: mongoose.Schema.Types.Mixed, default: null },
		disconnectionReasonCode: { type: String, default: null },
	},
	{ timestamps: true },
);

instanceSchema.statics.createInstanceForUser = async function (
	userId,
	instanceData,
) {
	const user = await mongoose.model("User").findById(userId);

	if (!user) {
		throw new Error("Usuário não encontrado");
	}

	const instanceCount = await this.countDocuments({ user: userId });

	const instanceLimits = {
		free: 2,
		pro: 5,
		enterprise: Number.POSITIVE_INFINITY,
	};

	const limit = instanceLimits[user.plan] || 0;

	if (instanceCount >= limit) {
		throw new Error(`Limite de instâncias excedido para o plano ${user.plan}`);
	}

	return this.create({ ...instanceData, user: userId });
};

const Instance = mongoose.model("Instance", instanceSchema);

export default Instance;
