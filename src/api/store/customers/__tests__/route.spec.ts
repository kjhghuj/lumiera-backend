
import { POST } from "../route"
import { Modules } from "@medusajs/framework/utils"

describe("POST /store/customers", () => {
  const customerServiceMock = {
    listCustomers: jest.fn(),
    createCustomers: jest.fn(),
    updateCustomers: jest.fn(),
  }

  const authServiceMock = {
    listAuthIdentities: jest.fn(),
    createAuthIdentities: jest.fn(),
  }

  const reqMock = {
    scope: {
      resolve: jest.fn((key) => {
        if (key === Modules.CUSTOMER) return customerServiceMock
        if (key === Modules.AUTH) return authServiceMock
        return {}
      }),
    },
    body: {
      email: "test@example.com",
      password: "password123",
      first_name: "John",
      last_name: "Doe",
    },
  } as any

  const resMock = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as any

  afterEach(() => {
    jest.clearAllMocks()
  })

  it("should return 400 if email or password missing", async () => {
    const req = { ...reqMock, body: { email: "test@example.com" } }
    await POST(req, resMock)
    expect(resMock.status).toHaveBeenCalledWith(400)
  })

  it("should return 422 if auth identity already exists", async () => {
    customerServiceMock.listCustomers.mockResolvedValue([{ id: "cust_123" }])
    authServiceMock.listAuthIdentities.mockResolvedValue([{ id: "auth_123" }])

    await POST(reqMock, resMock)

    expect(resMock.status).toHaveBeenCalledWith(422)
    expect(resMock.json).toHaveBeenCalledWith({ message: "Identity with email already exists" })
  })

  it("should upgrade guest customer if customer exists but no auth identity", async () => {
    const guestCustomer = { id: "cust_123", email: "test@example.com", has_account: false }
    customerServiceMock.listCustomers.mockResolvedValue([guestCustomer])
    authServiceMock.listAuthIdentities.mockResolvedValue([]) // No identity

    const updatedCustomer = { ...guestCustomer, has_account: true, first_name: "John" }
    customerServiceMock.updateCustomers.mockResolvedValue(updatedCustomer)

    await POST(reqMock, resMock)

    // Should create auth identity
    expect(authServiceMock.createAuthIdentities).toHaveBeenCalledWith(expect.objectContaining({
        provider_identities: expect.arrayContaining([
            expect.objectContaining({ entity_id: "test@example.com" })
        ]),
        app_metadata: { customer_id: "cust_123" }
    }))

    // Should update customer
    expect(customerServiceMock.updateCustomers).toHaveBeenCalledWith("cust_123", expect.objectContaining({
        first_name: "John",
        has_account: true
    }))

    expect(resMock.json).toHaveBeenCalledWith({ customer: updatedCustomer })
  })

  it("should create new customer and identity if neither exist", async () => {
    customerServiceMock.listCustomers.mockResolvedValue([])

    const newCustomer = { id: "cust_new", email: "test@example.com" }
    customerServiceMock.createCustomers.mockResolvedValue(newCustomer)

    await POST(reqMock, resMock)

    // Should create customer
    expect(customerServiceMock.createCustomers).toHaveBeenCalledWith(expect.objectContaining({
        email: "test@example.com",
        first_name: "John"
    }))

    // Should create auth identity linked to new customer
    expect(authServiceMock.createAuthIdentities).toHaveBeenCalledWith(expect.objectContaining({
        app_metadata: { customer_id: "cust_new" }
    }))

    expect(resMock.json).toHaveBeenCalledWith({ customer: newCustomer })
  })
})
