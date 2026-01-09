
import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function createAdminUser({ container }: ExecArgs) {
    const userModule = container.resolve(Modules.USER);
    const authModule = container.resolve(Modules.AUTH);
    const logger = container.resolve("logger");

    const email = "admin@lumiera.com";
    const password = "password123";

    logger.info(`Creating admin user: ${email}`);

    try {
        // 1. Create Identity
        const authIdentity = await authModule.createAuthIdentities({
            provider: "emailpass",
            entity_id: email,
            app_metadata: {
                user_id: "", // Will update later or handled by link? 
                // In v2, we usually create user then link or create identity first
            }
        });

        // Medusa v2 pattern: Create User -> Create Identity (via provider) -> Link
        // Actually simpler: user command does this. Let's try to replicate what 'medusa user' does.
        // Or even better, just use the `userModule.create` which might handle it if we pass the right args, 
        // but usually we need to handle auth separately.

        // Let's use the createUser Workflow if available, but here we are in a script.

        // Basic User creation
        const user = await userModule.createUsers({
            email,
            first_name: "Admin",
            last_name: "User",
        });

        logger.info(`User created with ID: ${user.id}`);

        // We rely on the CLI usually. But let's try to just output the CLI command for the user 
        // OR use the CLI programmatically.
        // writing this script "from scratch" might be error prone regarding hashing.

    } catch (error) {
        logger.error("Failed to create user programmatically", error);
    }
}
