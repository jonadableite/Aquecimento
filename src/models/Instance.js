import mongoose from "mongoose";

const instanceSchema = new mongoose.Schema(
	{
		instanceName: { type: String, required: true, unique: true },
		connectionStatus: {
			type: String,
			enum: ["connected", "disconnected", "pending", "connecting"],
			default: "pending",
		},
		ownerJid: { type: String },
		profilePicUrl: { type: String },
		integration: {
			type: String,
			enum: ["WHATSAPP-BAILEYS", "WHATSAPP-BUSINESS", "EVOLUTION"],
			default: "WHATSAPP-BAILEYS",
		},
		number: { type: String },
		clientName: { type: String },
		profileName: { type: String },
		user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
		createdAt: { type: Date, default: Date.now },
		updatedAt: { type: Date },
		disconnectedAt: { type: Date },
		disconnectionObject: { type: mongoose.Schema.Types.Mixed },
		disconnectionReasonCode: { type: String },
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

	// Limites de instâncias por plano
	const instanceLimits = {
		free: 2,
		pro: 5,
		enterprise: Number.POSITIVE_INFINITY, // Sem limite para plano enterprise
	};

	const limit = instanceLimits[user.plan] || 0;

	if (instanceCount >= limit) {
		throw new Error(`Limite de instâncias excedido para o plano ${user.plan}`);
	}

	return this.create({ ...instanceData, user: userId });
};

const Instance = mongoose.model("Instance", instanceSchema);

export default Instance;
