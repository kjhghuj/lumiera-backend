import { ExecArgs } from "@medusajs/framework/types";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function fixThumbnails({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const productModuleService = container.resolve(Modules.PRODUCT);

    logger.info("Starting thumbnail remediation...");

    const [products, count] = await productModuleService.listAndCountProducts(
        {},
        {
            select: ["id", "title", "thumbnail", "images"],
            relations: ["images"],
        }
    );

    logger.info(`Found ${count} products. Checking for missing thumbnails...`);

    let updatedCount = 0;

    for (const product of products) {
        if (!product.thumbnail && product.images && product.images.length > 0) {
            const firstImage = product.images[0].url;

            logger.info(`Updating thumbnail for product: ${product.title} (${product.id})`);

            await productModuleService.updateProducts(product.id, {
                thumbnail: firstImage,
            });

            updatedCount++;
        }
    }

    logger.info(`Remediation complete. Updated ${updatedCount} products.`);
}
