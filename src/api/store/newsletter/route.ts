import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { subscribeToNewsletter } from "../../../lib/klaviyo";

type NewsletterRequestBody = {
    email: string;
};

export async function POST(
    req: MedusaRequest<NewsletterRequestBody>,
    res: MedusaResponse
) {
    const { email } = req.body;
    console.log("Newsletter Request Body:", JSON.stringify(req.body, null, 2));
    console.log("Newsletter Request Query:", JSON.stringify(req.query, null, 2));

    if (!email || typeof email !== "string") {
        return res.status(400).json({
            type: "invalid_request",
            message: "Email is required",
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
