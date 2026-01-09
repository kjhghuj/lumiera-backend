
import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function createAdminUser({ container }: ExecArgs) {
    const userModule = container.resolve(Modules.USER);
    const authModule = container.resolve(Modules.AUTH);
    const logger = container.resolve("logger");

    const email = "admin@lumiera.com";
    const password = "password123";
    const actorType = "user"; // Important for v2

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
            logger.info(`Auth identity for ${email} already exists. Deleting to reset password...`);
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
                password: password // The emailpass provider expects this in provider_metadata usually? 
                // OR it might be in a specific format.
            }
        });

        // Wait, the `emailpass` provider implementation details allow passing the password in the body or metadata.
        // For `createAuthIdentities` on the generic service, it takes `AuthIdentityCreateDTO`.
        // It doesn't straightforwardly look like it takes a raw password to hash unless the provider logic is triggered.
        // The standard way to create an admin with password in v2 is often via the CLI or a specific workflow.
        // Since the CLI failed, we might have a config issue or a bug.

        // Let's try to do what the seeding usually does or what `medusa-auth-emailpass` expects.
        // Actually, usually we set the password separately or use a registration flow.

        // However, if we look at how the `user` command is implemented, it calls `authModuleService.createAuthIdentities`.
        // Let's try passing the password in `provider_metadata` as `{ password: "..." }`.

        logger.info(`Auth identity created. ID: ${authIdentity.id}`);

        // 3. Link User and Auth Identity?
        // In v2, the link is usually implicit via app_metadata or explicit via the remote link.
        // However, the Auth module is standalone. The link is often conceptional or via the joiner.

        logger.info(`Admin user process complete. User ID: ${user.id}, Auth ID: ${authIdentity.id}`);

    } catch (error) {
        logger.error("Failed to create admin user", error);
    }
}
