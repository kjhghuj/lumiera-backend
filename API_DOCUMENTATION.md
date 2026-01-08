# Lumiera Backend API 文档

## 基础信息

**Base URL**: `http://localhost:9000` (开发环境)  
**API 版本**: Medusa v2  
**认证方式**: Publishable API Key (通过 `x-publishable-api-key` header)

---

## 购物车 API

### 1. 获取购物车详情（含缩略图）

获取购物车的完整信息，包括商品缩略图。

**端点**: `GET /store/carts/{cartId}`

**Headers**:
```
x-publishable-api-key: {your_publishable_key}
```

**路径参数**:
- `cartId` (string, required): 购物车 ID

**响应示例**:
```json
{
  "cart": {
    "id": "cart_01JEXAMPLE",
    "email": "customer@example.com",
    "currency_code": "gbp",
    "region_id": "reg_01JEXAMPLE",
    "items": [
      {
        "id": "item_01JEXAMPLE",
        "quantity": 2,
        "variant": {
          "id": "variant_01JEXAMPLE",
          "title": "Dusty Rose",
          "sku": "ROSE-DR",
          "product": {
            "id": "prod_01JEXAMPLE",
            "title": "The Rose",
            "handle": "the-rose",
            "thumbnail": "https://images.unsplash.com/photo-1616627561950-9f8405d7b972?auto=format&fit=crop&q=80&w=800"
          }
        }
      }
    ]
  }
}
```

**字段说明**:
- `cart.items[].variant.product.thumbnail`: 商品缩略图 URL（已修复，确保返回）
- `cart.items[].variant.product.title`: 商品名称
- `cart.items[].variant.product.handle`: 商品 URL slug
- `cart.items[].variant.images`: **变体专属图片数组**（用于图片切换功能）

**变体图片说明**：
- 每个变体可以有自己的图片集合
- 如果变体没有专属图片，会继承产品级别的图片
- 前端可以根据选择的变体显示对应的图片

---

## 商品 API

### 2. 获取商品详情（含变体图片）

**端点**: `GET /store/products/{productId}`

**路径参数**:
- `productId` (string, required): 商品 ID 或 handle

**响应示例**:
```json
{
  "product": {
    "id": "prod_01JEXAMPLE",
    "title": "The Rose",
    "subtitle": "Clitoral Suction Massager",
    "handle": "the-rose",
    "thumbnail": "https://images.unsplash.com/photo-1616627561950-9f8405d7b972?auto=format&fit=crop&q=80&w=800",
    "images": [
      {
        "id": "img_01JEXAMPLE",
        "url": "https://images.unsplash.com/photo-1616627561950-9f8405d7b972?auto=format&fit=crop&q=80&w=800"
      }
    ],
    "variants": [
      {
        "id": "variant_01JEXAMPLE",
        "title": "Dusty Rose",
        "sku": "ROSE-DR",
        "images": [
          {
            "id": "img_01JEXAMPLE",
            "url": "https://images.unsplash.com/photo-1616627561950-9f8405d7b972?auto=format&fit=crop&q=80&w=800"
          }
        ],
        "prices": [
          {
            "amount": 7900,
            "currency_code": "gbp"
          }
        ]
      }
    ]
  }
}
```

---

### 3. 获取商品列表

**端点**: `GET /store/products`

**Query 参数**:
- `fields` (string, optional): 指定返回字段，例如 `id,title,thumbnail,handle`
- `limit` (number, optional): 每页数量，默认 20
- `offset` (number, optional): 偏移量

**Headers**:
```
x-publishable-api-key: {your_publishable_key}
```

**请求示例**:
```
GET /store/products?fields=id,title,thumbnail,handle&limit=10
```

**响应示例**:
```json
{
  "products": [
    {
      "id": "prod_01JEXAMPLE",
      "title": "The Rose",
      "handle": "the-rose",
      "thumbnail": "https://images.unsplash.com/photo-1616627561950-9f8405d7b972?auto=format&fit=crop&q=80&w=800"
    }
  ],
  "count": 10,
  "offset": 0,
  "limit": 10
}
```

---

### 3. 获取单个商品详情

**端点**: `GET /store/products/{productId}`

**路径参数**:
- `productId` (string, required): 商品 ID 或 handle

**响应示例**:
```json
{
  "product": {
    "id": "prod_01JEXAMPLE",
    "title": "The Rose",
    "subtitle": "Clitoral Suction Massager",
    "description": "Experience the gentle embrace...",
    "handle": "the-rose",
    "thumbnail": "https://images.unsplash.com/photo-1616627561950-9f8405d7b972?auto=format&fit=crop&q=80&w=800",
    "images": [
      {
        "id": "img_01JEXAMPLE",
        "url": "https://images.unsplash.com/photo-1616627561950-9f8405d7b972?auto=format&fit=crop&q=80&w=800"
      }
    ],
    "variants": [
      {
        "id": "variant_01JEXAMPLE",
        "title": "Dusty Rose",
        "sku": "ROSE-DR",
        "prices": [
          {
            "amount": 7900,
            "currency_code": "gbp"
          }
        ]
      }
    ]
  }
}
```

---

## 常见问题

### Q: 为什么购物车中看不到缩略图？

**A**: 确保使用自定义端点 `GET /store/carts/{cartId}`，该端点已配置为自动返回 `thumbnail` 字段。

### Q: 如何获取 Publishable API Key？

**A**: 运行 seed 脚本后，在后端日志中查找 "Publishable API Key" 输出，或在 Medusa Admin 面板中创建。

### Q: 价格单位是什么？

**A**: 所有价格以**最小货币单位**表示（例如：7900 = £79.00）。

---

## 错误处理

所有 API 错误遵循以下格式：

```json
{
  "type": "not_found",
  "message": "Cart not found"
}
```

**常见错误码**:
- `400`: 请求参数错误
- `401`: 未授权（缺少或无效的 API key）
- `404`: 资源不存在
- `500`: 服务器内部错误

---

## 开发提示

1. **缩略图字段**: 所有商品都有 `thumbnail` 字段，值为完整的图片 URL
2. **货币**: 当前支持 GBP (英镑), EUR (欧元), USD (美元)
3. **CORS**: 已配置允许本地开发环境访问
4. **测试**: 使用 Postman 或 curl 测试 API 端点

---

**文档版本**: 1.0  
**最后更新**: 2026-01-08
