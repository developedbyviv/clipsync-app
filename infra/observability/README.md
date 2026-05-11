# ClipSync — Observability Stack

Two-layer observability: **Prometheus + Grafana** (self-hosted on AKS) and **Azure Monitor + Application Insights** (native Azure).

---

## Architecture

```
ClipSync API (/metrics endpoint)
       │
       │  ServiceMonitor (15s scrape)
       ▼
 Prometheus ──────────────────► Grafana
 (kube-prometheus-stack)          ├── clipsync-app.json   (8 panels)
       │                          └── clipsync-infra.json (6 panels)
       └── PrometheusRules
             └── 7 custom alerts (critical + warning)

ClipSync API (App Insights SDK — auto-instrumented)
       │
       │  APPLICATIONINSIGHTS_CONNECTION_STRING (from Key Vault)
       ▼
 Application Insights
       │
       └── Log Analytics Workspace
             └── KQL Queries (10 ready-to-use)
```

---

## Installation Order

```
Step 1: Bicep infrastructure (already done — Week 2)
Step 2: App deployed via Helm + ArgoCD (already done — Week 3)
Step 3: Install Prometheus stack
Step 4: Import Grafana dashboards
Step 5: Verify metrics endpoint
Step 6: Verify Application Insights in Azure Portal
```

---

## Step 3 — Install Prometheus + Grafana

```bash
cd infra/observability/prometheus
chmod +x install.sh
./install.sh
```

The script installs `kube-prometheus-stack` in the `monitoring` namespace and applies the custom ClipSync alert rules.

---

## Step 4 — Import Grafana Dashboards

```bash
# Port-forward Grafana (use port 3001 to avoid clash with local Next.js)
kubectl port-forward svc/kube-prometheus-stack-grafana 3001:80 -n monitoring

# Open http://localhost:3001
# Login: admin / clipsync-grafana-2024
# IMPORTANT: change this password after first login
```

**Import dashboards:**
1. Grafana UI → Dashboards (left sidebar) → **Import**
2. Click **Upload JSON file**
3. Import `infra/observability/grafana/dashboards/clipsync-app.json`
4. Repeat for `clipsync-infra.json`

---

## Step 5 — Verify Metrics Endpoint

```bash
# Port-forward directly to the API pod
kubectl port-forward deployment/clipsync-api 4000:4000 -n clipsync-dev

# Check metrics are being exposed
curl http://localhost:4000/metrics | grep clipsync_

# Expected output includes:
# clipsync_clipboard_created_total{...} 0
# clipsync_websocket_connections_active 0
# http_request_duration_seconds_bucket{...}
# clipsync_nodejs_heap_used_bytes ...
```

---

## Step 6 — Verify Application Insights

```bash
# Check App Insights is receiving data
# Azure Portal → Application Insights → ai-clipsync-dev-inc → Live Metrics
# Create a clipboard via the UI and watch the request appear in real-time
```

---

## Accessing the Tools

| Tool | Command | URL |
|---|---|---|
| Grafana | `kubectl port-forward svc/kube-prometheus-stack-grafana 3001:80 -n monitoring` | http://localhost:3001 |
| Prometheus | `kubectl port-forward svc/kube-prometheus-stack-prometheus 9090:9090 -n monitoring` | http://localhost:9090 |
| Alertmanager | `kubectl port-forward svc/kube-prometheus-stack-alertmanager 9093:9093 -n monitoring` | http://localhost:9093 |

---

## Dashboard Summary

### clipsync-app.json — Application Metrics
| Panel | What it shows |
|---|---|
| Clipboards Created (24h) | Running total of clipboard creations |
| Active WebSocket Connections | Real-time Socket.io client count |
| API Request Rate | Requests per second |
| API Error Rate | % of 5xx responses |
| Response Time p50/p95/p99 | Latency percentiles over time |
| API Pod CPU | CPU usage per pod |
| API Pod Memory | Memory working set per pod |
| Frontend CPU + Memory | Combined frontend resource usage |

### clipsync-infra.json — Infrastructure
| Panel | What it shows |
|---|---|
| Node CPU % | All AKS node CPU over time |
| Node Memory % | All AKS node memory over time |
| Pod Status Table | Pod name, namespace, restart count |
| Kubernetes Warning Events | Recent warning events |
| PVC Usage % | Storage utilisation gauge |
| Network I/O | Bytes received/transmitted per pod |

---

## Adding a New Alert Rule

Edit `prometheus/rules/clipsync-alerts.yaml` and add a rule under the appropriate group:

```yaml
- alert: MyNewAlert
  expr: <promql expression>
  for: 5m
  labels:
    severity: warning   # or critical
    app: clipsync
  annotations:
    summary: "Human-readable summary"
    description: "Detailed description with {{ $value }}"
```

Apply it:
```bash
kubectl apply -f infra/observability/prometheus/rules/clipsync-alerts.yaml
```

Prometheus picks it up within 60 seconds (no restart needed).

---

## Cost

| Component | Cost |
|---|---|
| Prometheus + Grafana | **Free** — runs on existing AKS nodes (uses ~300m CPU, ~800Mi RAM) |
| Azure Monitor / Log Analytics | ~$5–10/month for typical ClipSync traffic |
| Application Insights | Included in Log Analytics cost (workspace-based) |
| **First 5 GB/month** of Log Analytics ingestion | **Free** |

> For a portfolio project, expect total Azure Monitor cost to be **< $5/month**.
