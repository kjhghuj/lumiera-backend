
import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules, ProductStatus } from "@medusajs/framework/utils";
import { createProductsWorkflow } from "@medusajs/medusa/core-flows";

export default async function createDuo({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);

    logger.info("Creating 'The Duo' via Workflow...");

    // 1. Get Default Sales Channel
    const [salesChannels] = await salesChannelModule.listSalesChannels({ limit: 1 });
    if (!salesChannels.length) {
        logger.error("No Sales Channel found");
        return;
    }
    const defaultSalesChannelId = salesChannels[0].id;

    // 3. Create New via Workflow
    const coralImg = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800";
    const slateImg = "https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?auto=format&fit=crop&q=80&w=800"; // Black variant

    const input = {
        products: [
            {
                title: "The Duo",
                handle: "the-duo",
                subtitle: "Couples Vibrator",
                description: "Designed for shared pleasure, The Duo fits comfortably during intercourse to stimulate both partners simultaneously. Features flexible silicone arms and dual motors.",
                weight: 150,
                status: ProductStatus.PUBLISHED,
                images: [
                    { url: coralImg },
                    { url: slateImg }
                ],
                thumbnail: coralImg,
                options: [
                    { title: "Color", values: ["Coral", "Slate Grey"] }
                ],
                variants: [
                    {
                        title: "Coral",
                        sku: "DUO-CORAL",
                        options: { Color: "Coral" },
                        prices: [
                            { amount: 12900, currency_code: "gbp" },
                            { amount: 14900, currency_code: "eur" },
                            { amount: 16900, currency_code: "usd" }
                        ],
                        images: [{ url: coralImg }]
                    },
                    {
                        title: "Slate Grey",
                        sku: "DUO-SLATE",
                        options: { Color: "Slate Grey" },
                        prices: [
                            { amount: 12900, currency_code: "gbp" },
                            { amount: 14900, currency_code: "eur" },
                            { amount: 16900, currency_code: "usd" }
                        ],
                        images: [{ url: slateImg }]
                    }
                ],
                sales_channels: [{ id: defaultSalesChannelId }]
            }
        ]
    };

    logger.info("Executing createProductsWorkflow...");

    const { result } = await createProductsWorkflow(container).run({
        input: input
    });

    logger.info(`Created 'The Duo' successfully.`);
}
