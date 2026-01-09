
import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function deleteDuo({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const productModule = container.resolve(Modules.PRODUCT);

    logger.info("Finding 'The Duo'...");
    const [products] = await productModule.listProducts({ handle: "the-duo" });

    if (products.length) {
        logger.info(`Deleting product ${products[0].id}...`);
        await productModule.deleteProducts([products[0].id]);
        logger.info("Deleted.");
    } else {
        logger.info("The Duo not found.");
    }
}
