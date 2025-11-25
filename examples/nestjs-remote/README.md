# NestJS Remote Example with Consul

This example demonstrates how to use Type Config with NestJS and Consul as a remote configuration backend.

## Prerequisites
- Node.js >= 16
- [Consul](https://www.consul.io/) (Docker or native binary)

## 1. Start Consul

### Option A: Using Docker (recommended)
```sh
docker run -d --name dev-consul -p 8500:8500 consul:1.15
```

### Option B: Using Homebrew (macOS) or direct binary
```sh
brew install consul
consul agent -dev -client=0.0.0.0
```

## 2. Set Required Configuration Keys in Consul

The app expects certain configuration keys to be present. Set them using the Consul CLI:

```sh
consul kv put nestjs-app/database/host localhost
consul kv put nestjs-app/database/username myuser
consul kv put nestjs-app/database/password mypass
```

You can add more keys as needed for your config classes.

## 3. Build and Run the Example

```sh
npm install
npm run build
NODE_ENV=development CONSUL_HOST=localhost CONSUL_PORT=8500 npm start
```

The app will start and connect to Consul for configuration.

## 4. Test the Endpoints

- `GET http://localhost:3000/config` — returns the loaded configuration
- `GET http://localhost:3000/health` — health check

## 5. Stopping Consul

- If using Docker:
  ```sh
  docker stop dev-consul && docker rm dev-consul
  ```
- If using Homebrew/binary: Press `Ctrl+C` in the terminal running Consul.

---

For more details, see the source code and config files in this directory.

