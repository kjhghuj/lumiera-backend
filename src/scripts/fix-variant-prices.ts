import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * 批量检查和修复商品变体价格脚本
 * 
 * 检测规则：
 * - 如果变体价格 < 100（即小于 £1.00），则认为价格设置错误
 * - 通常是漏掉了分位（应该是 11900 却输入了 119，或者应该是 11900 却输入了 11）
 * 
 * 运行命令：
 * npx medusa exec ./src/scripts/fix-variant-prices.ts
 */

// 最小合理价格阈值（以分为单位）
// 低于此值的价格将被标记为可疑
const MINIMUM_PRICE_THRESHOLD = 100; // £1.00

// 是否执行自动修复（设为 true 启用修复，false 只检查不修复）
const AUTO_FIX = true;

export default async function fixVariantPrices({ container }: ExecArgs) {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
    const query = container.resolve(ContainerRegistrationKeys.QUERY);
    const pricingService = container.resolve(Modules.PRICING);

    logger.info("========================================");
    logger.info("开始检查商品变体价格...");
    logger.info(`最小价格阈值: ${MINIMUM_PRICE_THRESHOLD} (£${MINIMUM_PRICE_THRESHOLD / 100})`);
    logger.info(`自动修复模式: ${AUTO_FIX ? '启用' : '禁用（仅检查）'}`);
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

    let issuesFound = 0;
    let fixedCount = 0;
    const issues: Array<{
        productTitle: string;
        variantTitle: string;
        sku: string;
        currentPrice: number;
        currencyCode: string;
        priceId: string;
        suggestedPrice: number;
    }> = [];

    // 2. 检查每个变体的价格
    for (const variant of variants) {
        const productTitle = variant.product?.title || "未知商品";
        const variantTitle = variant.title || "默认变体";
        const sku = variant.sku || "N/A";
        const priceSet = variant.price_set;

        if (!priceSet || !priceSet.prices || priceSet.prices.length === 0) {
            logger.warn(`⚠️  [${productTitle}] ${variantTitle} (SKU: ${sku}) - 没有设置价格`);
            continue;
        }

        // 检查每个价格
        for (const price of priceSet.prices) {
            const amount = price.amount;
            const currencyCode = price.currency_code?.toUpperCase() || "GBP";

            if (amount < MINIMUM_PRICE_THRESHOLD) {
                issuesFound++;

                // 计算建议价格
                // 常见错误模式：
                // - 输入 11 应该是 11000（漏了三位零）或 11900
                // - 输入 1100 应该是 11000 或 11900（漏了一位）
                // - 对于这个项目，大多数商品价格在 £50-£200 区间，即 5000-20000 分
                let suggestedPrice = amount;

                // 获取同一产品其他变体的价格作为参考
                const productId = variant.product?.id;
                const otherVariantPrices = variants
                    .filter(v => v.product?.id === productId && v.id !== variant.id)
                    .flatMap(v => v.price_set?.prices?.map((p: any) => p.amount) || [])
                    .filter((p: number) => p >= MINIMUM_PRICE_THRESHOLD);

                if (otherVariantPrices.length > 0) {
                    // 使用其他变体的价格作为参考
                    const referencePrice = Math.max(...otherVariantPrices);
                    suggestedPrice = referencePrice;
                    logger.info(`   使用同产品其他变体价格作为参考: ${referencePrice}`);
                } else if (amount < 100) {
                    // 价格小于 £1.00，应该乘以 1000（例如 11 -> 11000，即 £110）
                    suggestedPrice = amount * 1000;
                } else if (amount < 1500) {
                    // 价格在 £1-£15 区间，可能漏了一位，乘以 10（1100 -> 11000）
                    suggestedPrice = amount * 10;
                    // 如果结果不太合理，尝试调整
                    if (suggestedPrice < 5000) {
                        suggestedPrice = amount * 100;
                    }
                }

                issues.push({
                    productTitle,
                    variantTitle,
                    sku,
                    currentPrice: amount,
                    currencyCode,
                    priceId: price.id,
                    suggestedPrice,
                });

                logger.warn(`❌ [${productTitle}] ${variantTitle} (SKU: ${sku})`);
                logger.warn(`   当前价格: ${amount} (${currencyCode} ${amount / 100}) - 异常低！`);
                logger.warn(`   建议价格: ${suggestedPrice} (${currencyCode} ${suggestedPrice / 100})`);
                logger.warn(`   Price ID: ${price.id}`);
            }
        }
    }

    // 3. 如果启用自动修复，执行修复
    if (AUTO_FIX && issues.length > 0) {
        logger.info("");
        logger.info("========================================");
        logger.info("开始修复价格...");
        logger.info("========================================");

        for (const issue of issues) {
            try {
                // 使用 Pricing Module 更新价格
                await pricingService.updatePrices([
                    {
                        id: issue.priceId,
                        amount: issue.suggestedPrice,
                    },
                ]);

                fixedCount++;
                logger.info(`✅ 已修复 [${issue.productTitle}] ${issue.variantTitle}`);
                logger.info(`   ${issue.currentPrice} -> ${issue.suggestedPrice}`);
            } catch (error) {
                logger.error(`❌ 修复失败 [${issue.productTitle}] ${issue.variantTitle}: ${error}`);
            }
        }
    }

    // 4. 输出总结
    logger.info("");
    logger.info("========================================");
    logger.info("检查完成！");
    logger.info("========================================");
    logger.info(`总计检查变体: ${variants.length}`);
    logger.info(`发现问题: ${issuesFound}`);
    if (AUTO_FIX) {
        logger.info(`已修复: ${fixedCount}`);
        logger.info(`修复失败: ${issuesFound - fixedCount}`);
    } else {
        logger.info("提示: 设置 AUTO_FIX = true 可启用自动修复");
    }
    logger.info("========================================");
}
