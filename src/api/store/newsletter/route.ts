import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { subscribeToNewsletter } from "../../../lib/klaviyo";
import { verifyTurnstileToken } from "../../../lib/turnstile";

type NewsletterRequestBody = {
    email: string;
    turnstile_token?: string;
};

export async function POST(
    req: MedusaRequest<NewsletterRequestBody>,
    res: MedusaResponse
) {
    const { email, turnstile_token } = req.body;
    console.log("Newsletter Request Body:", JSON.stringify(req.body, null, 2));

    if (!email || typeof email !== "string") {
        return res.status(400).json({
            type: "invalid_request",
            message: "Email is required",
        });
    }

    if (!turnstile_token || typeof turnstile_token !== "string") {
        return res.status(400).json({
            type: "invalid_request",
            message: "Turnstile token is required",
        });
    }

    const isValidToken = await verifyTurnstileToken(turnstile_token);
    if (!isValidToken) {
        return res.status(400).json({
            type: "invalid_request",
            message: "Invalid Turnstile token",
        });
    }

    try {
        await subscribeToNewsletter(email);
        res.status(200).json({
            message: "Successfully subscribed to newsletter",
        });
    } catch (error) {
        res.status(500).json({
            type: "internal_error",
            message: "Failed to subscribe to newsletter",
        });
    }
}
