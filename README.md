# Karshard 🧠🔥

> Next-level load balancer & server orchestrator for Gen Z devs. Real-time dashboard, auto-scaling, Cloudflare & Azure integration. No cap, this is cloud game on hard mode. 

## 🚀 What is Karshard?

Karshard is a real-time, modular load balancer and server manager. It auto-scales VMs on Azure, manages DNS & firewall with Cloudflare, and gives you a live dashboard to flex your infra stats. All coded with Fastify, WebSocket, and pure Node.js vibes.

## 🛠️ Features

- Real-time dashboard (Chart.js, WebSocket, Fastify)
- Auto VM creation & deletion (Azure ARM, custom scripts)
- Cloudflare DNS & firewall automation
- CPU/RAM/traffic-based load balancing
- Under-attack mode (Cloudflare rules)
- Modular structure (host, node, serve, module)
- Plug & play config (JSON)

## 🏗️ Project Structure

```
host/         # API for host status & redirect
module/       # Core logic, event system, plugins
node/         # Node server, .env support
serve/        # Main load balancer, dashboard, Cloudflare, Azure
```

## ⚡ Quick Start

1. Clone this repo
2. Install deps in all folders: `npm install`
3. Set up your `.env` (see below)
4. Run `node serve/index.js` for the dashboard & load balancer
5. Hit `http://localhost:5000` for the dashboard

## 🧩 .env Example

```
WS_TOKEN=your_secret_token
WS_URL=ws://localhost:5000
CLOUDFLARE_ZONE_ID=xxx
CLOUDFLARE_API_TOKEN=xxx
CLOUDFLARE_URLS=your.domain.com
CLOUDFLARE_RULES=rule_id1,rule_id2
AZURE_SUBSCRIPTION_ID=xxx
AZURE_TENANT_ID=xxx
AZURE_CLIENT_ID=xxx
AZURE_CLIENT_SECRET=xxx
machineName=ubuntu
machinePass=supersecret
```

## 🖥️ Dashboard

- Real-time stats: server count, CPU, RAM, requests, traffic
- Live server list with CPU/RAM bars
- Attack mode detection & Cloudflare integration
- Built with Chart.js, pure HTML/CSS, no React bloat

## 🤖 Auto Scaling

- Azure VMs created/deleted based on CPU load (see `serve/createVm.js`, `serve/MachineCreates/azure/`)
- Custom cloud-init script runs on new VMs (`run.sh`)
- DNS & firewall rules auto-managed via Cloudflare API

## 🔥 API Endpoints

- `/Status` - Get current host data
- `/Redirect` - Redirect to current host URL
- `/` - Dashboard (HTML)

## 🧠 Tech Stack

- Node.js, Fastify, WebSocket, Chart.js
- Azure ARM, Cloudflare API, systeminformation
- dotenv, fastify-plugin, express (for VMs)

## 📁 Key Files

- `serve/index.js` - Main server, dashboard, WebSocket
- `serve/createVm.js` - VM orchestration logic
- `serve/Cloudflare/index.js` - Cloudflare API integration
- `module/` - Core plugins & event system
- `host/` - Host API

## 📝 Config

Edit `serve/config.json` for:
- VM types/counts
- CPU thresholds
- Allowed IPs
- Under-attack detection
---