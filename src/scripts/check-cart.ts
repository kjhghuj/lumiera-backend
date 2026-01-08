import { ExecArgs } from "@medusajs/framework/types";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function checkCartItems({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const cartModuleService = container.resolve(Modules.CART);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    logger.info("Checking cart item structure...");

    // Get a sample cart with items
    const { data: carts } = await query.graph({
        entity: "cart",
        fields: [
            "id",
            "items.*",
            "items.product_id",
            "items.variant_id",
            "items.variant.*",
            "items.variant.product.*",
            "items.variant.product.thumbnail",
        ],
        filters: {},
        pagination: { take: 1 },
    });

    if (carts && carts.length > 0) {
        logger.info("Cart structure:");
        logger.info(JSON.stringify(carts[0], null, 2));
    } else {
        logger.info("No carts found. Creating a test cart...");

        // Get a product variant
        const productService = container.resolve(Modules.PRODUCT);
        const [products] = await productService.listAndCountProducts({}, {
            relations: ["variants"],
            take: 1
        });

        if (products.length > 0 && products[0].variants && products[0].variants.length > 0) {
            const cart = await cartModuleService.createCarts({
                currency_code: "gbp",
                items: [{
                    variant_id: products[0].variants[0].id,
                    quantity: 1,
                }]
            });

            logger.info("Created test cart. Fetching with product details...");

            const { data: newCarts } = await query.graph({
                entity: "cart",
                fields: [
                    "id",
                    "items.*",
                    "items.variant.*",
                    "items.variant.product.*",
                    "items.variant.product.thumbnail",
                ],
                filters: { id: cart.id },
            });

            logger.info("Cart with items:");
            logger.info(JSON.stringify(newCarts[0], null, 2));
        }
    }
}
