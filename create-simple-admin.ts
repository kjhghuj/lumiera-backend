import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function createSimpleAdmin({ container }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const authModuleService = container.resolve("auth");
  const userModuleService = container.resolve("user");
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("Creating admin user and auth identity...");

  const { data: existingUsers } = await query.graph({
    entity: "user",
    fields: ["id", "email"],
    filters: {
      email: "admin@lumiera.com",
    },
  });

  let user;
  if (existingUsers.length > 0) {
    user = existingUsers[0];
    logger.info("User already exists:", user.email);
  } else {
    user = await userModuleService.createUsers({
      first_name: "Admin",
      last_name: "User",
      email: "admin@lumiera.com",
    });
    logger.info("Created user:", user.email);
  }

  const { data: existingAuthIdentities } = await query.graph({
    entity: "auth_identity",
    fields: ["id"],
  });

  const targetAuth = existingAuthIdentities.find((auth: any) =>
    auth.provider_identities?.[0]?.email === "admin@lumiera.com"
  );

  if (targetAuth) {
    logger.info("Auth identity already exists");

    const links = await remoteLink.getLinks({
      [ContainerRegistrationKeys.AUTH_MODULE]: {
        auth_identity_id: targetAuth.id,
      },
    });

    if (links.length === 0) {
      logger.info("Linking auth identity to user...");
      await remoteLink.create({
        [ContainerRegistrationKeys.AUTH_MODULE]: {
          auth_identity_id: targetAuth.id,
        },
        [ContainerRegistrationKeys.USER_MODULE]: {
          user_id: user.id,
        },
      });
      logger.info("✓ Linked!");
    } else {
      logger.info("Already linked");
    }
  } else {
    logger.info("Creating auth identity through direct registration...");
    const registerResult = await authModuleService.register("user", "emailpass", {
      email: "admin@lumiera.com",
      password: "AdminPassword123",
    });

    const authIdentity = registerResult as any;
    logger.info("Auth identity created:", authIdentity.auth_identity?.id || authIdentity.id);

    if (authIdentity.user_id !== user.id) {
      logger.info("Linking auth identity to admin user...");
      await remoteLink.create({
        [ContainerRegistrationKeys.AUTH_MODULE]: {
          auth_identity_id: authIdentity.auth_identity?.id || authIdentity.id,
        },
        [ContainerRegistrationKeys.USER_MODULE]: {
          user_id: user.id,
        },
      });
      logger.info("✓ Linked!");
    } else {
      logger.info("Auth identity already linked to correct user");
    }
  }

  logger.info("\n" + "=".repeat(50));
  logger.info("✓ Admin Setup Complete!");
  logger.info("=".repeat(50));
  logger.info("Email: admin@lumiera.com");
  logger.info("Password: AdminPassword123");
  logger.info("Admin URL: http://localhost:9000/app");
  logger.info("=".repeat(50));
}
