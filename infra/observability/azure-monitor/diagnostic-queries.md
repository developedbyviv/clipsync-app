# ClipSync — Azure Log Analytics KQL Queries

Ready-to-use KQL queries for monitoring ClipSync in Azure Monitor.  
**How to use:** Azure Portal → Log Analytics Workspace → Logs → paste query → Run

---

## 1. API Error Rate — Last 24 Hours
**Purpose:** Hourly error count trend — spot outages and error spikes at a glance.

```kql
ContainerLog
| where TimeGenerated > ago(24h)
| where LogEntry contains "error" or LogEntry contains "Error"
| where ContainerName == "api"
| summarize ErrorCount = count() by bin(TimeGenerated, 1h)
| order by TimeGenerated asc
| render timechart
```

---

## 2. Slow API Requests (> 1 Second)
**Purpose:** Find the slowest endpoints — useful for identifying N+1 queries or missing DB indexes.

```kql
AppRequests
| where TimeGenerated > ago(1h)
| where DurationMs > 1000
| project TimeGenerated, Name, DurationMs, ResultCode, Url
| order by DurationMs desc
| take 50
```

---

## 3. Pod Restart Events
**Purpose:** Detect crash loops and OOM kills in clipsync namespaces before they page you.

```kql
KubeEvents
| where TimeGenerated > ago(6h)
| where Reason == "BackOff" or Reason == "OOMKilling"
| where Namespace startswith "clipsync"
| project TimeGenerated, Name, Reason, Message, Namespace
| order by TimeGenerated desc
```

---

## 4. Active WebSocket Connections Over Time
**Purpose:** Understand real-time usage peaks — useful for capacity planning.

```kql
AppMetrics
| where TimeGenerated > ago(1h)
| where Name == "websocket_connections_active"
| summarize AvgConnections = avg(Sum) by bin(TimeGenerated, 5m)
| render timechart
```

---

## 5. Clipboard Creation Rate by Hour
**Purpose:** Track usage growth and identify peak usage windows.

```kql
AppEvents
| where TimeGenerated > ago(7d)
| where Name == "clipboard_created"
| summarize Count = count() by bin(TimeGenerated, 1h)
| render barchart
```

---

## 6. Node CPU Utilization
**Purpose:** AKS node-level CPU trend — alert if consistently above 80%.

```kql
Perf
| where TimeGenerated > ago(3h)
| where ObjectName == "K8SNode"
| where CounterName == "cpuUsageNanoCores"
| summarize AvgCPU = avg(CounterValue) / 1e9 * 100 by Computer, bin(TimeGenerated, 5m)
| render timechart
```

---

## 7. Database Connection Errors
**Purpose:** Catch PostgreSQL connection failures before they cascade into user-facing errors.

```kql
ContainerLog
| where TimeGenerated > ago(1h)
| where LogEntry has_any ("ECONNREFUSED", "connection refused", "SequelizeConnectionError", "SequelizeConnectionRefusedError")
| project TimeGenerated, ContainerName, LogEntry
| order by TimeGenerated desc
```

---

## 8. Failed Login Attempts — Brute Force Detection
**Purpose:** Flag IPs with > 5 failed logins in 15 minutes — potential brute force attack.

```kql
AppRequests
| where TimeGenerated > ago(1h)
| where Url contains "/api/auth/login"
| where ResultCode == "401"
| summarize FailedLogins = count() by bin(TimeGenerated, 15m), ClientIP = tostring(customDimensions["clientIp"])
| where FailedLogins > 5
| order by FailedLogins desc
```

---

## 9. Redis Cache Hit Rate
**Purpose:** A low hit rate means Redis isn't helping — check TTL settings or key eviction policy.

```kql
AppMetrics
| where TimeGenerated > ago(1h)
| where Name contains "redis" or Name contains "cache"
| summarize
    CacheHits = sumif(Sum, Name == "cache_hits"),
    CacheMisses = sumif(Sum, Name == "cache_misses")
    by bin(TimeGenerated, 1h)
| extend HitRate = iff((CacheHits + CacheMisses) > 0, CacheHits * 100.0 / (CacheHits + CacheMisses), 0.0)
| project TimeGenerated, HitRate, CacheHits, CacheMisses
| render timechart
```

---

## 10. Clipboard Expiry Type Distribution
**Purpose:** Understand which expiry options users prefer — informs UX decisions.

```kql
AppEvents
| where TimeGenerated > ago(7d)
| where Name == "clipboard_created"
| extend ExpiresIn = tostring(customDimensions["expiresIn"])
| summarize Count = count() by ExpiresIn
| order by Count desc
| render piechart
```
