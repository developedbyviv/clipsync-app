{{/*
_helpers.tpl — Reusable named templates for the ClipSync Helm chart.
These are called with {{ include "clipsync.<name>" . }} throughout templates.
*/}}

{{/*
clipsync.fullname — release name scoped to environment
Result: clipsync-dev | clipsync-prod
*/}}
{{- define "clipsync.fullname" -}}
{{- printf "%s-%s" .Chart.Name .Values.global.environment | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
clipsync.namespace — the target Kubernetes namespace
Result: clipsync-dev | clipsync-prod
*/}}
{{- define "clipsync.namespace" -}}
{{- printf "%s-%s" .Values.global.projectName .Values.global.environment }}
{{- end }}

{{/*
clipsync.labels — standard labels applied to every resource.
Includes Helm recommended labels for lifecycle management.
*/}}
{{- define "clipsync.labels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
helm.sh/chart: {{ printf "%s-%s" .Chart.Name .Chart.Version }}
environment: {{ .Values.global.environment }}
project: {{ .Values.global.projectName }}
{{- end }}

{{/*
clipsync.selectorLabels — minimal stable labels used in selector.matchLabels.
Must NEVER change after first deploy (selectors are immutable on Deployments).
*/}}
{{- define "clipsync.selectorLabels" -}}
app.kubernetes.io/name: {{ .Chart.Name }}
app.kubernetes.io/instance: {{ .Release.Name }}
environment: {{ .Values.global.environment }}
{{- end }}

{{/*
clipsync.apiSelectorLabels — selector labels scoped to the API component.
*/}}
{{- define "clipsync.apiSelectorLabels" -}}
{{ include "clipsync.selectorLabels" . }}
app.kubernetes.io/component: api
{{- end }}

{{/*
clipsync.frontendSelectorLabels — selector labels scoped to the frontend.
*/}}
{{- define "clipsync.frontendSelectorLabels" -}}
{{ include "clipsync.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
clipsync.apiImage — full image URI for the API container.
Result: acrclipsyncsharedinc.azurecr.io/clipsync-api:abc1234
*/}}
{{- define "clipsync.apiImage" -}}
{{- if .Values.global.imageRegistry -}}
{{- printf "%s/%s:%s" .Values.global.imageRegistry .Values.api.image.repository .Values.api.image.tag }}
{{- else -}}
{{- printf "%s:%s" .Values.api.image.repository .Values.api.image.tag }}
{{- end }}
{{- end }}

{{/*
clipsync.frontendImage — full image URI for the frontend container.
*/}}
{{- define "clipsync.frontendImage" -}}
{{- if .Values.global.imageRegistry -}}
{{- printf "%s/%s:%s" .Values.global.imageRegistry .Values.frontend.image.repository .Values.frontend.image.tag }}
{{- else -}}
{{- printf "%s:%s" .Values.frontend.image.repository .Values.frontend.image.tag }}
{{- end }}
{{- end }}
