
import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function fixDuoImages({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const productModule = container.resolve(Modules.PRODUCT);

    logger.info("Attempting to fix The Duo images (Retry)...");

    // 1. Get Product
    const [products] = await productModule.listProducts({ handle: "the-duo" }, { relations: ["variants", "images"] });
    if (!products.length) {
        logger.error("The Duo not found");
        return;
    }
    const product = products[0];

    const existingUrl = product.images[0]?.url || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800";
    const newUrl = "https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?auto=format&fit=crop&q=80&w=800"; // Black variant image

    // 2. Update Product Images explicitly
    const updateData = {
        images: [
            { url: existingUrl },
            { url: newUrl }
        ]
    };

    logger.info(`Updating product ${product.id} with 2 images...`);
    await productModule.updateProducts(product.id, updateData);

    // 3. Verify Product Update
    const [updatedProduct] = await productModule.listProducts({ id: product.id }, { relations: ["images", "variants"] });
    logger.info(`Product now has ${updatedProduct.images.length} images.`);

    // 4. Update Variants
    const coral = updatedProduct.variants.find(v => v.title === "Coral");
    const slate = updatedProduct.variants.find(v => v.title === "Slate Grey");

    if (coral) {
        logger.info(`Updating Coral (${coral.id}) to use image 1...`);
        await productModule.updateProductVariants(coral.id, {
            images: [{ url: existingUrl }]
        });
    }

    if (slate) {
        logger.info(`Updating Slate Grey (${slate.id}) to use image 2...`);
        await productModule.updateProductVariants(slate.id, {
            images: [{ url: newUrl }]
        });
    }

    // 5. Verify Variant Images
    const [finalProduct] = await productModule.listProducts({ id: product.id }, { relations: ["variants.images"] });
    finalProduct.variants.forEach(v => {
        logger.info(`Variant ${v.title} has ${v.images?.length} images.`);
        if (v.images?.length > 0) logger.info(`  URL: ${v.images[0].url}`);
    });
}
