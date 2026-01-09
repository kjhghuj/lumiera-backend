
import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function deleteUserByEmail({ container, args }: ExecArgs) {
    const logger = container.resolve("logger");
    const customerService = container.resolve(Modules.CUSTOMER);
    const authService = container.resolve(Modules.AUTH);

    // Parse email from args if possible, or hardcode/prompt
    // The 'args' in ExecArgs might not be passed through nicely from CLI depending on version, 
    // but let's try to grab the first argument or default to a placeholder
    const targetEmail = process.argv[3] || "test@example.com";

    if (!targetEmail || !targetEmail.includes("@")) {
        logger.error("Please provide a valid email address as an argument.");
        logger.info("Usage: npx medusa exec ./src/scripts/delete-user.ts -- <email>");
        return;
    }

    logger.info(`Attempting to fully delete user with email: ${targetEmail}`);

    // 1. Delete Customer
    const customers = await customerService.listCustomers({ email: targetEmail });
    if (customers.length > 0) {
        logger.info(`Found ${customers.length} customer profile(s). Deleting...`);
        await customerService.deleteCustomers(customers.map(c => c.id));
        logger.info("Customer profiles deleted.");
    } else {
        logger.info("No customer profile found.");
    }

    // 2. Delete Auth Identity
    // Auth identities are usually keyed by 'entity_id' which is often the email for emailpass provider
    const authIdentities = await authService.listAuthIdentities({
        entity_id: targetEmail
    });

    if (authIdentities.length > 0) {
        logger.info(`Found ${authIdentities.length} auth identity(ies). Deleting...`);
        await authService.deleteAuthIdentities(authIdentities.map(a => a.id));
        logger.info("Auth identities deleted.");
    } else {
        logger.info("No auth identity found.");
    }
}
