import { ExecArgs } from "@medusajs/framework/types";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function testCartEndpoint({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const cartModuleService = container.resolve(Modules.CART);
    const productService = container.resolve(Modules.PRODUCT);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    logger.info("Testing cart endpoint with thumbnail...");

    // Get a product with variant
    const [products] = await productService.listAndCountProducts({}, {
        relations: ["variants"],
        take: 1
    });

    if (!products.length || !products[0].variants?.length) {
        logger.error("No products found");
        return;
    }

    // Create test cart
    const cart = await cartModuleService.createCarts({
        currency_code: "gbp",
        items: [{
            variant_id: products[0].variants[0].id,
            quantity: 1,
        }]
    });

    logger.info(`Created test cart: ${cart.id}`);

    // Simulate the custom endpoint query
    const { data: carts } = await query.graph({
        entity: "cart",
        fields: [
            "id",
            "items.*",
            "items.variant.*",
            "items.variant.product.id",
            "items.variant.product.title",
            "items.variant.product.thumbnail",
        ],
        filters: { id: cart.id },
    });

    if (carts && carts.length > 0) {
        logger.info("✅ Cart endpoint test successful!");
        logger.info(`Cart ID: ${carts[0].id}`);

        if (carts[0].items && carts[0].items.length > 0) {
            const item = carts[0].items[0];
            logger.info(`Product: ${item.variant?.product?.title}`);
            logger.info(`Thumbnail: ${item.variant?.product?.thumbnail || "❌ MISSING"}`);

            if (item.variant?.product?.thumbnail) {
                logger.info("✅ SUCCESS: Thumbnail is present in cart response!");
            } else {
                logger.error("❌ FAILED: Thumbnail is still missing!");
            }
        }
    }

    // Cleanup
    await cartModuleService.deleteCarts([cart.id]);
    logger.info("Test cart deleted.");
}
