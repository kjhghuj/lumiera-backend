import { CreateInventoryLevelInput, ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import {
  createApiKeysWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresStep,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";
import { ApiKey } from "../../.medusa/types/query-entry-points";

const updateStoreCurrencies = createWorkflow(
  "update-store-currencies",
  (input: {
    supported_currencies: { currency_code: string; is_default?: boolean }[];
    store_id: string;
  }) => {
    const normalizedInput = transform({ input }, (data) => {
      return {
        selector: { id: data.input.store_id },
        update: {
          supported_currencies: data.input.supported_currencies.map(
            (currency) => {
              return {
                currency_code: currency.currency_code,
                is_default: currency.is_default ?? false,
              };
            }
          ),
        },
      };
    });

    const stores = updateStoresStep(normalizedInput);

    return new WorkflowResponse(stores);
  }
);

export default async function seedDemoData({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const storeModuleService = container.resolve(Modules.STORE);

  // LUMIERA ships to UK and EU
  const countries = ["gb", "de", "dk", "se", "fr", "es", "it", "nl", "be"];

  logger.info("Seeding LUMIERA store data...");
  const [store] = await storeModuleService.listStores();
  
  // Update store name
  await storeModuleService.updateStores(store.id, {
    name: "LUMIERA",
  });
  
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "LUMIERA Storefront",
  });

  if (!defaultSalesChannel.length) {
    const { result: salesChannelResult } = await createSalesChannelsWorkflow(
      container
    ).run({
      input: {
        salesChannelsData: [
          {
            name: "LUMIERA Storefront",
            description: "Premium intimate wellness products",
          },
        ],
      },
    });
    defaultSalesChannel = salesChannelResult;
  }

  await updateStoreCurrencies(container).run({
    input: {
      store_id: store.id,
      supported_currencies: [
        {
          currency_code: "gbp",
          is_default: true,
        },
        {
          currency_code: "eur",
        },
        {
          currency_code: "usd",
        },
      ],
    },
  });

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_sales_channel_id: defaultSalesChannel[0].id,
      },
    },
  });

  logger.info("Seeding region data...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "United Kingdom",
          currency_code: "gbp",
          countries: ["gb"],
          payment_providers: ["pp_system_default"],
        },
        {
          name: "Europe",
          currency_code: "eur",
          countries: ["de", "dk", "se", "fr", "es", "it", "nl", "be"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const ukRegion = regionResult[0];
  const euRegion = regionResult[1];
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code,
      provider_id: "tp_system",
    })),
  });
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "LUMIERA UK Warehouse",
          address: {
            city: "London",
            country_code: "GB",
            address_1: "123 Wellness Way",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        default_location_id: stockLocation.id,
      },
    },
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info("Seeding fulfillment data...");
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default",
  });
  let shippingProfile = shippingProfiles.length ? shippingProfiles[0] : null;

  if (!shippingProfile) {
    const { result: shippingProfileResult } =
      await createShippingProfilesWorkflow(container).run({
        input: {
          data: [
            {
              name: "LUMIERA Discreet Shipping",
              type: "default",
            },
          ],
        },
      });
    shippingProfile = shippingProfileResult[0];
  }

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "LUMIERA Delivery",
    type: "shipping",
    service_zones: [
      {
        name: "UK & Europe",
        geo_zones: countries.map((code) => ({
          country_code: code,
          type: "country" as const,
        })),
      },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Discreet Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Discreet Standard",
          description: "Discreet packaging, delivered in 3-5 business days.",
          code: "discreet-standard",
        },
        prices: [
          { currency_code: "gbp", amount: 499 },
          { currency_code: "eur", amount: 599 },
          { currency_code: "usd", amount: 699 },
          { region_id: ukRegion.id, amount: 499 },
          { region_id: euRegion.id, amount: 599 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
      {
        name: "Discreet Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Discreet Express",
          description: "Discreet packaging, delivered next business day.",
          code: "discreet-express",
        },
        prices: [
          { currency_code: "gbp", amount: 999 },
          { currency_code: "eur", amount: 1199 },
          { currency_code: "usd", amount: 1399 },
          { region_id: ukRegion.id, amount: 999 },
          { region_id: euRegion.id, amount: 1199 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
      {
        name: "Free Shipping (Orders over £75)",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Free Discreet Shipping",
          description: "Complimentary discreet shipping on orders over £75.",
          code: "free-shipping",
        },
        prices: [
          { currency_code: "gbp", amount: 0 },
          { currency_code: "eur", amount: 0 },
          { currency_code: "usd", amount: 0 },
          { region_id: ukRegion.id, amount: 0 },
          { region_id: euRegion.id, amount: 0 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  });
  logger.info("Finished seeding fulfillment data.");

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding publishable API key data...");
  let publishableApiKey: ApiKey | null = null;
  const { data } = await query.graph({
    entity: "api_key",
    fields: ["id", "token"],
    filters: {
      type: "publishable",
    },
  });

  publishableApiKey = data?.[0];

  if (!publishableApiKey) {
    const {
      result: [publishableApiKeyResult],
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "LUMIERA Storefront",
            type: "publishable",
            created_by: "",
          },
        ],
      },
    });

    publishableApiKey = publishableApiKeyResult as ApiKey;
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel[0].id],
    },
  });
  logger.info(`Publishable API Key: ${(publishableApiKey as any).token || publishableApiKey.id}`);
  logger.info("Finished seeding publishable API key data.");

  logger.info("Seeding product categories...");
  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        {
          name: "Solo Play",
          handle: "solo-play",
          description: "Personal pleasure devices designed for self-exploration and wellness.",
          is_active: true,
        },
        {
          name: "Couples",
          handle: "couples",
          description: "Intimate products designed to enhance connection and shared experiences.",
          is_active: true,
        },
        {
          name: "Wellness",
          handle: "wellness",
          description: "Therapeutic devices for pelvic health and physical wellbeing.",
          is_active: true,
        },
        {
          name: "Accessories",
          handle: "accessories",
          description: "Premium accessories, lubricants, and care products.",
          is_active: true,
        },
      ],
    },
  });

  const soloCategory = categoryResult.find((cat) => cat.name === "Solo Play")!;
  const couplesCategory = categoryResult.find((cat) => cat.name === "Couples")!;
  const wellnessCategory = categoryResult.find((cat) => cat.name === "Wellness")!;
  const accessoriesCategory = categoryResult.find((cat) => cat.name === "Accessories")!;

  logger.info("Seeding LUMIERA products...");

  await createProductsWorkflow(container).run({
    input: {
      products: [
        // ===== SOLO PLAY PRODUCTS =====
        {
          title: "The Rose",
          handle: "the-rose",
          subtitle: "Clitoral Suction Massager",
          description: "Experience the gentle embrace of The Rose. Using innovative air-pulse technology, this elegant device delivers whisper-quiet waves of pleasure that mimic the sensation of oral stimulation. Crafted from body-safe medical-grade silicone with a waterproof design for versatile enjoyment.",
          category_ids: [soloCategory.id],
          weight: 120,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            { url: "https://images.unsplash.com/photo-1616627561950-9f8405d7b972?auto=format&fit=crop&q=80&w=800" },
            { url: "https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?auto=format&fit=crop&q=80&w=800" },
          ],
          options: [
            { title: "Color", values: ["Dusty Rose", "Midnight Black", "Pearl White"] },
          ],
          variants: [
            {
              title: "Dusty Rose",
              sku: "ROSE-DR",
              options: { Color: "Dusty Rose" },
              prices: [
                { amount: 7900, currency_code: "gbp" },
                { amount: 8900, currency_code: "eur" },
                { amount: 9900, currency_code: "usd" },
              ],
            },
            {
              title: "Midnight Black",
              sku: "ROSE-MB",
              options: { Color: "Midnight Black" },
              prices: [
                { amount: 7900, currency_code: "gbp" },
                { amount: 8900, currency_code: "eur" },
                { amount: 9900, currency_code: "usd" },
              ],
            },
            {
              title: "Pearl White",
              sku: "ROSE-PW",
              options: { Color: "Pearl White" },
              prices: [
                { amount: 7900, currency_code: "gbp" },
                { amount: 8900, currency_code: "eur" },
                { amount: 9900, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "The Wand",
          handle: "the-wand",
          subtitle: "Deep Tissue Massager",
          description: "The Wand combines powerful, rumbly vibrations with an ergonomic design for full-body relaxation. With 10 intensity levels and 5 pulsation patterns, this versatile device is perfect for tension relief and intimate exploration. Features a flexible neck and whisper-quiet motor.",
          category_ids: [soloCategory.id],
          weight: 350,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            { url: "https://images.unsplash.com/photo-1556228720-19875b1d564b?auto=format&fit=crop&q=80&w=800" },
          ],
          options: [
            { title: "Color", values: ["Sage Green", "Warm Taupe"] },
          ],
          variants: [
            {
              title: "Sage Green",
              sku: "WAND-SG",
              options: { Color: "Sage Green" },
              prices: [
                { amount: 12900, currency_code: "gbp" },
                { amount: 14900, currency_code: "eur" },
                { amount: 15900, currency_code: "usd" },
              ],
            },
            {
              title: "Warm Taupe",
              sku: "WAND-WT",
              options: { Color: "Warm Taupe" },
              prices: [
                { amount: 12900, currency_code: "gbp" },
                { amount: 14900, currency_code: "eur" },
                { amount: 15900, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "The Curve",
          handle: "the-curve",
          subtitle: "G-Spot Massager",
          description: "Anatomically designed with a curved silhouette, The Curve features a precisely angled tip for targeted G-spot stimulation. 8 vibration modes ranging from gentle rumbles to intense pulsations. Waterproof and USB-rechargeable.",
          category_ids: [soloCategory.id],
          weight: 100,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            { url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=800" },
          ],
          options: [
            { title: "Color", values: ["Blush Pink", "Deep Purple"] },
          ],
          variants: [
            {
              title: "Blush Pink",
              sku: "CURVE-BP",
              options: { Color: "Blush Pink" },
              prices: [
                { amount: 8900, currency_code: "gbp" },
                { amount: 9900, currency_code: "eur" },
                { amount: 10900, currency_code: "usd" },
              ],
            },
            {
              title: "Deep Purple",
              sku: "CURVE-DP",
              options: { Color: "Deep Purple" },
              prices: [
                { amount: 8900, currency_code: "gbp" },
                { amount: 9900, currency_code: "eur" },
                { amount: 10900, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        // ===== COUPLES PRODUCTS =====
        {
          title: "The Ring",
          handle: "the-ring",
          subtitle: "Vibrating Couples Ring",
          description: "Designed for shared pleasure, The Ring features a powerful motor positioned for clitoral stimulation during intimacy. Stretchy, body-safe silicone fits comfortably and provides gentle constriction. 10 vibration patterns controlled via touch or app.",
          category_ids: [couplesCategory.id],
          weight: 50,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            { url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800" },
          ],
          options: [
            { title: "Color", values: ["Charcoal", "Navy Blue"] },
          ],
          variants: [
            {
              title: "Charcoal",
              sku: "RING-CH",
              options: { Color: "Charcoal" },
              prices: [
                { amount: 4900, currency_code: "gbp" },
                { amount: 5500, currency_code: "eur" },
                { amount: 5900, currency_code: "usd" },
              ],
            },
            {
              title: "Navy Blue",
              sku: "RING-NB",
              options: { Color: "Navy Blue" },
              prices: [
                { amount: 4900, currency_code: "gbp" },
                { amount: 5500, currency_code: "eur" },
                { amount: 5900, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "The Duo",
          handle: "the-duo",
          subtitle: "Wearable Couples Vibrator",
          description: "The Duo is designed to be worn during intimacy, providing hands-free stimulation for both partners. Features dual motors with independent controls, a flexible design that adapts to your body, and app connectivity for long-distance play.",
          category_ids: [couplesCategory.id],
          weight: 80,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            { url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800" },
          ],
          options: [
            { title: "Color", values: ["Coral", "Slate Grey"] },
          ],
          variants: [
            {
              title: "Coral",
              sku: "DUO-CO",
              options: { Color: "Coral" },
              prices: [
                { amount: 11900, currency_code: "gbp" },
                { amount: 13500, currency_code: "eur" },
                { amount: 14900, currency_code: "usd" },
              ],
            },
            {
              title: "Slate Grey",
              sku: "DUO-SG",
              options: { Color: "Slate Grey" },
              prices: [
                { amount: 11900, currency_code: "gbp" },
                { amount: 13500, currency_code: "eur" },
                { amount: 14900, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        // ===== WELLNESS PRODUCTS =====
        {
          title: "Kegel Trainer",
          handle: "kegel-trainer",
          subtitle: "Smart Pelvic Floor Exerciser",
          description: "Strengthen your pelvic floor with our app-connected Kegel Trainer. Features biofeedback sensors that track your progress, guided exercises for all levels, and a comfortable ergonomic design. Recommended by physiotherapists for bladder control and intimate wellness.",
          category_ids: [wellnessCategory.id],
          weight: 60,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            { url: "https://images.unsplash.com/photo-1522771753035-4a53c9d13185?auto=format&fit=crop&q=80&w=800" },
          ],
          options: [
            { title: "Size", values: ["Standard", "Petite"] },
          ],
          variants: [
            {
              title: "Standard",
              sku: "KEGEL-STD",
              options: { Size: "Standard" },
              prices: [
                { amount: 9900, currency_code: "gbp" },
                { amount: 11500, currency_code: "eur" },
                { amount: 12900, currency_code: "usd" },
              ],
            },
            {
              title: "Petite",
              sku: "KEGEL-PET",
              options: { Size: "Petite" },
              prices: [
                { amount: 9900, currency_code: "gbp" },
                { amount: 11500, currency_code: "eur" },
                { amount: 12900, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Intimate Massage Oil",
          handle: "intimate-massage-oil",
          subtitle: "Organic Botanical Blend",
          description: "A luxurious blend of organic jojoba, sweet almond, and vitamin E oils, infused with subtle notes of ylang-ylang and sandalwood. Designed for intimate massage, this silky formula absorbs slowly, leaving skin nourished without residue. Never tested on animals.",
          category_ids: [wellnessCategory.id],
          weight: 200,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            { url: "https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?auto=format&fit=crop&q=80&w=800" },
          ],
          options: [
            { title: "Size", values: ["100ml", "200ml"] },
          ],
          variants: [
            {
              title: "100ml",
              sku: "OIL-100",
              options: { Size: "100ml" },
              prices: [
                { amount: 2400, currency_code: "gbp" },
                { amount: 2800, currency_code: "eur" },
                { amount: 2900, currency_code: "usd" },
              ],
            },
            {
              title: "200ml",
              sku: "OIL-200",
              options: { Size: "200ml" },
              prices: [
                { amount: 3900, currency_code: "gbp" },
                { amount: 4500, currency_code: "eur" },
                { amount: 4900, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        // ===== ACCESSORIES =====
        {
          title: "Water-Based Lubricant",
          handle: "water-based-lubricant",
          subtitle: "Premium Personal Lubricant",
          description: "Our pH-balanced, water-based formula is designed for sensitive skin and is compatible with all toy materials. Fragrance-free, paraben-free, and glycerin-free. Long-lasting glide that rinses away easily. Perfect for intimate moments.",
          category_ids: [accessoriesCategory.id],
          weight: 150,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            { url: "https://images.unsplash.com/photo-1616627561950-9f8405d7b972?auto=format&fit=crop&q=80&w=800" },
          ],
          options: [
            { title: "Size", values: ["50ml", "100ml", "200ml"] },
          ],
          variants: [
            {
              title: "50ml",
              sku: "LUBE-50",
              options: { Size: "50ml" },
              prices: [
                { amount: 1200, currency_code: "gbp" },
                { amount: 1400, currency_code: "eur" },
                { amount: 1500, currency_code: "usd" },
              ],
            },
            {
              title: "100ml",
              sku: "LUBE-100",
              options: { Size: "100ml" },
              prices: [
                { amount: 1800, currency_code: "gbp" },
                { amount: 2100, currency_code: "eur" },
                { amount: 2200, currency_code: "usd" },
              ],
            },
            {
              title: "200ml",
              sku: "LUBE-200",
              options: { Size: "200ml" },
              prices: [
                { amount: 2800, currency_code: "gbp" },
                { amount: 3200, currency_code: "eur" },
                { amount: 3500, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Toy Cleaner",
          handle: "toy-cleaner",
          subtitle: "Antibacterial Spray",
          description: "Keep your intimate products hygienically clean with our gentle, antibacterial toy cleaner. Alcohol-free formula is safe for all materials including silicone, glass, and metal. Simply spray, wipe, and air dry.",
          category_ids: [accessoriesCategory.id],
          weight: 100,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            { url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?auto=format&fit=crop&q=80&w=800" },
          ],
          options: [
            { title: "Size", values: ["100ml"] },
          ],
          variants: [
            {
              title: "100ml",
              sku: "CLEANER-100",
              options: { Size: "100ml" },
              prices: [
                { amount: 900, currency_code: "gbp" },
                { amount: 1000, currency_code: "eur" },
                { amount: 1100, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
        {
          title: "Satin Storage Pouch",
          handle: "satin-storage-pouch",
          subtitle: "Discreet Storage Bag",
          description: "Store your intimate products in style with our luxurious satin pouch. Features a drawstring closure, soft interior lining to protect your devices, and an elegant LUMIERA embroidery. Available in multiple sizes.",
          category_ids: [accessoriesCategory.id],
          weight: 30,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            { url: "https://images.unsplash.com/photo-1522771753035-4a53c9d13185?auto=format&fit=crop&q=80&w=800" },
          ],
          options: [
            { title: "Size", values: ["Small", "Medium", "Large"] },
          ],
          variants: [
            {
              title: "Small",
              sku: "POUCH-S",
              options: { Size: "Small" },
              prices: [
                { amount: 1200, currency_code: "gbp" },
                { amount: 1400, currency_code: "eur" },
                { amount: 1500, currency_code: "usd" },
              ],
            },
            {
              title: "Medium",
              sku: "POUCH-M",
              options: { Size: "Medium" },
              prices: [
                { amount: 1500, currency_code: "gbp" },
                { amount: 1700, currency_code: "eur" },
                { amount: 1900, currency_code: "usd" },
              ],
            },
            {
              title: "Large",
              sku: "POUCH-L",
              options: { Size: "Large" },
              prices: [
                { amount: 1800, currency_code: "gbp" },
                { amount: 2100, currency_code: "eur" },
                { amount: 2300, currency_code: "usd" },
              ],
            },
          ],
          sales_channels: [{ id: defaultSalesChannel[0].id }],
        },
      ],
    },
  });
  logger.info("Finished seeding product data.");

  logger.info("Seeding inventory levels.");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  const inventoryLevels: CreateInventoryLevelInput[] = [];
  for (const inventoryItem of inventoryItems) {
    const inventoryLevel = {
      location_id: stockLocation.id,
      stocked_quantity: 1000,
      inventory_item_id: inventoryItem.id,
    };
    inventoryLevels.push(inventoryLevel);
  }

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryLevels,
    },
  });

  logger.info("Finished seeding inventory levels data.");
  logger.info("======================================");
  logger.info("LUMIERA seed data complete!");
  logger.info(`Publishable API Key: ${(publishableApiKey as any).token || "Check admin panel"}`);
  logger.info("======================================");
}
