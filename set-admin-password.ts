import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function setAdminPassword({ container }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  logger.info("Setting admin password...");

  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: users } = await query.graph({
    entity: "user",
    fields: ["id", "email"],
    filters: {
      email: "admin@lumiera.com",
    },
  });

  if (users.length === 0) {
    logger.error("Admin user not found!");
    return;
  }

  const authModuleService = container.resolve("auth");

  const authIdentity = await authModuleService.createAuthIdentities({
    provider_id: "emailpass",
    user_metadata: {
      email: "admin@lumiera.com",
      password: "AdminPassword123",
    },
  });

  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);

  await remoteLink.create({
    [ContainerRegistrationKeys.USER_MODULE]: {
      user_id: users[0].id,
    },
    [ContainerRegistrationKeys.AUTH_MODULE]: {
      auth_identity_id: authIdentity.id,
    },
  });

  logger.info("✓ Admin password set successfully!");
  logger.info("Email: admin@lumiera.com");
  logger.info("Password: AdminPassword123");
}
