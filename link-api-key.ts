import { ContainerRegistrationKeys, ApiKeyType } from "@medusajs/framework/utils";
import { linkSalesChannelsToApiKeyWorkflow } from "@medusajs/medusa/core-flows";

export default async function linkApiKey({ container }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("Linking API key to sales channel...");

  const { data: apiKeys } = await query.graph({
    entity: "api_key",
    fields: ["id", "token", "title", "type"],
    filters: {
      type: "publishable",
    },
  });

  if (!apiKeys || apiKeys.length === 0) {
    logger.error("No publishable API key found!");
    return;
  }

  const apiKey = apiKeys[0];
  logger.info(`Found API key: ${apiKey.title} (${apiKey.token})`);

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    filters: {
      name: "LUMIERA Storefront",
    },
  });

  if (!salesChannels || salesChannels.length === 0) {
    logger.error("No sales channel found with name 'LUMIERA Storefront'!");
    return;
  }

  const salesChannel = salesChannels[0];
  logger.info(`Found sales channel: ${salesChannel.name} (${salesChannel.id})`);

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: apiKey.id,
      add: [salesChannel.id],
    },
  });

  logger.info("Successfully linked API key to sales channel!");
  logger.info(`Publishable API Key: ${apiKey.token}`);
  logger.info(`Sales Channel ID: ${salesChannel.id}`);
}
