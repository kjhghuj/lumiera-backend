import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createInventoryLevelsWorkflow } from "@medusajs/medusa/core-flows";

export default async function fixVariantInventoryLevel({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const inventoryService = container.resolve(Modules.INVENTORY);

    // Hardcoded IDs from our debug session
    const VARIANT_ID = "variant_01KEE12AJ514Z9RE9ZZVJ7HXCW";
    const STOCK_LOCATION_ID = "sloc_01KEBDC2TX07FZ6N5Y20M7VV61";
    const REQUIRED_QTY = 100;

    logger.info("Starting fix for missing Inventory Level...");

    // 1. Get Inventory Item ID for the variant
    const { data: variantData } = await query.graph({
        entity: "product_variant",
        fields: ["id", "inventory_items.inventory_item_id"],
        filters: { id: VARIANT_ID }
    });

    const variant = variantData[0];
    if (!variant || !variant.inventory_items || variant.inventory_items.length === 0) {
        logger.error("Could not find variant or linked inventory item.");
        return;
    }

    const inventoryItemId = variant.inventory_items[0].inventory_item_id;
    logger.info(`Target Inventory Item: ${inventoryItemId}`);

    // 2. Check if level already exists
    const [levels] = await inventoryService.listInventoryLevels({
        inventory_item_id: inventoryItemId,
        location_id: STOCK_LOCATION_ID,
    });

    if (levels) {
        logger.info(`Inventory Level already exists for location ${STOCK_LOCATION_ID}. Current stock: ${levels.stocked_quantity}`);
        // Ideally we update it if it is 0, but the error said "not associated", suggesting missing level?
        // Or maybe just 0 stock? The previous error was "not associated with any stock location" (sales channel error), 
        // but if the second error is "Failed to add to cart", checking if it is stock related.
        // Actually my debug script said "[FAIL] No inventory levels at ...". So it is missing.
    } else {
        logger.info(`Creating new Inventory Level at ${STOCK_LOCATION_ID} with qty ${REQUIRED_QTY}...`);

        try {
            await createInventoryLevelsWorkflow(container).run({
                input: {
                    inventory_levels: [{
                        inventory_item_id: inventoryItemId,
                        location_id: STOCK_LOCATION_ID,
                        stocked_quantity: REQUIRED_QTY,
                        incoming_quantity: 0,
                    }]
                }
            });
            logger.info("Successfully created Inventory Level.");
        } catch (e) {
            logger.error(`Failed to create inventory level: ${e}`);
        }
    }
}
