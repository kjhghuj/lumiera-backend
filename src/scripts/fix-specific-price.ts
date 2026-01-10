import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * 修复特定变体价格脚本
 * 
 * 运行命令：
 * npx medusa exec ./src/scripts/fix-specific-price.ts
 */

// 目标价格：11900 分 = £119.00
const TARGET_PRICE = 11900;

// 需要修复的阈值：低于此价格的变体将被修复
const PRICE_THRESHOLD = 5000; // £50.00

export default async function fixSpecificPrice({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const pricingService = container.resolve(Modules.PRICING);

    logger.info("========================================");
    logger.info("开始修复异常价格变体...");
    logger.info(`目标价格: ${TARGET_PRICE} (£${TARGET_PRICE / 100})`);
    logger.info(`阈值: ${PRICE_THRESHOLD} (£${PRICE_THRESHOLD / 100})`);
    logger.info("========================================");

    // 1. 获取所有商品变体和价格信息
    const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: [
            "id",
            "title",
            "sku",
            "product.id",
            "product.title",
            "price_set.id",
            "price_set.prices.id",
            "price_set.prices.amount",
            "price_set.prices.currency_code",
        ],
    });

    logger.info(`找到 ${variants.length} 个商品变体`);

    let fixedCount = 0;

    for (const variant of variants) {
        const productTitle = variant.product?.title || "未知商品";
        const variantTitle = variant.title || "默认变体";
        const sku = variant.sku || "N/A";
        const priceSet = variant.price_set;

        if (!priceSet || !priceSet.prices || priceSet.prices.length === 0) {
            continue;
        }

        // 查找同产品其他变体的最高价格作为参考
        const productId = variant.product?.id;
        const otherVariantPrices = variants
            .filter(v => v.product?.id === productId && v.id !== variant.id)
            .flatMap(v => v.price_set?.prices?.map((p: any) => p.amount) || [])
            .filter((p: number) => p >= PRICE_THRESHOLD);

        const referencePrice = otherVariantPrices.length > 0
            ? Math.max(...otherVariantPrices)
            : TARGET_PRICE;

        for (const price of priceSet.prices) {
            const amount = price.amount;
            const currencyCode = price.currency_code?.toUpperCase() || "GBP";

            if (amount < PRICE_THRESHOLD) {
                logger.info(`❌ [${productTitle}] ${variantTitle} (SKU: ${sku})`);
                logger.info(`   当前价格: ${amount} (${currencyCode} ${(amount / 100).toFixed(2)})`);
                logger.info(`   目标价格: ${referencePrice} (${currencyCode} ${(referencePrice / 100).toFixed(2)})`);

                try {
                    await pricingService.updatePrices([
                        {
                            id: price.id,
                            amount: referencePrice,
                        },
                    ]);

                    fixedCount++;
                    logger.info(`   ✅ 已修复！`);
                } catch (error) {
                    logger.error(`   ❌ 修复失败: ${error}`);
                }
            }
        }
    }

    logger.info("");
    logger.info("========================================");
    logger.info(`修复完成！共修复 ${fixedCount} 个价格`);
    logger.info("========================================");
}
