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

## 3. Configure Kubernetes Resources

* Adjust resource requests/limits for each Deployment.
* Configure environment variables and secrets (e.g., database credentials).
* Add persistent volumes for stateful components like PostgreSQL.
* Set up Ingress or LoadBalancer services to expose HTTP endpoints.

## 4. Apply Manifests

```bash
kubectl apply -f k8s/
```

Monitor rollout status:

```bash
kubectl get pods
```

## 5. Database Migrations

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

## 6. Observability

The repository includes example Prometheus, Alertmanager, and Grafana configs under `deploy/`. Deploy these into the cluster for metrics and alerting.

## 7. CI/CD

Automate builds and deployments with your CI system. A typical workflow:

1. On commit, run tests and build images.
2. Push images to registry.
3. Use `kubectl` or GitOps (e.g., ArgoCD) to update the cluster.

---
For local testing, `docker-compose.yml` remains available to spin up the stack quickly.
