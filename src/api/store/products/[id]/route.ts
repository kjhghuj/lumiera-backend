import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export async function GET(
    req: MedusaRequest,
    res: MedusaResponse
) {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
    const productId = req.params.id;

    if (!productId) {
        return res.status(400).json({ error: "Product ID is required" });
    }

    try {
        const { data: products } = await query.graph({
            entity: "product",
            fields: [
                "id",
                "title",
                "subtitle",
                "description",
                "handle",
                "thumbnail",
                "status",
                "images.*",
                "variants.*",
                "variants.images.*",
                "variants.prices.*",
                "variants.options.*",
                "categories.*",
            ],
            filters: {
                $or: [
                    { id: productId },
                    { handle: productId }
                ]
            },
        });

        if (!products || products.length === 0) {
            return res.status(404).json({ error: "Product not found" });
        }

        return res.json({ product: products[0] });
    } catch (error) {
        console.error("Error fetching product:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
