#!/usr/bin/env bash
set -euo pipefail

# --- Helper: redact secrets ---------------------------------------------------
redact() {
  sed -E '
    s/([A-Za-z0-9_]*_?(KEY|TOKEN|SECRET|PASSWORD|PASS|PWD|AUTH|PRIVATE|CHAT_ID)\s*[:=]\s*)(["'\'']?)[^"'\''[:space:]]+/\1\3REDACTED/gI;
    s/(bot_token\s*:\s*)(["'\'']?)[^"'\''[:space:]]+/\1\2REDACTED/gI;
    s/(auth_password\s*:\s*)(["'\'']?)[^"'\''[:space:]]+/\1\2REDACTED/gI;
    s/(chat_id\s*:\s*)(-?[0-9]+)/\1REDACTED/gI;
    s/(password\s*[:=]\s*)(["'\'']?)[^"'\''[:space:]]+/\1\2REDACTED/gI;
  '
}

print_h1(){ echo -e "\n# $*"; }
print_h2(){ echo -e "\n## $*"; }
print_h3(){ echo -e "\n### $*"; }

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

print_h1 "Repository Survey"
echo "- Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "- Root: $ROOT"

print_h2 "Git"
echo '```text'
git status -sb || true
echo
git remote -v || true
echo
git --no-pager log --oneline --decorate -n 50 || true
echo '```'

print_h2 "Languages & Size"
echo '```text'
if command -v cloc >/dev/null 2>&1; then
  cloc --quiet --git . || true
else
  echo "cloc not found (skip)"
fi
echo '```'

print_h2 "Top-level Tree (depth 2)"
echo '```text'
tree -L 2 -a -I ".git|node_modules|.venv|.tox|dist|build|out|coverage|playwright-report|.next|.cache" 2>/dev/null || true
echo '```'

print_h2 "Package Managers & Modules"
for f in $(git ls-files | grep -E '(^|/)package\.json$|(^|/)pnpm-lock\.yaml$|(^|/)yarn\.lock$|(^|/)package-lock\.json$|(^|/)go\.mod$|(^|/)pyproject\.toml$|(^|/)requirements\.txt$|(^|/)Cargo\.toml$' || true); do
  print_h3 "$f"
  echo '```text'
  awk 'NR<=400{print} NR==400{print "...(truncated)"}' "$f" | redact
  echo '```'
done

print_h2 "Docker / Compose / K8s"
for f in $(git ls-files | grep -E '(^|/)(docker-compose.*\.ya?ml|Dockerfile|k8s/.*\.ya?ml|helm/|skaffold\.ya?ml)$' || true); do
  print_h3 "$f"
  echo '```yaml'
  awk 'NR<=400{print} NR==400{print "...(truncated)"}' "$f" | redact
  echo '```'
done

print_h2 "CI/CD (GitHub Actions et al.)"
for f in $(git ls-files | grep -E '(^|/)\.github/workflows/.*\.ya?ml$|(^|/)gitlab-ci\.ya?ml$' || true); do
  print_h3 "$f"
  echo '```yaml'
  awk 'NR<=400{print} NR==400{print "...(truncated)"}' "$f"
  echo '```'
done

print_h2 "Environment Templates / Samples"
for f in $(git ls-files | grep -E '(^|/)\.env(\.example|\.sample)?$|(^|/)env\.example|(^|/)\.env\..*\.example' || true); do
  print_h3 "$f"
  echo '```text'
  awk 'NR<=400{print} NR==400{print "...(truncated)"}' "$f" | redact
  echo '```'
done

print_h2 "Configuration (YAML/TOML/JSON)"
for f in $(git ls-files | grep -E '\.(ya?ml|toml|json)$' | grep -viE '\.lock|package-lock|pnpm-lock|yarn\.lock' || true); do
  case "$f" in
    *.yaml|*.yml|*.toml|*.json)
      print_h3 "$f"
      echo '```text'
      awk 'NR<=200{print} NR==200{print "...(truncated)"}' "$f" | redact
      echo '```'
    ;;
  esac
done

print_h2 "Database Schema / Migrations"
for f in $(git ls-files | grep -E '(^|/)(schema\.sql|schema\.pg\.sql|migrations?/.*\.(sql|js|ts)|prisma/.*\.(prisma|sql))$' || true); do
  print_h3 "$f"
  echo '```sql'
  awk 'NR<=400{print} NR==400{print "...(truncated)"}' "$f"
  echo '```'
done

print_h2 "API Routes (Express/Fastify/Koa hints)"
echo '```text'
git --no-pager grep -nE 'app\.(get|post|put|delete|patch)\(|router\.(get|post|put|delete|patch)\(' -- '*.js' '*.ts' 2>/dev/null || true
echo
git --no-pager grep -nE 'fastify\.(get|post|put|delete|patch)\(' -- '*.js' '*.ts' 2>/dev/null || true
echo
git --no-pager grep -nE '@Get\(|@Post\(|@Put\(|@Delete\(' -- '*.ts' 2>/dev/null || true
echo '```'

print_h2 "WebSocket/Streaming Hints"
echo '```text'
git --no-pager grep -nE 'new WebSocket|socket\.io|io\.on\(|ws\(|Server\(.*"ws' -- '*.js' '*.ts' 2>/dev/null || true
echo '```'

print_h2 "Jobs/Workers/Schedulers"
echo '```text'
git --no-pager grep -nE 'cron|node-cron|agenda|bull|bullmq|queue|worker' -- '**/*' 2>/dev/null || true
echo '```'

print_h2 "Frontend (routes/pages)"
echo '```text'
git --no-pager grep -nE 'ReactDOM\.render|createRoot|<Route|next\.config|vite\.config|Chart\(|new Chart' -- '**/*' 2>/dev/null || true
echo '```'

print_h2 "Observability (Prometheus/Grafana/Alertmanager)"
echo '```text'
git --no-pager grep -nE 'prometheus|alertmanager|grafana|/metrics' -- '**/*' 2>/dev/null || true
echo '```'

print_h2 "Payments/3rd-party"
echo '```text'
git --no-pager grep -nE 'stripe|telegram|binance|revolut|kucoin|bybit' -- '**/*' 2>/dev/null || true
echo '```'

print_h2 "Ports & Binds"
echo '```text'
git --no-pager grep -nE 'PORT\b|:5432|:3000|:8080|:9090|:9093|EXPOSE ' -- '**/*' 2>/dev/null || true
echo '```'

print_h2 "Tests"
echo '```text'
git --no-pager grep -nE 'describe\(|it\(|test\(|playwright|jest|vitest|cypress' -- '**/*' 2>/dev/null || true
echo '```'

print_h2 "Make/Task/NPM Scripts"
for f in Makefile Taskfile.yml Taskfile.yaml; do
  if [[ -f "$f" ]]; then
    print_h3 "$f"
    echo '```text'
    awk 'NR<=400{print} NR==400{print "...(truncated)"}' "$f"
    echo '```'
  fi
done
if [[ -f package.json ]]; then
  print_h3 "package.json scripts"
  echo '```json'
  jq '.scripts' package.json 2>/dev/null || cat package.json
  echo '```'
fi

print_h2 "Licenses & Policies"
for f in LICENSE LICENSE.md SECURITY.md CODE_OF_CONDUCT.md; do
  if [[ -f "$f" ]]; then
    print_h3 "$f"
    echo '```text'
    awk 'NR<=400{print} NR==400{print "...(truncated)"}' "$f"
    echo '```'
  fi
done

print_h2 "TODO / FIXME / NOTES"
echo '```text'
git --no-pager grep -nE 'TODO|FIXME|TBD|HACK' -- '**/*' 2>/dev/null || true
echo '```'

print_h2 "README & Docs"
for f in $(git ls-files | grep -E '(^|/)README(\.md)?$|(^|/)docs/.*\.md$' || true); do
  print_h3 "$f"
  echo '```markdown'
  awk 'NR<=400{print} NR==400{print "...(truncated)"}' "$f"
  echo '```'
done

print_h2 "Security quick scan (keywords only, redacted)"
echo '```text'
git --no-pager grep -nE '(SECRET|TOKEN|PASSWORD|PRIVATE|APIKEY|AUTH|BOT_TOKEN|CHAT_ID)' -- '**/*' 2>/dev/null | redact || true
echo '```'

print_h2 "Done"
echo "- Survey finished."
