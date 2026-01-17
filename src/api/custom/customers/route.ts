
import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

export const AUTHENTICATE = false

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerService = req.scope.resolve(Modules.CUSTOMER)
  const authService = req.scope.resolve(Modules.AUTH)

  const { email, password, first_name, last_name, phone } = req.body as any

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" })
  }

  try {
      // 1. Check if customer exists
      const customers = await customerService.listCustomers({
        email: email,
      })

      const existingCustomer = customers[0]

      if (existingCustomer) {
        // 2. Check for existing Auth Identity
        const identities = await authService.listAuthIdentities({
          entity_id: email,
        })

        if (identities.length > 0) {
          // Explicitly return 422 as expected by standard registration forms for conflicts
          return res.status(422).json({ message: "Identity with email already exists" })
        }

        // 3. Guest Customer detected: Register/Claim logic
        console.log(`[POST /store/customers] Converting guest customer ${email} to registered.`)

        await authService.createAuthIdentities({
            provider_identities: [{
                entity_id: email,
                provider_id: "emailpass",
                user_metadata: {},
                secrets: { password: password }
            }],
            app_metadata: {
                customer_id: existingCustomer.id
            }
        })

        const updateData: any = { has_account: true }
        if (first_name) updateData.first_name = first_name
        if (last_name) updateData.last_name = last_name
        if (phone) updateData.phone = phone

        const updatedCustomer = await customerService.updateCustomers(existingCustomer.id, updateData)

        // Note: Welcome email is typically triggered by customer.created.
        // Since we are updating, it won't trigger automatically.
        // We could manually trigger a notification here if desired, but let's stick to fixing the error first.

        return res.json({ customer: updatedCustomer })
      }

      // 4. New Customer Creation
      console.log(`[POST /store/customers] Creating new customer ${email}.`)

      const newCustomer = await customerService.createCustomers({
          email,
          first_name,
          last_name,
          phone,
          has_account: true
      })

      await authService.createAuthIdentities({
        provider_identities: [{
            entity_id: email,
            provider_id: "emailpass",
            user_metadata: {},
            secrets: { password: password }
        }],
        app_metadata: {
            customer_id: newCustomer.id
        }
    })

    return res.json({ customer: newCustomer })

  } catch (error) {
      console.error("[POST /store/customers] Error:", error)
      return res.status(500).json({ message: "An error occurred during registration" })
  }
}
