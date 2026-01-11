import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function fixAdmin({ container }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const authModuleService = container.resolve("auth");
  const userModuleService = container.resolve("user");
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const adminEmail = process.env.ADMIN_EMAIL || "admin@lumiera.com";
  const adminPassword = process.env.ADMIN_PASSWORD;

  // Security: Require password via environment variable
  if (!adminPassword) {
    logger.error("❌ ADMIN_PASSWORD environment variable is required");
    logger.info("Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourSecurePassword npm run medusa exec ./src/scripts/fix-admin.ts");
    throw new Error("ADMIN_PASSWORD environment variable must be set");
  }

  if (adminPassword.length < 8) {
    logger.error("❌ Password must be at least 8 characters long");
    throw new Error("Password too short");
  }

  logger.info("=== Fixing Admin Auth Link ===");

  // Step 1: Get or create user
  const { data: users } = await query.graph({
    entity: "user",
    fields: ["id", "email"],
    filters: {
      email: adminEmail,
    },
  });

  let user;
  if (users.length === 0) {
    user = await userModuleService.createUsers({
      first_name: "Admin",
      last_name: "User",
      email: adminEmail,
    });
    logger.info("✓ Created user:", user.email);
  } else {
    user = users[0];
    logger.info("✓ User exists:", user.email);
  }

  // Step 2: Get all auth identities
  const { data: authIdentities } = await query.graph({
    entity: "auth_identity",
    fields: ["id", "provider_identities"],
  });

  logger.info("Found", authIdentities.length, "auth identities");

  // Step 3: Find auth identity for admin@lumiera.com
  const targetAuth = authIdentities.find((auth: any) =>
    auth.provider_identities?.[0]?.email === adminEmail
  );

  if (targetAuth) {
    logger.info("✓ Found existing auth identity:", targetAuth.id);

    // Step 4: Check existing links
    const links = await remoteLink.getLinks({
      [ContainerRegistrationKeys.AUTH_MODULE]: {
        auth_identity_id: targetAuth.id,
      },
    });

    logger.info("Current links count:", links.length);

    if (links.length > 0) {
      logger.info("✓ Auth identity is already linked");
      const existingLink = links[0] as any;
      if (existingLink.user_id === user.id) {
        logger.info("✓ Auth identity is linked to correct user!");
      } else {
        logger.info("⚠ Auth identity is linked to different user. Re-linking...");
        await remoteLink.dismiss({
          [ContainerRegistrationKeys.AUTH_MODULE]: {
            auth_identity_id: targetAuth.id,
          },
        });
        logger.info("✓ Removed old link");

        await remoteLink.create({
          [ContainerRegistrationKeys.AUTH_MODULE]: {
            auth_identity_id: targetAuth.id,
          },
          [ContainerRegistrationKeys.USER_MODULE]: {
            user_id: user.id,
          },
        });
        logger.info("✓ Created new link to admin user");
      }
    } else {
      logger.info("⚠ No link found. Creating link...");
      await remoteLink.create({
        [ContainerRegistrationKeys.AUTH_MODULE]: {
          auth_identity_id: targetAuth.id,
        },
        [ContainerRegistrationKeys.USER_MODULE]: {
          user_id: user.id,
        },
      });
      logger.info("✓ Created link");
    }
  } else {
    logger.info("⚠ No auth identity found. Creating new one...");

    const registerResult = await authModuleService.register("user", "emailpass", {
      email: adminEmail,
      password: adminPassword,
    });

    const authIdentity = registerResult as any;
    logger.info("✓ Created auth identity:", authIdentity.auth_identity?.id || authIdentity.id);

    await remoteLink.create({
      [ContainerRegistrationKeys.AUTH_MODULE]: {
        auth_identity_id: authIdentity.auth_identity?.id || authIdentity.id,
      },
      [ContainerRegistrationKeys.USER_MODULE]: {
        user_id: user.id,
      },
    });
    logger.info("✓ Created link");
  }

  logger.info("\n" + "=".repeat(50));
  logger.info("✅ Admin Fix Complete!");
  logger.info("=".repeat(50));
  logger.info(`Email: ${adminEmail}`);
  logger.info("Admin URL: http://localhost:9000/app");
  logger.info("Note: Use your ADMIN_PASSWORD to login");
  logger.info("=".repeat(50));
}
