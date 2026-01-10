import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { linkSalesChannelsToStockLocationWorkflow } from "@medusajs/medusa/core-flows";

export default async function fixStockLocation({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL);
  const stockLocationService = container.resolve(Modules.STOCK_LOCATION);

  const targetSalesChannelId = "sc_01KEBDC2SHM1D1ZKYCW5R2BWKJ";

  logger.info("Starting fix for Sales Channel <-> Stock Location association...");

  // 1. Get the Sales Channel
  const salesChannels = await salesChannelService.listSalesChannels({
    id: targetSalesChannelId,
  });

  let salesChannel;
  if (salesChannels.length === 0) {
    logger.warn(`Sales Channel with ID ${targetSalesChannelId} not found. Listing all sales channels...`);
    const allSalesChannels = await salesChannelService.listSalesChannels();
    if (allSalesChannels.length > 0) {
        logger.info(`Found ${allSalesChannels.length} sales channels. Using the first one: ${allSalesChannels[0].name} (${allSalesChannels[0].id})`);
        salesChannel = allSalesChannels[0];
    } else {
        logger.error("No Sales Channels found in the system.");
        return;
    }
  } else {
    salesChannel = salesChannels[0];
    logger.info(`Found target Sales Channel: ${salesChannel.name} (${salesChannel.id})`);
  }

  // 2. Get Stock Locations
  const stockLocations = await stockLocationService.listStockLocations();
  if (stockLocations.length === 0) {
    logger.error("No Stock Locations found. Cannot link.");
    return;
  }
  const stockLocation = stockLocations[0];
  logger.info(`Found Stock Location: ${stockLocation.name} (${stockLocation.id})`);

  // 3. Link them
  logger.info(`Linking Sales Channel ${salesChannel.id} to Stock Location ${stockLocation.id}...`);
  
  try {
    const { result } = await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: {
            id: stockLocation.id,
            add: [salesChannel.id],
        }
    });
    logger.info("Successfully linked Sales Channel to Stock Location.");
  } catch (error) {
    logger.error(`Failed to link: ${error}`);
  }
}
