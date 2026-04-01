# Kubernetes Deployment Setup Guide

## Problem Fixed

Your K8s deployments were timing out because:

1. ❌ Secrets weren't being created before deployment
2. ❌ Docker image pull credentials weren't configured
3. ❌ Health check timeouts were too aggressive for Next.js startup

**Status:** ✅ Fixed in `.github/workflows/ci.yml`

---

## Required GitHub Secrets

To enable automated deployments to GKE, add these secrets to your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

### GCP Configuration

- **GCP_SA_KEY**: Full JSON content of your GCP service account key
- **GKE_PROJECT_ID**: Your Google Cloud project ID
- **GKE_CLUSTER_NAME**: Name of your GKE cluster
- **GKE_CLUSTER_LOCATION**: GKE cluster location (e.g., `us-central1-a`)

### Application Secrets

- **CLERK_SECRET_KEY**: From Clerk dashboard → API Keys
- **CLERK_WEBHOOK_SECRET**: From Clerk dashboard → Webhooks (signing secret)
- **MONGO_URL**: MongoDB connection string (with credentials)
- **DEEPGRAM_API_KEY**: Deepgram API key
- **OPENAI_API_KEY**: OpenAI API key
- **STRIPE_SECRET_KEY**: Stripe secret key (from Stripe dashboard)
- **STRIPE_WEBHOOK_SECRET**: Stripe webhook signing secret
- **STRIPE_PRICE_PRO_MONTHLY**: Stripe price ID for pro tier
- **STRIPE_PRICE_BUSINESS_MONTHLY**: Stripe price ID for business tier

**Do NOT commit these secrets to git. Only store in GitHub Secrets.**

---

## How CI/CD Now Works

### Step 1: Format → Lint → Typecheck → Build (always runs)

```yaml
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run build
```

### Step 2: Build Docker Image (on main push only)

```bash
docker build -t ghcr.io/ahmad4376/interviewprepapp:$SHA .
docker push ghcr.io/ahmad4376/interviewprepapp:$SHA
```

### Step 3: Deploy to GKE (on main push only)

```bash
# 1. Authenticate to Google Cloud
gcloud auth activate-service-account --key-file=$GCP_SA_KEY

# 2. Get GKE cluster credentials
gke-gcloud-auth-plugin

# 3. Create K8s namespace
kubectl create namespace interview-prep

# 4. Create Docker registry secret (for image pulls)
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=$GITHUB_ACTOR \
  --docker-password=$GITHUB_TOKEN

# 5. Create application secrets (from GitHub Secrets)
kubectl create secret generic interview-prep-secrets \
  --from-literal=CLERK_SECRET_KEY=$CLERK_SECRET_KEY \
  --from-literal=MONGO_URL=$MONGO_URL \
  ... (all env vars)

# 6. Deploy/update services
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/deployment.yaml

# 7. Wait for rollout (5 min timeout)
kubectl rollout status deployment/interview-prep-app -n interview-prep
```

---

## Kubernetes Architecture

### Namespace

- **Name:** `interview-prep`
- **Contains:** deployment, service, secrets

### Service

- **Type:** LoadBalancer
- **Port:** 80 (external) → 3000 (container)
- **Selector:** `app: interview-prep`

### Deployment

- **Replicas:** 2 (rolling update, max 1 surge, 0 unavailable)
- **Image:** `ghcr.io/ahmad4376/interviewprepapp:$SHA`
- **Resources:**
  - Request: 250m CPU, 512Mi memory
  - Limit: 1 CPU, 1Gi memory
- **Health Checks:**
  - Readiness: `/api/health` (starts after 15s, checks every 10s)
  - Liveness: `/api/health` (starts after 30s, checks every 20s)

---

## Troubleshooting

### Deployment stuck "Waiting for replicas..."

1. **Check pod status:**

   ```bash
   kubectl get pods -n interview-prep
   kubectl describe pod interview-prep-app-xxx -n interview-prep
   ```

2. **Common causes:**

   - **ImagePullBackOff**: `ghcr-secret` not created or token expired
   - **CrashLoopBackOff**: Container won't start
     - Check logs: `kubectl logs interview-prep-app-xxx -n interview-prep`
     - Check if secrets exist: `kubectl get secrets -n interview-prep`
   - **Not Ready**: Health check failing (liveness/readiness probe)
     - Increase `initialDelaySeconds` in `k8s/deployment.yaml`

3. **Check logs:**

   ```bash
   kubectl logs -f deployment/interview-prep-app -n interview-prep
   ```

4. **Check events:**
   ```bash
   kubectl describe deployment interview-prep-app -n interview-prep
   ```

### Health check timeout

If `/api/health` endpoint is slow or not responding:

1. Check the endpoint works locally: `curl http://localhost:3000/api/health`
2. Increase `initialDelaySeconds` in the deployment (wait longer before first check)
3. Check app logs for startup errors

### Secrets not found

```bash
# Verify secrets exist:
kubectl get secrets -n interview-prep

# View secret keys (values hidden):
kubectl get secret interview-prep-secrets -n interview-prep -o yaml

# Check if deployment can access them:
kubectl get pod interview-prep-app-xxx -n interview-prep -o yaml | grep env
```

### Image pull failed

The workflow uses `GITHUB_TOKEN` to pull from GHCR. Verify:

1. Image is pushed: `docker pull ghcr.io/ahmad4376/interviewprepapp:latest`
2. Token has correct permissions (GitHub App → permissions → packages: read)
3. Secret `ghcr-secret` is created with correct credentials

---

## Manual Deployment (if CI/CD fails)

```bash
# 1. Auth to GCP
gcloud auth activate-service-account --key-file=key.json
gcloud container clusters get-credentials $CLUSTER --zone $ZONE --project $PROJECT

# 2. Create secrets
kubectl create namespace interview-prep --dry-run=client -o yaml | kubectl apply -f -

kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=YOUR_GITHUB_USERNAME \
  --docker-password=YOUR_GITHUB_TOKEN \
  -n interview-prep

kubectl create secret generic interview-prep-secrets \
  --from-literal=CLERK_SECRET_KEY=$(cat .env.local | grep CLERK_SECRET_KEY | cut -d= -f2) \
  --from-literal=MONGO_URL=$(cat .env.local | grep MONGO_URL | cut -d= -f2) \
  # ... add all other secrets
  -n interview-prep

# 3. Deploy
kubectl apply -f k8s/deployment.yaml -n interview-prep
kubectl apply -f k8s/service.yaml -n interview-prep

# 4. Monitor
kubectl rollout status deployment/interview-prep-app -n interview-prep
```

---

## Next Steps

1. Add all GitHub Secrets (see "Required GitHub Secrets" section)
2. Next push to `main` will trigger deployment
3. Monitor: `kubectl logs -f deployment/interview-prep-app -n interview-prep`
4. Check service IP: `kubectl get service interview-prep-service -n interview-prep`

---

## CI/CD Flow Diagram

```
Push to main
    ↓
[CI Job]
  - Format check
  - Lint
  - Typecheck
  - Build (npm run build)
    ↓
[Build & Push Job] (only on main)
  - Docker build
  - Push to GHCR
    ↓
[Deploy Job] (only on main, needs CI success)
  - Auth to GCP
  - Get GKE credentials
  - Create secrets
  - kubectl apply deployments
  - Wait for rollout (300s timeout)
    ↓
[Success / Failure]
  - Notify GitHub Actions status
```

---

## Cost Optimization Tips

1. **Reduce replicas** for dev: Change `replicas: 2` → `replicas: 1` in dev environment
2. **Reduce resource limits** for dev: Lower CPU/memory requests
3. **Use Spot instances** for non-critical workloads
4. **Set resource quotas** per namespace to prevent runaway costs

---

## References

- [GKE Deployment Best Practices](https://cloud.google.com/kubernetes-engine/docs/best-practices/managing-workloads)
- [Kubernetes Health Checks](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)
- [Docker Registry Authentication](https://kubernetes.io/docs/tasks/configure-pod-container/pull-image-private-registry/)
