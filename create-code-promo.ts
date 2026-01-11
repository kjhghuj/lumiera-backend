import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function createCodePromotion({ container }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const promotionModule = container.resolve(Modules.PROMOTION);
  
  try {
    const code = "TEST10";
    const discount = 15;
    
    logger.info("Creating CODE-type promotion: TEST10 with 15% discount");

    const promotion = await promotionModuleService.createPromotions({
      code,
      type: "code",
      application_method: {
        type: "percentage",
        value: discount,
        target_type: "order"
      }
    });

    logger.info("Promotion created! ID: " + promotion.id);
    logger.info("You can now use promo code: " + code + " for " + discount + "% discount");
    
  } catch (error) {
    logger.error("Failed to create promotion:", error);
    throw error;
  }
}
