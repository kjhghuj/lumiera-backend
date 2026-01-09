
import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function deleteAllCustomersKeepAdmin({ container }: ExecArgs) {
    const logger = container.resolve("logger");
    const customerService = container.resolve(Modules.CUSTOMER);
    const authService = container.resolve(Modules.AUTH);

    // Explicit list of emails to PROTECT
    const PROTECTED_EMAILS = ["admin@lumiera.com"];

    logger.info("Starting cleanup of Customers and Auth Identities (preserving Admin)...");

    // 1. Fetch all customers
    const customers = await customerService.listCustomers({}, { take: 10000 });

    if (customers.length === 0) {
        logger.info("No customers found to delete.");
    } else {
        // 2. Delete Customers
        logger.info(`Found ${customers.length} customers. Deleting customer profiles...`);
        const customerIds = customers.map(c => c.id);
        await customerService.deleteCustomers(customerIds);
        logger.info("Customer profiles deleted.");
    }

    // 3. Delete ALL auth identities for provider "emailpass" except protected ones
    logger.info("Scanning for all Auth Identities...");

    try {
        // Get all auth identities
        const allAuthIdentities = await authService.listAuthIdentities({}, { take: 10000 });

        logger.info(`Found ${allAuthIdentities.length} total auth identities.`);

        // Filter: only delete customer identities (emailpass provider) that are NOT protected
        const identitiesToDelete = allAuthIdentities.filter(identity => {
            // Protect admin emails
            if (PROTECTED_EMAILS.includes(identity.entity_id)) {
                logger.info(`Protecting identity: ${identity.entity_id}`);
                return false;
            }
            return true;
        });

        if (identitiesToDelete.length > 0) {
            logger.info(`Deleting ${identitiesToDelete.length} auth identities...`);
            for (const identity of identitiesToDelete) {
                try {
                    await authService.deleteAuthIdentities([identity.id]);
                    logger.info(`Deleted auth identity: ${identity.entity_id} (${identity.id})`);
                } catch (e) {
                    logger.warn(`Failed to delete auth identity ${identity.id}:`, e);
                }
            }
            logger.info("Auth identities cleanup complete.");
        } else {
            logger.info("No auth identities to delete.");
        }

    } catch (e) {
        logger.error("Failed to clean up auth identities:", e);
    }

    logger.info("Cleanup complete. Admin user should remain intact.");
}
