import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function debugVariantInventory({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const salesChannelService = container.resolve(Modules.SALES_CHANNEL);

    const variantId = "variant_01KEE12AJ514Z9RE9ZZVJ7HXCW";
    const salesChannelId = "sc_01KEBDC2SHM1D1ZKYCW5R2BWKJ";

    const fs = require("fs");
    const path = require("path");
    const logFile = path.join(process.cwd(), "inventory_debug_log.txt");

    function log(msg: string) {
        logger.info(msg);
        fs.appendFileSync(logFile, msg + "\n");
    }

    // Clear log file
    fs.writeFileSync(logFile, "");

    log(`Debugging inventory for Variant: ${variantId} on SC: ${salesChannelId}`);

    // 1. Check Sales Channel <-> Stock Location Link
    const { data: scData } = await query.graph({
        entity: "sales_channel",
        fields: ["id", "stock_locations.*"],
        filters: { id: salesChannelId },
    });

    const validStockLocationIds = scData[0]?.stock_locations?.map((sl: any) => sl.id) || [];
    log(`Sales Channel is linked to Stock Locations: ${validStockLocationIds.join(", ")}`);

    if (validStockLocationIds.length === 0) {
        log("CRITICAL: Sales Channel has NO linked Stock Locations!");
    }

    // 2. Check Variant -> Inventory Item Link
    // In v2, this is via the Link module or implicit in ProductVariant if utilizing the inventory mechanism
    const { data: variantData } = await query.graph({
        entity: "product_variant",
        fields: ["id", "inventory_items.*"], // Check the link
        filters: { id: variantId },
    });

    const variant = variantData[0];
    if (!variant) {
        log("Variant not found!");
        return;
    }

    log(`Found Variant: ${variant.id}`);

    // Note: effectively we need to find the InventoryItem linked to this variant.
    // The graph query `inventory_items` on product_variant might resolve via the catalog/link.

    // If the graph navigation above doesn't show it directly, let's query the link explicitly if needed.
    // But let's see what the graph returns first.
    const linkedInventoryItems = variant.inventory_items || [];

    if (linkedInventoryItems.length === 0) {
        log("CRITICAL: Variant has NO linked Inventory Items.");
    } else {
        log(`Variant is linked to ${linkedInventoryItems.length} Inventory Items.`);

        for (const invItemLink of linkedInventoryItems) {
            const invItemId = invItemLink.inventory_item_id;
            log(`Checking Inventory Item: ${invItemId}`);

            // 3. Check Inventory Levels for this Item
            const { data: invItemData } = await query.graph({
                entity: "inventory_item",
                fields: ["id", "location_levels.*"],
                filters: { id: invItemId }
            });

            const invItem = invItemData[0];
            const levels = invItem.location_levels || [];

            const levelsAtValidLocs = levels.filter((l: any) => validStockLocationIds.includes(l.location_id));

            if (levelsAtValidLocs.length > 0) {
                log(`  [OK] Has levels at valid locations: ${levelsAtValidLocs.map((l: any) => `${l.location_id} (Qty: ${l.stocked_quantity})`).join(", ")}`);
            } else {
                log(`  [FAIL] No inventory levels at the Sales Channel's stock locations (${validStockLocationIds.join(", ")}).`);
                log(`  Item has levels at: ${levels.map((l: any) => l.location_id).join(", ")}`);
            }
        }
    }
}

