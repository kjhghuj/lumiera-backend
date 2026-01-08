import { ExecArgs } from "@medusajs/framework/types";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function addVariantImages({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const productService = container.resolve(Modules.PRODUCT);
    const link = container.resolve(ContainerRegistrationKeys.LINK);

    logger.info("Adding variant-specific images...");

    const [products] = await productService.listAndCountProducts({}, {
        relations: ["variants", "images"],
    });

    logger.info(`Found ${products.length} products`);

    for (const product of products) {
        if (!product.variants || product.variants.length === 0) continue;
        if (!product.images || product.images.length === 0) continue;

        logger.info(`Processing product: ${product.title}`);

        // Assign first image to all variants by default
        // In production, you'd map specific images to specific variants
        const firstImage = product.images[0];

        for (const variant of product.variants) {
            logger.info(`  Linking image to variant: ${variant.title || variant.sku}`);

            await link.create({
                [Modules.PRODUCT]: {
                    variant_id: variant.id,
                },
                [Modules.FILE]: {
                    file_id: firstImage.id,
                },
            });
        }
    }

    logger.info("✅ Variant images linked successfully!");
}
