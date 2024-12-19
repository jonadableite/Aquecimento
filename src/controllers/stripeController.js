import { stripeInstance } from "../app.js";
import User from "../models/User.js";

export const createCustomer = async (req, res) => {
	try {
		const { email, name } = req.body;

		// Criar cliente no Stripe
		const customer = await stripeInstance.customers.create({
			email,
			name,
		});

		res.status(201).json({
			success: true,
			message: "Cliente criado com sucesso",
			customerId: customer.id,
		});
	} catch (error) {
		console.error("Erro ao criar cliente:", error);
		res.status(500).json({ error: "Erro ao criar cliente" });
	}
};

export const createSubscription = async (req, res) => {
	try {
		const { priceId } = req.body;
		const user = await User.findById(req.user._id);

		if (!user.stripeCustomerId) {
			return res
				.status(400)
				.json({ error: "Cliente não encontrado no Stripe" });
		}

		// Criar assinatura no Stripe
		const subscription = await stripeInstance.subscriptions.create({
			customer: user.stripeCustomerId,
			items: [{ price: priceId }],
			payment_behavior: "default_incomplete",
			payment_settings: {
				save_default_payment_method: "on_subscription",
			},
			expand: ["latest_invoice.payment_intent"],
		});

		// Atualizar o usuário com o ID da assinatura do Stripe
		await User.findByIdAndUpdate(req.user._id, {
			stripeSubscriptionId: subscription.id,
			plan: priceId.includes("basic")
				? "basic"
				: priceId.includes("pro")
					? "pro"
					: priceId.includes("enterprise")
						? "enterprise"
						: "free",
		});

		res.status(201).json({
			success: true,
			message: "Assinatura criada com sucesso",
			subscriptionId: subscription.id,
			clientSecret: subscription.latest_invoice.payment_intent.client_secret,
		});
	} catch (error) {
		console.error("Erro ao criar assinatura:", error);
		res.status(500).json({ error: "Erro ao criar assinatura" });
	}
};

export const manageSubscription = async (req, res) => {
	try {
		const user = await User.findById(req.user._id);

		if (!user.stripeCustomerId) {
			return res
				.status(400)
				.json({ error: "Cliente não encontrado no Stripe" });
		}

		const session = await stripeInstance.billingPortal.sessions.create({
			customer: user.stripeCustomerId,
			return_url: "http://localhost:5173/dashboard",
		});

		res.status(200).json({
			success: true,
			message: "Sessão de gerenciamento de assinatura criada com sucesso",
			url: session.url,
		});
	} catch (error) {
		console.error("Erro ao criar sessão de gerenciamento:", error);
		res.status(500).json({
			error: "Erro ao criar sessão de gerenciamento",
		});
	}
};

export const createCheckoutSession = async (req, res) => {
	try {
		const { priceId, returnUrl } = req.body;
		const user = await User.findById(req.user._id);

		if (!user.stripeCustomerId) {
			return res
				.status(400)
				.json({ error: "Cliente não encontrado no Stripe" });
		}

		const session = await stripeInstance.checkout.sessions.create({
			customer: user.stripeCustomerId,
			mode: "subscription",
			line_items: [
				{
					price: priceId,
					quantity: 1,
				},
			],
			payment_method_types: ["card"],
			ui_mode: "embedded",
			return_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
		});

		res.status(200).json({
			clientSecret: session.client_secret,
		});
	} catch (error) {
		console.error("Erro ao criar sessão de checkout:", error);
		res.status(500).json({ error: error.message });
	}
};

export const handleWebhook = async (req, res) => {
	const sig = req.headers["stripe-signature"];
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

	let event;

	try {
		event = stripeInstance.webhooks.constructEvent(
			req.body,
			sig,
			webhookSecret,
		);
	} catch (err) {
		console.error("Erro ao verificar webhook:", err.message);
		return res.status(400).send(`Webhook Error: ${err.message}`);
	}

	// Handle the event
	switch (event.type) {
		case "customer.subscription.updated":
		case "customer.subscription.deleted":
			const subscription = event.data.object;
			const customerId = subscription.customer;
			const status = subscription.status;
			const plan = subscription.items.data[0].price.id;

			try {
				const user = await User.findOne({ stripeCustomerId: customerId });
				if (user) {
					user.plan = plan.includes("basic")
						? "basic"
						: plan.includes("pro")
							? "pro"
							: plan.includes("enterprise")
								? "enterprise"
								: "free";
					user.stripeSubscriptionStatus = status;
					await user.save();
					console.log(
						`Assinatura do cliente ${customerId} atualizada para ${status}`,
					);
				}
			} catch (error) {
				console.error(
					"Erro ao atualizar assinatura do usuário no banco de dados:",
					error,
				);
			}
			break;
		case "payment_intent.succeeded":
			const paymentIntent = event.data.object;
			console.log("PaymentIntent foi bem-sucedido:", paymentIntent.id);
			break;
		default:
			console.log(`Evento não tratado: ${event.type}`);
	}

	res.status(200).json({ received: true });
};
