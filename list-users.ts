import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function listUsers({ container }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("Listing all users...");

  const { data: users } = await query.graph({
    entity: "user",
    fields: ["id", "email", "first_name", "last_name"],
  });

  if (users.length === 0) {
    logger.info("No users found!");
    return;
  }

  logger.info(`Found ${users.length} users:`);
  users.forEach((user: any) => {
    logger.info(`  - ${user.email} (${user.first_name} ${user.last_name}) [ID: ${user.id}]`);
  });

  const { data: authIdentities } = await query.graph({
    entity: "auth_identity",
    fields: ["id", "provider_identities", "user_id"],
  });

  logger.info(`\nFound ${authIdentities.length} auth identities:`);
  authIdentities.forEach((auth: any) => {
    logger.info(`  - Provider: ${auth.provider_identities?.[0]?.provider_id}, User ID: ${auth.user_id}, Auth ID: ${auth.id}`);
  });
}
