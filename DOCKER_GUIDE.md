# Docker 部署指南

本指南介绍如何使用 Docker 启动 Lumiera 后端服务。

## 前置要求

- Docker Desktop 已安装并运行
- Docker Compose 已安装（通常随 Docker Desktop 一起安装）

## 快速开始

### 1. 启动所有服务（推荐）

一键启动 PostgreSQL、Redis 和后端应用：

```bash
cd c:\Users\admin\Desktop\lumiera\backend
docker-compose up -d
```

### 2. 查看服务状态

```bash
docker-compose ps
```

### 3. 查看后端日志

```bash
docker-compose logs -f backend
```

### 4. 停止所有服务

```bash
docker-compose down
```

## 详细说明

### 服务架构

Docker Compose 配置包含三个服务：

1. **postgres** - PostgreSQL 16 数据库
   - 端口: 5432
   - 数据库名: medusa-lumiera
   - 持久化存储: Docker volume

2. **redis** - Redis 7 缓存
   - 端口: 6379

3. **backend** - Lumiera 后端应用
   - 端口: 9030
   - 自动执行数据库迁移
   - 健康检查配置

### 环境变量配置

后端服务使用以下环境变量（在 docker-compose.yml 中配置）：

- `DATABASE_URL`: 使用 Docker 服务名 `postgres`
- `REDIS_URL`: 使用 Docker 服务名 `redis`
- `JWT_SECRET`: 从 .env 文件读取或使用默认值
- `COOKIE_SECRET`: 从 .env 文件读取或使用默认值
- `RESEND_API_KEY`: 从 .env 文件读取
- `RESEND_FROM_EMAIL`: 从 .env 文件读取

### 使用 .env 文件

如果您想使用 .env 文件管理环境变量：

1. 复制 `.env.docker` 模板：
   ```bash
   copy .env.docker .env
   ```

2. 编辑 `.env` 文件，更新必要的配置

3. 重启服务：
   ```bash
   docker-compose down
   docker-compose up -d
   ```

## 常用命令

### 重新构建镜像

如果修改了代码，需要重新构建：

```bash
docker-compose build backend
docker-compose up -d backend
```

### 查看特定服务日志

```bash
# 查看后端日志
docker-compose logs -f backend

# 查看数据库日志
docker-compose logs -f postgres

# 查看 Redis 日志
docker-compose logs -f redis
```

### 进入容器

```bash
# 进入后端容器
docker-compose exec backend sh

# 进入数据库容器
docker-compose exec postgres psql -U postgres -d medusa-lumiera
```

### 清理数据

```bash
# 停止并删除容器、网络
docker-compose down

# 同时删除数据卷（警告：会删除数据库数据）
docker-compose down -v
```

## 健康检查

所有服务都配置了健康检查：

- **PostgreSQL**: 每 5 秒检查一次数据库是否就绪
- **Redis**: 每 5 秒 ping 一次
- **Backend**: 每 30 秒检查 `/health` 端点，启动后 60 秒开始检查

查看健康状态：

```bash
docker-compose ps
```

## 故障排查

### 后端无法启动

1. 检查 PostgreSQL 和 Redis 是否健康：
   ```bash
   docker-compose ps
   ```

2. 查看后端日志：
   ```bash
   docker-compose logs backend
   ```

3. 确认环境变量配置正确

### 数据库连接失败

确保 `DATABASE_URL` 使用 Docker 服务名而不是 localhost：
```
postgres://postgres:postgres@postgres:5432/medusa-lumiera
```

### 端口冲突

如果端口已被占用，修改 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "9031:9030"  # 将主机端口改为 9031
```

## 生产环境部署

在生产环境中：

1. 修改 `NODE_ENV=production`
2. 使用强密码和安全的 secrets
3. 配置适当的资源限制
4. 使用外部数据库（不要使用 Docker 容器中的数据库）
5. 配置备份策略

## 访问服务

- **后端 API**: http://localhost:9030
- **Admin 面板**: http://localhost:9030/app
- **健康检查**: http://localhost:9030/health
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
