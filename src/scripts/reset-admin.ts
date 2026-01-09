
import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function resetAdmin({ container }: ExecArgs) {
    const userModule = container.resolve(Modules.USER);
    const authModule = container.resolve(Modules.AUTH);
    const logger = container.resolve("logger");

    const email = "admin@lumiera.com";

    logger.info(`Cleaning up user and auth for: ${email}`);

    // 1. Delete User
    const users = await userModule.listUsers({ email });
    if (users.length > 0) {
        logger.info(`Found ${users.length} users. Deleting...`);
        await userModule.deleteUsers(users.map(u => u.id));
        logger.info("Users deleted.");
    } else {
        logger.info("No existing users found.");
    }

    // 2. Delete Auth Identity
    // Auth identities are often looked up by valid uid or we scan for them if we can't filter by entity_id directly in generic list?
    // listAuthIdentities supports filtering.
    try {
        const authIdentities = await authModule.listAuthIdentities({
            entity_id: email
        });

        if (authIdentities.length > 0) {
            logger.info(`Found ${authIdentities.length} auth identities. Deleting...`);
            await authModule.deleteAuthIdentities(authIdentities.map(a => a.id));
            logger.info("Auth identities deleted.");
        } else {
            logger.info("No auth identities found.");
        }
    } catch (e) {
        logger.warn("Error listing/deleting auth identities", e);
    }
}
