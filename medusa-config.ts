import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
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
  ],
  admin: {
    // 启用中文语言支持
    backendUrl: process.env.MEDUSA_BACKEND_URL || "http://localhost:9000",
  }
})

// Security Check
const jwtSecret = process.env.JWT_SECRET || "supersecret"
const cookieSecret = process.env.COOKIE_SECRET || "supersecret"

if (process.env.NODE_ENV === 'production') {
  if (jwtSecret === "supersecret" || cookieSecret === "supersecret") {
    throw new Error("❌ SEGURITY ERROR: JWT_SECRET and COOKIE_SECRET must be set in production and cannot be 'supersecret'.")
  }
} else {
  if (jwtSecret === "supersecret" || cookieSecret === "supersecret") {
    console.warn("⚠️  SECURITY WARNING: Using default insecure secrets. Ensure JWT_SECRET and COOKIE_SECRET are set in production.")
  }
}
