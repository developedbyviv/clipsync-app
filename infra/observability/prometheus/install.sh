#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# install.sh — Install kube-prometheus-stack on AKS (monitoring namespace).
#
# Usage:
#   cd infra/observability/prometheus
#   ./install.sh
#
# Prerequisites: helm, kubectl configured for the target AKS cluster.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

NAMESPACE="monitoring"
RELEASE="kube-prometheus-stack"
CHART="prometheus-community/kube-prometheus-stack"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Installing Prometheus + Grafana on AKS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# ── Pre-flight ────────────────────────────────────────────────────────────────
if ! kubectl cluster-info > /dev/null 2>&1; then
  echo "Error: kubectl is not configured. Run: az aks get-credentials ..."
  exit 1
fi

# ── Add Prometheus Helm repo ──────────────────────────────────────────────────
echo -e "\n${YELLOW}Adding prometheus-community Helm repo...${NC}"
helm repo add prometheus-community \
  https://prometheus-community.github.io/helm-charts
helm repo update

# ── Create monitoring namespace ───────────────────────────────────────────────
echo -e "${YELLOW}Creating ${NAMESPACE} namespace...${NC}"
kubectl create namespace "${NAMESPACE}" --dry-run=client -o yaml \
  | kubectl apply -f -

# ── Install kube-prometheus-stack ─────────────────────────────────────────────
echo -e "${YELLOW}Installing ${RELEASE} (this takes ~5 minutes)...${NC}"
helm upgrade --install "${RELEASE}" "${CHART}" \
  --namespace "${NAMESPACE}" \
  --values "${SCRIPT_DIR}/values.yaml" \
  --wait \
  --timeout 10m

# ── Apply custom ClipSync alert rules ─────────────────────────────────────────
echo -e "${YELLOW}Applying ClipSync alert rules...${NC}"
kubectl apply -f "${SCRIPT_DIR}/rules/clipsync-alerts.yaml"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Prometheus + Grafana installed!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${GREEN}Access Grafana:${NC}"
echo "    kubectl port-forward svc/${RELEASE}-grafana 3001:80 -n ${NAMESPACE}"
echo "    Open: http://localhost:3001"
echo "    Login: admin / clipsync-grafana-2024"
echo ""
echo -e "  ${GREEN}Access Prometheus:${NC}"
echo "    kubectl port-forward svc/${RELEASE}-prometheus 9090:9090 -n ${NAMESPACE}"
echo "    Open: http://localhost:9090"
echo ""
echo -e "  ${GREEN}Access Alertmanager:${NC}"
echo "    kubectl port-forward svc/${RELEASE}-alertmanager 9093:9093 -n ${NAMESPACE}"
echo "    Open: http://localhost:9093"
echo ""
echo -e "  ${YELLOW}Import Grafana dashboards:${NC}"
echo "    Grafana UI → Dashboards → Import → Upload JSON"
echo "    Files: infra/observability/grafana/dashboards/*.json"
echo ""
