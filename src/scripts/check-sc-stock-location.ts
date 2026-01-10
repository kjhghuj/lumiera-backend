import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { RemoteLink } from "@medusajs/framework/modules-sdk";

export default async function checkStockLocation({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK) as RemoteLink;
    const salesChannelService = container.resolve(Modules.SALES_CHANNEL);

    const targetSalesChannelId = "sc_01KEBDC2SHM1D1ZKYCW5R2BWKJ";

    logger.info("Checking Sales Channel <-> Stock Location association...");

    const salesChannels = await salesChannelService.listSalesChannels({
        id: targetSalesChannelId,
    });

    if (salesChannels.length === 0) {
        logger.error(`Target Sales Channel ${targetSalesChannelId} NOT FOUND.`);
        return;
    }

    const salesChannel = salesChannels[0];

    // Use remote link to query
    const query = container.resolve(ContainerRegistrationKeys.QUERY);

    const { data: result } = await query.graph({
        entity: "sales_channel",
        fields: ["id", "stock_locations.*"],
        filters: {
            id: [salesChannel.id],
        }
    });

    if (result.length > 0) {
        const sc = result[0];
        logger.info(`Sales Channel: ${sc.id}`);
        if (sc.stock_locations && sc.stock_locations.length > 0) {
            logger.info(`Associated Stock Locations: ${sc.stock_locations.map((sl: any) => sl.id).join(", ")}`);
            logger.info("VERIFICATION PASSED: Sales Channel is linked to a Stock Location.");
        } else {
            logger.error("VERIFICATION FAILED: Sales Channel is NOT associated with any Stock Location.");
        }
    } else {
        logger.error("Could not query sales channel graph.");
    }
}
