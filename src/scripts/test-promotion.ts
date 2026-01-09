import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";
import { randomBytes } from "crypto";

export default async function testPromotion({ container }: ExecArgs) {
    const promotionModuleService = container.resolve(Modules.PROMOTION);
    const logger = container.resolve("logger");

    const code = "TEST-" + randomBytes(3).toString("hex").toUpperCase();

    logger.info(`Testing promotion creation with code: ${code}`);

    try {
        const promotion = await promotionModuleService.createPromotions({
            code: code,
            type: "standard",
            application_method: {
                type: "percentage",
                value: 15,
                target_type: "order",
            },
        });

        logger.info(`SUCCESS! Promotion created with ID: ${promotion?.id}`);
        logger.info(`Promotion code: ${promotion?.code}`);
    } catch (error: any) {
        logger.error(`FAILED to create promotion. Error: ${error.message}`);

        // Log more details if available
        if (error.cause) {
            logger.error(`Cause: ${JSON.stringify(error.cause)}`);
        }
    }
}

