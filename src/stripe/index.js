import { PrismaClient } from "@prisma/client"; // Importação correta
import Stripe from "stripe";
import { config } from "../config/index.js";

const prisma = new PrismaClient();

export const stripeInstance = new Stripe(config.stripe.secretKey, {
	apiVersion: "2023-10-16",
	httpClient: Stripe.createFetchHttpClient(),
});

export const getStripeCustomerByEmail = async (email) => {
	const customers = await stripeInstance.customers.list({ email });
	return customers.data[0];
};

export const createStripeCustomer = async (input) => {
	const customer = await getStripeCustomerByEmail(input.email);
	if (customer) return customer;

	return stripeInstance.customers.create({
		email: input.email,
		name: input.name,
	});
};

export const createCheckoutSession = async (
	userId,
	userEmail,
	priceId,
	returnUrl,
) => {
	try {
		const customer = await createStripeCustomer({
			email: userEmail,
		});

		const session = await stripeInstance.checkout.sessions.create({
			payment_method_types: ["card"],
			mode: "subscription",
			client_reference_id: userId,
			customer: customer.id,
			success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${returnUrl}/checkout`,
			line_items: [
				{
					price: priceId,
					quantity: 1,
				},
			],
		});

		return {
			url: session.url,
		};
	} catch (error) {
		console.error("Error to create checkout session", error);
		throw new Error("Error to create checkout session");
	}
};

export const handleProcessWebhookCheckout = async (event) => {
	const clientReferenceId = event.object.client_reference_id;
	const stripeSubscriptionId = event.object.subscription;
	const stripeCustomerId = event.object.customer;
	const checkoutStatus = event.object.status;
	const priceId = event.object.line_items.data[0].price.id;

	if (checkoutStatus !== "complete") return;

	if (!clientReferenceId || !stripeSubscriptionId || !stripeCustomerId) {
		throw new Error(
			"clientReferenceId, stripeSubscriptionId and stripeCustomerId is required",
		);
	}

	const user = await prisma.user.update({
		where: { id: clientReferenceId },
		data: {
			stripeCustomerId,
			stripeSubscriptionId,
			plan:
				priceId === config.stripe.enterprisePriceId
					? "enterprise"
					: priceId === config.stripe.proPriceId
						? "pro"
						: priceId === config.stripe.basicPriceId
							? "basic"
							: "free",
		},
	});
};

export const handleProcessWebhookUpdatedSubscription = async (event) => {
	const stripeCustomerId = event.object.customer;
	const stripeSubscriptionId = event.object.id;
	const stripeSubscriptionStatus = event.object.status;
	const priceId = event.object.items.data[0].price.id;

	const user = await prisma.user.updateMany({
		where: {
			OR: [{ stripeSubscriptionId }, { stripeCustomerId }],
		},
		data: {
			stripeSubscriptionId,
			stripeSubscriptionStatus,
			plan:
				priceId === config.stripe.enterprisePriceId
					? "enterprise"
					: priceId === config.stripe.proPriceId
						? "pro"
						: priceId === config.stripe.basicPriceId
							? "basic"
							: "free",
		},
	});
};
