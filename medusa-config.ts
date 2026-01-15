import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  modules: [
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "./src/modules/resend",
            id: "resend",
            options: {
              channels: ["email"],
              apiKey: process.env.RESEND_API_KEY,
              from: process.env.RESEND_FROM_EMAIL,
            },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/payment-stripe",
            id: "stripe",
            options: {
              apiKey: process.env.STRIPE_API_KEY,
            },
          },
        ],
      },
    },
  ],
  admin: {
    // 启用中文语言支持
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9030",
  }
})

// Security Checks
const jwtSecret = process.env.JWT_SECRET || "supersecret"
const cookieSecret = process.env.COOKIE_SECRET || "supersecret"
const resendApiKey = process.env.RESEND_API_KEY
const stripeApiKey = process.env.STRIPE_API_KEY

if (process.env.NODE_ENV === 'production') {
  // Critical security checks for production
  if (jwtSecret === "supersecret" || cookieSecret === "supersecret") {
    throw new Error("❌ SECURITY ERROR: JWT_SECRET and COOKIE_SECRET must be set to secure values in production and cannot be 'supersecret'.")
  }

  if (!resendApiKey || resendApiKey === 'your_resend_api_key_here') {
    console.warn("⚠️  WARNING: RESEND_API_KEY is not configured. Email notifications will fail.")
  }
} else {
  // Development warnings
  if (jwtSecret === "supersecret" || cookieSecret === "supersecret") {
    console.warn("⚠️  SECURITY WARNING: Using default insecure secrets. Ensure JWT_SECRET and COOKIE_SECRET are set to secure random values in production.")
  }

  if (!resendApiKey || resendApiKey === 'your_resend_api_key_here') {
    console.warn("⚠️  INFO: RESEND_API_KEY is not configured. Email notifications will not work.")
  }

  if (!stripeApiKey || stripeApiKey === 'your_stripe_secret_key') {
    console.warn("⚠️  INFO: STRIPE_API_KEY is not configured. Stripe payments will not work.")
  }
}
