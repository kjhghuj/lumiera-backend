import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const cartId = req.params.id;

    if (!cartId) {
        return res.status(400).json({ error: "Cart ID is required" });
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
        console.error("Error fetching cart:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
