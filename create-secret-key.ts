import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createApiKeysWorkflow } from "@medusajs/medusa/core-flows";

export default async function createSecretKey({ container }) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);

  logger.info("Creating secret API key...");

  const { result: [secretKey] } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: "Admin Secret API Key",
          type: "secret",
          created_by: "",
        },
      ],
    },
  });

  const key = (secretKey as any).token || secretKey;

  logger.info("✓ Secret API key created:");
  logger.info("Token:", key);
  logger.info("ID:", (secretKey as any).id || secretKey);

  console.log("\n" + "=".repeat(50));
  console.log("SECRET API KEY (Save this!):");
  console.log("=".repeat(50));
  console.log(key);
  console.log("=".repeat(50));
}
