import { ExecArgs } from "@medusajs/framework/types";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function verifyThumbnails({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const productModuleService = container.resolve(Modules.PRODUCT);

    const [products] = await productModuleService.listAndCountProducts(
        {},
        {
            select: ["id", "title", "thumbnail"],
            take: 5
        }
    );

    logger.info("Verification - Random Products:");
    products.forEach(p => {
        logger.info(`Product: ${p.title}, Thumbnail: ${p.thumbnail || "MISSING"}`);
    });
}
