import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const cartId = req.params.id;

    // Validate cart ID is provided
    if (!cartId) {
        return res.status(400).json({ error: "Cart ID is required" });
    }

    // Validate cart ID format (UUID)
    if (!UUID_REGEX.test(cartId)) {
        return res.status(400).json({ error: "Invalid cart ID format" });
    }

    try {
        const { data: carts } = await query.graph({
            entity: "cart",
            fields: [
                "id",
                "email",
                "currency_code",
                "region_id",
                "items.*",
                "items.variant.*",
                "items.variant.images.*",
                "items.variant.product.id",
                "items.variant.product.title",
                "items.variant.product.thumbnail",
                "items.variant.product.handle",
            ],
            filters: { id: cartId },
        });

        if (!carts || carts.length === 0) {
            return res.status(404).json({ error: "Cart not found" });
        }

        return res.json({ cart: carts[0] });
    } catch (error) {
        // Log the error but don't expose internal details to the client
        console.error("[API Error] Failed to fetch cart:", error instanceof Error ? error.message : "Unknown error");
        return res.status(500).json({ error: "Failed to retrieve cart" });
    }
}
