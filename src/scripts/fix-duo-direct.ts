
import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function fixDuoDirect({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const productModule = container.resolve(Modules.PRODUCT);

    try {
        // 1. Get Product
        const [products] = await productModule.listProducts({ handle: "the-duo" }, { relations: ["variants", "images"] });
        if (!products.length) {
            logger.error("Product 'the-duo' not found");
            return;
        }
        const duo = products[0];

        const newUrl = "https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?auto=format&fit=crop&q=80&w=800";

        // Check if image already exists in product
        const existingImages = duo.images.map(img => ({ url: img.url }));
        const hasNewImage = existingImages.some(img => img.url === newUrl);

        if (!hasNewImage) {
            logger.info("Adding new image to Product...");
            existingImages.push({ url: newUrl });
            await productModule.updateProducts(duo.id, {
                images: existingImages
            });
            logger.info("Product images updated.");
        } else {
            logger.info("Product already has the new image.");
        }

        // Re-fetch product to get new Image ID if needed? 
        // Module API allows using URLs directly in updateProductVariants usually.

        const slate = duo.variants.find(v => v.title === "Slate Grey");
        if (!slate) {
            logger.error("Slate Grey variant not found");
            return;
        }

        // 2. Direct update to variant
        logger.info(`Assigning new image to Slate Grey variant...`);

        await productModule.updateProductVariants(slate.id, {
            images: [{ url: newUrl }]
        });

        logger.info("Variant update complete. Checking result...");

        const [check] = await productModule.listProductVariants({ id: slate.id }, { relations: ["images"] });
        logger.info(`Variant now has ${check.images.length} images.`);
        if (check.images.length > 0) logger.info(`Image URL: ${check.images[0].url}`);

    } catch (err) {
        logger.error(`Error executing script: ${err}`);
    }
}
