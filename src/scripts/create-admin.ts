
import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function createAdminUser({ container }: ExecArgs) {
    const userModule = container.resolve(Modules.USER);
    const authModule = container.resolve(Modules.AUTH);
    const logger = container.resolve("logger");

    const email = process.env.ADMIN_EMAIL || "admin@lumiera.com";
    const password = process.env.ADMIN_PASSWORD;

    // Security: Require password to be set via environment variable
    if (!password) {
        logger.error("❌ ADMIN_PASSWORD environment variable is required");
        logger.info("Usage: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=yourSecurePassword npm run medusa exec ./src/scripts/create-admin.ts");
        throw new Error("ADMIN_PASSWORD environment variable must be set");
    }

    if (password.length < 8) {
        logger.error("❌ Password must be at least 8 characters long");
        throw new Error("Password too short");
    }

    logger.info(`Creating admin user: ${email}`);

    try {
        // 1. Create Identity
        const authIdentity = await authModule.createAuthIdentities({
            provider: "emailpass",
            entity_id: email,
            app_metadata: {
                user_id: "", // Will update later or handled by link
            }
        });

        // Basic User creation
        const user = await userModule.createUsers({
            email,
            first_name: "Admin",
            last_name: "User",
        });

        logger.info(`✅ User created successfully`);
        logger.info(`Email: ${email}`);
        logger.info(`User ID: ${user.id}`);

    } catch (error) {
        logger.error("Failed to create user programmatically", error);
        throw error;
    }
}
