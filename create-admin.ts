import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function createAdminUser({ container }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  logger.info("Creating admin user...");

  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: users } = await query.graph({
    entity: "user",
    fields: ["id", "email"],
    filters: {
      email: "admin@lumiera.com",
    },
  });

  if (users.length > 0) {
    logger.info("Admin user already exists:", users[0].email);
    return;
  }

  const userModuleService = container.resolve("user");

  const user = await userModuleService.createUsers({
    first_name: "Admin",
    last_name: "User",
    email: "admin@lumiera.com",
  });

  logger.info("Admin user created:", user.email);
  logger.info("Please set a password for this user in the admin panel.");
}
