#!/usr/bin/env bash
set -euo pipefail

# ===========================
# Repo Survey v2 (API + DB)
# ===========================

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

ARTIFACTS_DIR="artifacts"
TOOLS_DIR="tools"
mkdir -p "$ARTIFACTS_DIR" "$TOOLS_DIR"

# --- Helper: redact secrets ---------------------------------------------------
redact() {
  sed -E '
    s/([A-Za-z0-9_]*_?(KEY|TOKEN|SECRET|PASSWORD|PASS|PWD|AUTH|PRIVATE|CHAT_ID)\s*[:=]\s*)(["'\'']?)[^"'\''[:space:]]+/\1\2REDACTED/gI;
    s/(bot_token\s*:\s*)(["'\'']?)[^"'\''[:space:]]+/\1\2REDACTED/gI;
    s/(auth_password\s*:\s*)(["'\'']?)[^"'\''[:space:]]+/\1\2REDACTED/gI;
    s/(chat_id\s*:\s*)(-?[0-9]+)/\1REDACTED/gI;
    s/(password\s*[:=]\s*)(["'\'']?)[^"'\''[:space:]]+/\1\2REDACTED/gI;
  '
}

print_h1(){ echo -e "\n# $*"; }
print_h2(){ echo -e "\n## $*"; }
print_h3(){ echo -e "\n### $*"; }

# --------------------------------------
# Header
# --------------------------------------
print_h1 "Repository Survey"
echo "- Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "- Root: $ROOT"

# --------------------------------------
# Git
# --------------------------------------
print_h2 "Git"
echo '```text'
git status -sb || true
echo
git remote -v || true
echo
git --no-pager log --oneline --decorate -n 50 || true
echo '```'

# --------------------------------------
# Languages / Size / Tree
# --------------------------------------
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

# --------------------------------------
# Packages / Modules / Config
# --------------------------------------
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

# --------------------------------------
# Database Schema / Migrations (raw dump)
# --------------------------------------
print_h2 "Database Schema / Migrations (Raw excerpts)"
for f in $(git ls-files | grep -E '(^|/)(schema\.sql|schema\.pg\.sql|migrations?/.*\.(sql|js|ts)|prisma/.*\.(prisma|sql))$' || true); do
  print_h3 "$f"
  echo '```sql'
  awk 'NR<=400{print} NR==400{print "...(truncated)"}' "$f"
  echo '```'
done

# --------------------------------------
# API Routes (raw grep)
# --------------------------------------
print_h2 "API Routes (Raw grep)"
echo '```text'
git --no-pager grep -nE 'app\.(get|post|put|delete|patch)\(|router\.(get|post|put|delete|patch)\(' -- '*.js' '*.ts' 2>/dev/null || true
git --no-pager grep -nE 'fastify\.(get|post|put|delete|patch)\(' -- '*.js' '*.ts' 2>/dev/null || true
git --no-pager grep -nE '@(Get|Post|Put|Delete|Patch)\(' -- '*.ts' 2>/dev/null || true
echo '```'

print_h2 "WebSocket/Streaming (Raw grep)"
echo '```text'
git --no-pager grep -nE 'new WebSocket|socket\.io|io\.on\(|ws\(|Server\(.*"ws' -- '*.js' '*.ts' 2>/dev/null || true
echo '```'

print_h2 "Jobs/Workers/Schedulers (Raw grep)"
echo '```text'
git --no-pager grep -nE 'cron|node-cron|agenda|bull|bullmq|queue|worker' -- '**/*' 2>/dev/null || true
echo '```'

print_h2 "Frontend clues"
echo '```text'
git --no-pager grep -nE 'ReactDOM\.render|createRoot|<Route|next\.config|vite\.config|Chart\(|new Chart' -- '**/*' 2>/dev/null || true
echo '```'

print_h2 "Observability clues"
echo '```text'
git --no-pager grep -nE 'prometheus|alertmanager|grafana|\/metrics' -- '**/*' 2>/dev/null || true
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
  if command -v jq >/dev/null 2>&1; then
    jq '.scripts' package.json 2>/dev/null || cat package.json
  else
    cat package.json
  fi
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

# ============================================================
# NEW: Structured API extraction  -> artifacts/api-routes.md
# ============================================================
API_OUT="$ARTIFACTS_DIR/api-routes.md"
: > "$API_OUT"

echo "# API Routes" >> "$API_OUT"
echo "" >> "$API_OUT"
echo "| Method | Path | File:Line | Notes |" >> "$API_OUT"
echo "|--------|------|-----------|-------|" >> "$API_OUT"

# Gather candidates (Express/Router/Fastify/Nest)
TMP_API="$ARTIFACTS_DIR/.api_raw.tmp"
: > "$TMP_API"

git --no-pager grep -nE 'app\.(get|post|put|delete|patch)\(|router\.(get|post|put|delete|patch)\(' -- '*.js' '*.ts' 2>/dev/null >> "$TMP_API" || true
git --no-pager grep -nE 'fastify\.(get|post|put|delete|patch)\(' -- '*.js' '*.ts' 2>/dev/null >> "$TMP_API" || true
git --no-pager grep -nE '@(Get|Post|Put|Delete|Patch)\(' -- '*.ts' 2>/dev/null >> "$TMP_API" || true

# Parse lines into a Markdown table
# Handles patterns like:
#   app.get('/api/health', ...)
#   router.post("/v1/orders", ...)
#   fastify.put('/x', ...)
#   @Get('v1/jobs')
awk -F: '
function trim(x){ gsub(/^[ \t]+|[ \t]+$/, "", x); return x }
function esc(x){ gsub(/\|/,"\\|",x); return x }
{
  file=$1; line=$2; rest=$0;
  sub(/^[^:]*:[^:]*:/,"",rest); # keep code after file:line:
  method=""; path=""; note=""
  if (rest ~ /app\.(get|post|put|delete|patch)\(/) {
    match(rest,/app\.(get|post|put|delete|patch)\(/,m); method=toupper(m[1])
  } else if (rest ~ /router\.(get|post|put|delete|patch)\(/) {
    match(rest,/router\.(get|post|put|delete|patch)\(/,m); method=toupper(m[1])
  } else if (rest ~ /fastify\.(get|post|put|delete|patch)\(/) {
    match(rest,/fastify\.(get|post|put|delete|patch)\(/,m); method=toupper(m[1])
  } else if (rest ~ /@(Get|Post|Put|Delete|Patch)\(/) {
    match(rest,/@(Get|Post|Put|Delete|Patch)\(/,m); method=toupper(m[1])
  }
  if (rest ~ /[(][ \t]*["'\''`][^"'\''`]+["'\''`]/) {
    # First string literal as path
    match(rest, /[(][ \t]*["'\''`][^"'\''`]+["'\''`]/, p)
    path=substr(p[0],2)    # remove leading "("
    gsub(/^[ \t]+/,"",path)
    gsub(/^[("'\''`]+/,"",path)
    gsub(/["'\''`]+$/,"",path)
  } else if (rest ~ /@(Get|Post|Put|Delete|Patch)\(["'\''`][^"'\''`]+["'\''`]\)/) {
    match(rest, /@(Get|Post|Put|Delete|Patch)\(["'\''`][^"'\''`]+["'\''`]\)/, p)
    # extract inside quotes
    s=p[0]; sub(/^@(Get|Post|Put|Delete|Patch)\(["'\''`]/,"",s); sub(/["'\''`]\)$/,"",s); path=s
  }
  if (method != "" && path != "") {
    printf("| %s | %s | %s:%s | %s |\n", method, esc(path), file, line, note)
  }
}
' "$TMP_API" >> "$API_OUT"

# Also list OpenAPI/Swagger specs if present
if git ls-files | grep -qiE 'openapi|swagger'; then
  echo -e "\n\n## OpenAPI/Swagger files" >> "$API_OUT"
  echo '```text' >> "$API_OUT"
  git ls-files | grep -iE '(^|/)(openapi|swagger).*\.(ya?ml|json)$' || true
  echo '```' >> "$API_OUT"
fi

# ============================================================
# NEW: Structured DB extraction -> artifacts/db-model.md
# ============================================================
DB_OUT="$ARTIFACTS_DIR/db-model.md"
: > "$DB_OUT"

echo "# Database Model" >> "$DB_OUT"
echo "" >> "$DB_OUT"
echo "| Table | Columns (name:type) | Indexes/PK/FK | Source |" >> "$DB_OUT"
echo "|-------|----------------------|---------------|--------|" >> "$DB_OUT"

# Collect schema-bearing files
TMP_DBL="$ARTIFACTS_DIR/.db_files.lst"
: > "$TMP_DBL"
git ls-files | grep -E '(^|/)(schema\.sql|schema\.pg\.sql|migrations?/.*\.(sql|js|ts)|prisma/.*\.(prisma|sql))$' >> "$TMP_DBL" || true

# Simple SQL parser for CREATE TABLE blocks
parse_sql_file() {
  local file="$1"
  awk -v SRC="$file" '
  BEGIN{ in=0; tbl=""; cols=""; idx=""; }
  function flush(){
    if (tbl!="") {
      gsub(/[ \t\r\n]+$/,"",cols);
      gsub(/[ \t\r\n]+$/,"",idx);
      if (cols=="") cols="-";
      if (idx=="") idx="-";
      printf("| %s | %s | %s | %s |\n", tbl, cols, idx, SRC);
    }
    in=0; tbl=""; cols=""; idx="";
  }
  {
    line=$0
    # normalize spaces
    gsub(/\r/,"",line)
    if (in==0) {
      # CREATE TABLE ["schema".]"name" (  OR with no schema
      if (match(tolower(line),/create[ \t]+table[ \t]+/)) {
        in=1
        # extract table name
        t=line
        sub(/.*create[ \t]+table[ \t]+/i,"",t)
        # remove opening "(" and trailing stuff
        gsub(/\(.*/,"",t)
        gsub(/["`]/,"",t)
        gsub(/^[ \t]+|[ \t]+$/,"",t)
        tbl=t
        next
      }
    } else {
      # inside CREATE TABLE (...) block until ");"
      if (match(line,/\)[ \t]*;/)) {
        # maybe last line contains constraints
        l=line
        # capture PRIMARY KEY, UNIQUE, REFERENCES
        if (match(tolower(l),/primary[ \t]+key/)) idx=idx " PK"
        if (match(tolower(l),/unique[ \t]+/)) idx=idx " UNIQUE"
        if (match(tolower(l),/references[ \t]+/)) idx=idx " FK"
        flush()
        next
      }
      # column line:   "name" type ...  OR  name type ...
      cl=line
      if (match(cl,/^[ \t]*("[^"]+"|[A-Za-z0-9_]+)[ \t]+[A-Za-z0-9_()]+/)) {
        name=$1; type=$2
      }
      # Safer extraction:
      if (match(cl,/^[ \t]*("[^"]+"|[A-Za-z0-9_]+)/)) {
        name=substr(cl,RSTART,RLENGTH)
        sub(/^[ \t]*("[^"]+"|[A-Za-z0-9_]+)[ \t]+/,"",cl)
        if (match(cl,/^[A-Za-z0-9_()]+/)) {
          type=substr(cl,RSTART,RLENGTH)
          gsub(/["`]/,"",name)
          gsub(/^[ \t]+|[ \t]+$/,"",name)
          gsub(/^[ \t]+|[ \t]+$/,"",type)
          if (name!="" && type!="") {
            if (cols!="") cols=cols ", "
            cols=cols name ":" type
          }
        }
      }
      # constraints in column line
      tl=tolower(line)
      if (tl ~ /primary[ \t]+key/) idx=idx " PK"
      if (tl ~ /unique/) idx=idx " UNIQUE"
      if (tl ~ /references[ \t]+/) idx=idx " FK"
    }
  }
  END{ if (in==1) flush() }
  ' "$file" >> "$DB_OUT"
}

# Prisma (schema.prisma) quick extraction for model blocks
parse_prisma_file() {
  local file="$1"
  awk -v SRC="$file" '
  BEGIN{ in=0; tbl=""; cols=""; idx="" }
  function flush(){
    if (tbl!="") {
      if (cols=="") cols="-";
      if (idx=="") idx="-";
      printf("| %s | %s | %s | %s |\n", tbl, cols, idx, SRC);
    }
    in=0; tbl=""; cols=""; idx="";
  }
  {
    l=$0
    if (in==0 && match(l,/^[ \t]*model[ \t]+[A-Za-z0-9_]+[ \t]*\{/)) {
      in=1
      tbl=$0; sub(/^[ \t]*model[ \t]+/,"",tbl); sub(/[ \t]*\{.*/,"",tbl)
      next
    }
    if (in==1) {
      if (match(l,/^\}/)) { flush(); next }
      # field line: name type @id @unique @default() @relation()
      if (match(l,/^[ \t]*[A-Za-z0-9_]+[ \t]+[A-Za-z0-9_\[\]?]+/)) {
        line=l
        name=line; sub(/^[ \t]*/,"",name); sub(/[ \t].*/,"",name)
        sub(/^[ \t]*[A-Za-z0-9_]+[ \t]+/,"",line)
        type=line; sub(/[ \t].*/,"",type)
        if (cols!="") cols=cols ", "
        cols=cols name ":" type
        lower=tolower(l)
        if (lower ~ /@id/) idx=idx " PK"
        if (lower ~ /@unique/) idx=idx " UNIQUE"
        if (lower ~ /@relation\(/) idx=idx " FK"
      }
    }
  }
  ' "$file" >> "$DB_OUT"
}

while read -r f; do
  case "$f" in
    *.prisma) parse_prisma_file "$f" ;;
    *.sql)    parse_sql_file "$f"    ;;
    *)        # js/ts migration frameworks – list as source (fallback)
      echo "| - | - | - | $f |" >> "$DB_OUT"
      ;;
  esac
done < "$TMP_DBL"

# ----------------------------------------------------------
# Footer
# ----------------------------------------------------------
print_h2 "Structured Artifacts"
echo "- API routes table: $API_OUT"
echo "- DB model table:   $DB_OUT"

print_h2 "Done"
echo "- Survey finished."
