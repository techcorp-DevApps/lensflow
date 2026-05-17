# Railway CI/CD and Database Plan

## Goals

- Automate validation (`lint`, `typecheck`, `build`) for every change.
- Automate production deployment to Railway on merge to `main`.
- Use PostgreSQL on Railway as the default data layer unless workload evidence shows another option is better.
- Pin deploys to the Railway project **fulfilling-courage** (`83ddb758-c283-4deb-8a47-f546f3110fe2`).

## Railway Project Configuration

- **Project name**: `fulfilling-courage`
- **Project ID**: `83ddb758-c283-4deb-8a47-f546f3110fe2`
- The deploy workflow is explicitly hard-wired to this project id to avoid accidental cross-project deployments.

## Implemented Pipelines

### 1) Continuous Integration

Workflow: `.github/workflows/ci.yml`

Triggers:
- Every `push` branch.
- Every pull request.

Checks:
1. `quality` job (blocking): `npm ci` → `npm run lint` → `npm run build`
2. `typecheck-report` job (non-blocking, temporary): `npm ci` → `npm run typecheck`

> Typecheck remains non-blocking due to pre-existing repository-wide TypeScript issues. After baseline cleanup, remove `continue-on-error: true` and rename the job back to a blocking `typecheck` gate.

### 2) Continuous Deployment to Railway (Production)

Workflow: `.github/workflows/deploy-railway.yml`

Triggers:
- `push` to `main`.
- Manual trigger (`workflow_dispatch`).

Deployment behavior:
1. Reinstalls dependencies and validates with `npm run build`.
2. Installs Railway CLI.
3. Uses fixed project target: `fulfilling-courage` / `83ddb758-c283-4deb-8a47-f546f3110fe2`.
4. Links to Railway project environment/service using GitHub Actions secrets.
5. Executes `railway up --ci` for non-interactive deployment.

## Required GitHub Secrets

Add these repository secrets before enabling production deploys:

- `RAILWAY_TOKEN` – token from Railway account.
- `RAILWAY_ENVIRONMENT_ID` – target environment id (e.g., production).
- `RAILWAY_SERVICE` – target service name or id.

> `RAILWAY_PROJECT_ID` is no longer required as a secret because the workflow now pins the target id in source control.

## PostgreSQL Recommendation (Railway)

### Why PostgreSQL is the preferred default

- Strong ACID guarantees and transactional integrity for booking/contract workflows.
- Mature indexing and query planning for growing relational data.
- Rich ecosystem for migrations, backups, analytics, and ORMs.
- First-party Railway provisioning support with straightforward connection wiring.

### When to consider alternatives

Use an alternative only when measured requirements justify it:
- **Redis**: ultra-low-latency ephemeral cache/queue, not primary system of record.
- **MySQL**: only if existing operational expertise or dependency constraints require it.
- **Serverless/edge DBs**: only if global read-latency and scaling profile demands that architecture.

## DB Setup Plan (Execution Checklist)

1. **Provision PostgreSQL service on Railway**
   - Create PostgreSQL plugin/service in same Railway project (`fulfilling-courage`) and production environment.
2. **Define connection variables**
   - Map Railway-provided connection string to app env key (commonly `DATABASE_URL`).
3. **Schema and migrations**
   - Choose migration tool (Prisma/Drizzle/Knex/etc.) and commit migration scripts.
   - Add a CI-safe migration validation step (e.g., migration lint/dry-run).
4. **Deployment migration strategy**
   - Run migrations as pre-start release step or dedicated migration job before traffic switch.
5. **Backups and restore drill**
   - Enable automated backups/snapshots and document restore verification cadence.
6. **Observability**
   - Track query latency, locks, connection saturation, and storage growth.
7. **Security baseline**
   - Rotate credentials, principle-of-least-privilege DB roles, encrypted transport only.

## Suggested Next Iteration

- Introduce a backend migration workflow once database-access code exists.
- Add preview deployment workflow for pull requests if environment strategy requires it.
- Add smoke tests against deployed URL after production deployment.


## Conflict Resolution Notes

- Reconciled CI naming and gating by keeping a strict `quality` gate and preserving visibility with a dedicated non-blocking typecheck report job.
- Preserved Railway project pinning and secrets contract while aligning workflow structure with latest PR expectations.
