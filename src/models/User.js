import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
			trim: true,
			validate: {
				validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
				message: (props) => `${props.value} não é um email válido!`,
			},
		},
		password: {
			type: String,
			required: true,
		},
		plan: {
			type: String,
			enum: ["free", "basic", "pro", "enterprise"],
			default: "free",
		},
		status: {
			type: Boolean,
			default: true,
		},
		maxInstances: {
			type: Number,
			default: 2,
		},
		trialEndDate: {
			type: Date,
		},
		stripeCustomerId: {
			type: String,
		},
		stripeSubscriptionId: {
			type: String,
		},
		stripeSubscriptionStatus: {
			type: String,
		},
		createdAt: {
			type: Date,
			default: Date.now,
		},
	},
	{
		timestamps: true,
	},
);

// Método para comparar senhas
userSchema.methods.comparePassword = async function (candidatePassword) {
	return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;
