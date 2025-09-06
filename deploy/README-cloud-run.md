# Deploy to Google Cloud Run

These steps describe how to deploy the Crypto Signals API to [Google Cloud Run](https://cloud.google.com/run).

## Prerequisites
- Google Cloud project with billing enabled
- gcloud CLI installed and authenticated (`gcloud auth login`)
- A Cloud SQL PostgreSQL instance (or external Postgres database) and connection string

## 1. Build and push the container
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/crypto-signals
```
Replace `PROJECT_ID` with your GCP project identifier.

## 2. Deploy to Cloud Run
```bash
gcloud run deploy crypto-signals \
  --image gcr.io/PROJECT_ID/crypto-signals \
  --platform managed \
  --region REGION \
  --allow-unauthenticated \
  --set-env-vars "AUTH_SECRET=change-me,DATABASE_URL=postgres://...",
    "TELEGRAM_BOT_TOKEN=...",\
    "TELEGRAM_CHAT_ID=...",\
    "TELEGRAM_VIP_CHAT_ID=..."
```
Replace `REGION` and environment variables with real values. Cloud Run will expose a public HTTPS URL after deployment.

## 3. Configure database access
If using Cloud SQL:
1. Enable the Cloud SQL Admin API.
2. Create a Cloud SQL instance and database.
3. Set `DATABASE_URL` with credentials, or use Cloud SQL connections with a service account.

## 4. Update the service
When new code is pushed:
```bash
gcloud builds submit --tag gcr.io/PROJECT_ID/crypto-signals
gcloud run deploy crypto-signals --image gcr.io/PROJECT_ID/crypto-signals --region REGION
```
The service will roll out the new revision automatically.

