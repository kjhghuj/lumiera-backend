import { ExecArgs } from "@medusajs/framework/types";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * This script sets unique thumbnails for each variant of "The Duo" product.
 * It assigns the LAST image in each variant's images array as the thumbnail,
 * which is typically the most recently uploaded unique image.
 * 
 * Run with: npx medusa exec ./src/scripts/set-duo-variant-thumbnails.ts
 */
export default async function setDuoVariantThumbnails({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const productModuleService = container.resolve(Modules.PRODUCT);

    logger.info("Setting unique thumbnails for 'The Duo' variants...");

    // Find The Duo product
    const [products] = await productModuleService.listProducts(
        { handle: "the-duo" },
        {
            relations: ["variants", "variants.images"],
        }
    );

    if (!products || products.length === 0) {
        logger.error("Product 'The Duo' not found!");
        return;
    }

    const product = products[0];
    logger.info(`Found product: ${product.title}`);

    for (const variant of product.variants || []) {
        const variantAny = variant as any;
        const images = variantAny.images;

        if (images && images.length > 0) {
            // Use the LAST image as thumbnail (most recently added unique image)
            const uniqueImage = images[images.length - 1].url;

            logger.info(`Setting thumbnail for variant "${variant.title}": ${uniqueImage}`);

            try {
                await productModuleService.updateProductVariants(variant.id, {
                    thumbnail: uniqueImage,
                });
                logger.info(`  ✓ Updated successfully`);
            } catch (err) {
                logger.error(`  ✗ Failed: ${err}`);
            }
        } else {
            logger.warn(`Variant "${variant.title}" has no images, skipping.`);
        }
    }

    logger.info("Done!");
}
