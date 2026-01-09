import { ExecArgs } from "@medusajs/framework/types";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * This script sets each variant's thumbnail to its first image if not already set.
 * Run with: npx medusa exec ./src/scripts/fix-variant-thumbnails.ts
 */
export default async function fixVariantThumbnails({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const productModuleService = container.resolve(Modules.PRODUCT);

    logger.info("Starting variant thumbnail remediation...");

    // List all products with their variants and variant images
    const [products] = await productModuleService.listAndCountProducts(
        {},
        {
            select: ["id", "title"],
            relations: ["variants", "variants.images"],
        }
    );

    logger.info(`Found ${products.length} products.`);

    let updatedCount = 0;

    for (const product of products) {
        if (!product.variants) continue;

        for (const variant of product.variants) {
            const variantAny = variant as any;

            // Check if variant has no thumbnail but has images
            if (!variantAny.thumbnail && variantAny.images && variantAny.images.length > 0) {
                const firstImage = variantAny.images[0].url;

                logger.info(`Setting thumbnail for variant "${variant.title}" (${variant.id}) of product "${product.title}"`);

                try {
                    await productModuleService.updateProductVariants(variant.id, {
                        thumbnail: firstImage,
                    });
                    updatedCount++;
                } catch (err) {
                    logger.error(`Failed to update variant ${variant.id}: ${err}`);
                }
            }
        }
    }

    logger.info(`Variant thumbnail remediation complete. Updated ${updatedCount} variants.`);
}
