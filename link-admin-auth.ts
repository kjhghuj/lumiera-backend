import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createAuthIdentitiesWorkflow,
  updateAuthIdentitiesWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function linkAdminAuth({ container }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("Linking admin auth identity to user...");

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

  const user = users[0];
  logger.info(`Found user: ${user.email} (ID: ${user.id})`);

  const { data: authIdentities } = await query.graph({
    entity: "auth_identity",
    fields: ["id", "provider_identities"],
  });

  let authIdentity;
  const targetAuthIdentity = authIdentities.find((auth: any) =>
    auth.provider_identities?.[0]?.email === "admin@lumiera.com"
  );

  if (targetAuthIdentity) {
    logger.info(`Found existing auth identity: ${targetAuthIdentity.id}`);
    authIdentity = targetAuthIdentity;

    if (!authIdentity) {
      logger.error("Auth identity not found for admin@lumiera.com");
      return;
    }

    const linkResult = await remoteLink.getLinks({
      [ContainerRegistrationKeys.AUTH_MODULE]: {
        auth_identity_id: authIdentity.id,
      },
    });

    if (linkResult.length > 0) {
      logger.info("Auth identity already linked to a user");
      logger.info("Checking if it's linked to the correct user...");
      const existingLink = linkResult[0] as any;
      if (existingLink.user_id === user.id) {
        logger.info("✓ Auth identity already linked to admin user!");
        logger.info("\n" + "=".repeat(50));
        logger.info("Admin Login Credentials:");
        logger.info("=".repeat(50));
        logger.info("Email: admin@lumiera.com");
        logger.info("Password: AdminPassword123");
        logger.info("Admin URL: http://localhost:9000/app");
        logger.info("=".repeat(50));
        return;
      } else {
        logger.info("Auth identity is linked to a different user. Re-linking...");
        await remoteLink.dismiss({
          [ContainerRegistrationKeys.AUTH_MODULE]: {
            auth_identity_id: authIdentity.id,
          },
        });
      }
    }

    logger.info("Linking auth identity to user...");
    await remoteLink.create({
      [ContainerRegistrationKeys.AUTH_MODULE]: {
        auth_identity_id: authIdentity.id,
      },
      [ContainerRegistrationKeys.USER_MODULE]: {
        user_id: user.id,
      },
    });
    logger.info("✓ Auth identity linked to user!");
  } else {
    logger.info("Creating new auth identity...");

    const { result: [newAuthIdentity] } = await createAuthIdentitiesWorkflow(container).run({
      input: {
        auth_identities: [
          {
            provider_id: "emailpass",
            user_metadata: {
              email: "admin@lumiera.com",
            },
            provider_metadata: {
              password: "AdminPassword123",
            },
          },
        ],
      },
    });

    logger.info(`Created auth identity: ${newAuthIdentity.id}`);

    await remoteLink.create({
      [ContainerRegistrationKeys.AUTH_MODULE]: {
        auth_identity_id: newAuthIdentity.id,
      },
      [ContainerRegistrationKeys.USER_MODULE]: {
        user_id: user.id,
      },
    });

    logger.info("✓ New auth identity created and linked!");
  }

  logger.info("\n" + "=".repeat(50));
  logger.info("Admin Login Credentials:");
  logger.info("=".repeat(50));
  logger.info("Email: admin@lumiera.com");
  logger.info("Password: AdminPassword123");
  logger.info("Admin URL: http://localhost:9000/app");
  logger.info("=".repeat(50));
}
