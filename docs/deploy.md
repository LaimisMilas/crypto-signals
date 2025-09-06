# Deployment Guide

This document outlines how to deploy the service to a cloud Kubernetes cluster using the existing Docker Compose setup as a starting point.

## 1. Build and Publish Images

1. Build container images defined in `docker-compose.yml`:
   ```bash
   docker compose build
   ```
2. Tag and push the images to your container registry:
   ```bash
   docker tag crypto-signals:latest <registry>/crypto-signals:latest
   docker push <registry>/crypto-signals:latest
   ```
   Repeat for other services.

## 2. Convert Compose to Kubernetes

You can bootstrap Kubernetes manifests from the compose file using [kompose](https://kompose.io/):

```bash
kompose convert -f docker-compose.yml -o k8s/
```

This generates deployment and service manifests under the `k8s/` directory. Review and customize the output.

## 3. Secrets Management

Use a dedicated secret store to supply runtime configuration:

* For Kubernetes deployments create a Secret manifest such as `k8s/secret.example.yaml` and apply it with `kubectl apply -f` after populating the base64‑encoded values.
* HashiCorp Vault can be used in place of static secrets. A Vault Agent sidecar may write secrets to a file or inject them as environment variables.
* Rotate secrets regularly and update the running workloads by restarting pods or using a reloader operator.

## 4. Configure Kubernetes Resources

* Adjust resource requests/limits for each Deployment.
* Mount or reference secrets via `envFrom` or `secretKeyRef`.
* Add persistent volumes for stateful components like PostgreSQL.
* Set up Ingress or LoadBalancer services to expose HTTP endpoints.

## 5. Apply Manifests

```bash
kubectl apply -f k8s/
```

Monitor rollout status:

```bash
kubectl get pods
```

## 6. Database Migrations

Run migrations inside the cluster using a Kubernetes Job:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: migrate
spec:
  template:
    spec:
      containers:
        - name: migrate
          image: <registry>/crypto-signals:latest
          command: ["npm", "run", "migrate"]
          envFrom:
            - secretRef: { name: db-env }
      restartPolicy: OnFailure
```

Apply the job and wait for completion before starting application pods.

## 7. Observability

The repository includes example Prometheus, Alertmanager, and Grafana configs under `deploy/`. Deploy these into the cluster for metrics and alerting.

## 8. CI/CD

Automate builds and deployments with your CI system. A typical workflow:

1. On commit, run tests and build images.
2. Push images to registry.
3. Use `kubectl` or GitOps (e.g., ArgoCD) to update the cluster.

## 9. HTTPS with Caddy or Nginx

Terminate TLS in front of the API using a reverse proxy. Two common options are
[Caddy](https://caddyserver.com/) and [Nginx](https://nginx.org/).

### Caddy

Create a `Caddyfile` similar to:

```text
{
  email you@example.com
}

example.com {
  encode gzip
  reverse_proxy api:3000
}
```

Caddy will automatically obtain and renew Let's Encrypt certificates.

### Nginx

Request a certificate with Certbot and configure Nginx to proxy traffic:

```nginx
server {
    listen 443 ssl;
    server_name example.com;
    ssl_certificate     /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://api:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Nginx serves encrypted traffic on port 443 while forwarding requests to the
API service inside the cluster.

---
For local testing, `docker-compose.yml` remains available to spin up the stack quickly.
