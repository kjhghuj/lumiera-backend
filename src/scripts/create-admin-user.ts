
import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function createAdminUser({ container }: ExecArgs) {
    const userModule = container.resolve(Modules.USER);
    const authModule = container.resolve(Modules.AUTH);
    const logger = container.resolve("logger");

    const email = process.env.ADMIN_EMAIL || "admin@lumiera.com";
    const password = process.env.ADMIN_PASSWORD;
    const actorType = "user"; // Important for v2

    // Security: Require password to be set via environment variable
    if (!password) {
        logger.error("❌ ADMIN_PASSWORD environment variable is required");
        logger.info("Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourSecurePassword npm run medusa exec ./src/scripts/create-admin-user.ts");
        throw new Error("ADMIN_PASSWORD environment variable must be set");
    }

    if (password.length < 8) {
        logger.error("❌ Password must be at least 8 characters long");
        throw new Error("Password too short");
    }

    logger.info(`Starting creation of admin user: ${email}`);

    try {
        // 1. Create the User (Actor)
        // First, check if user exists
        let user;
        const existingUsers = await userModule.listUsers({ email });
        if (existingUsers.length > 0) {
            logger.info(`User ${email} already exists. ID: ${existingUsers[0].id}`);
            user = existingUsers[0];
        } else {
            logger.info(`Creating new user entity...`);
            user = await userModule.createUsers({
                email,
                first_name: "Admin",
                last_name: "User",
            });
            logger.info(`User created. ID: ${user.id}`);
        }

        // 2. Create Auth Identity
        // We need to check if identity exists
        const provider = "emailpass";

        // In v2, creating an auth identity usually handles the hashing if provider is emailpass
        // But we need to make sure we are using the 'emailpass' provider which should be registered

        // There isn't a simple "check if identity exists by email" on the auth module directly exposed easily 
        // without knowing the provider context sometimes, but let's try listing.
        const existingIdentities = await authModule.listAuthIdentities({
            entity_id: email
        });

        if (existingIdentities.length > 0) {
            logger.info(`Auth identity for ${email} already exists. Deleting to reset...`);
            await authModule.deleteAuthIdentities([existingIdentities[0].id]);
        }

        logger.info(`Creating new auth identity...`);
        const authIdentity = await authModule.createAuthIdentities({
            provider,
            entity_id: email,
            app_metadata: {
                user_id: user.id
            },
            user_metadata: {},
            provider_metadata: {
                password: password // The emailpass provider expects this in provider_metadata
            }
        });

        logger.info(`Auth identity created. ID: ${authIdentity.id}`);

        // 3. Link User and Auth Identity
        // In v2, the link is usually implicit via app_metadata or explicit via the remote link.
        // The Auth module is standalone. The link is often conceptional or via the joiner.

        logger.info(`✅ Admin user process complete!`);
        logger.info(`Email: ${email}`);
        logger.info(`User ID: ${user.id}`);
        logger.info(`Auth ID: ${authIdentity.id}`);

    } catch (error) {
        logger.error("Failed to create admin user", error);
        throw error;
    }
}
