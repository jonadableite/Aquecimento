import { PrismaClient } from "@prisma/client"; // Importação correta
import Redis from "ioredis";
import { config } from "../config/index.js";
import {
	createCheckoutSession,
	createStripeCustomer,
	handleProcessWebhookCheckout,
	handleProcessWebhookUpdatedSubscription,
	stripeInstance,
} from "../stripe/index.js";

const prisma = new PrismaClient();

const redis = new Redis({
	host: process.env.REDIS_HOST || "painel.whatlead.com.br",
	port: process.env.REDIS_PORT || 6379,
	password: process.env.REDIS_PASSWORD || "91238983Jonadab",
});

export const createCustomer = async (req, res) => {
	try {
		const { email, name } = req.body;

		// Criar cliente no Stripe
		const customer = await createStripeCustomer({
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
		const user = await prisma.user.findUnique({
			where: { id: req.user.id },
		});

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
		await prisma.user.update({
			where: { id: req.user.id },
			data: { stripeSubscriptionId: subscription.id },
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
		const user = await prisma.user.findUnique({
			where: { id: req.user.id },
		});

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

export const createCheckoutSessionController = async (req, res) => {
	try {
		const { priceId, returnUrl } = req.body;
		const user = await prisma.user.findUnique({
			where: { id: req.user.id },
		});

		if (!user) {
			return res.status(400).json({ error: "Usuário não encontrado" });
		}

		const session = await createCheckoutSession(
			user.id,
			user.email,
			priceId,
			returnUrl,
		);

		res.status(200).json({
			success: true,
			message: "Sessão de checkout criada com sucesso",
			url: session.url,
		});
	} catch (error) {
		console.error("Erro ao criar sessão de checkout:", error);
		res.status(500).json({ error: "Erro ao criar sessão de checkout" });
	}
};

export const handleWebhook = async (req, res) => {
	const sig = req.headers["stripe-signature"];
	const webhookSecret = config.stripe.webhookSecret;

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
		case "checkout.session.completed":
			try {
				await handleProcessWebhookCheckout(event);
			} catch (error) {
				console.error("Erro ao processar webhook de checkout:", error);
			}
			break;
		case "customer.subscription.updated":
		case "customer.subscription.deleted":
			const eventId = event.id;
			try {
				// Verificar se o evento já foi processado
				const processedEvent = await redis.get(`webhook_event:${eventId}`);
				if (processedEvent) {
					console.log(`Evento duplicado detectado: ${eventId}`);
					return res.status(200).json({ received: true });
				}
				await handleProcessWebhookUpdatedSubscription(event);
				// Registrar o evento como processado
				await redis.set(`webhook_event:${eventId}`, "true", "EX", 60 * 60 * 24); // Expira em 24 horas
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
