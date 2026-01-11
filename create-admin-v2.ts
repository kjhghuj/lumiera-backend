import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  updateUsersWorkflow,
  createAuthIdentitiesWorkflow,
  updateAuthIdentitiesWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function createAdminUser({ container }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  logger.info("Creating admin user with password...");

  const { data: existingUsers } = await query.graph({
    entity: "user",
    fields: ["id", "email"],
    filters: {
      email: "admin@lumiera.com",
    },
  });

  if (existingUsers.length > 0) {
    logger.info("Admin user already exists!");
    const user = existingUsers[0];

    const { data: authIdentities } = await query.graph({
      entity: "auth_identity",
      fields: ["id", "provider_identities"],
      filters: {
        id: user.id,
      },
    });

    if (authIdentities.length > 0) {
      logger.info("Auth identity already exists. Password may already be set.");
      logger.info("Try logging in with: admin@lumiera.com / AdminPassword123");
      return;
    }
  }

  logger.info("Creating new admin user...");

  const { result: [authIdentity] } = await createAuthIdentitiesWorkflow(container).run({
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

  logger.info("Auth identity created:", authIdentity.id);
  logger.info("User ID:", authIdentity.user_id);

  const { result: [user] } = await updateUsersWorkflow(container).run({
    input: {
      update: [
        {
          id: authIdentity.user_id,
          first_name: "Admin",
          last_name: "User",
          email: "admin@lumiera.com",
        },
      ],
    },
  });

  logger.info("✓ Admin user created successfully!");
  logger.info("Email: admin@lumiera.com");
  logger.info("Password: AdminPassword123");
  logger.info("Login at: http://localhost:9000/app");
}
