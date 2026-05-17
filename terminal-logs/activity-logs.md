# Base44 Activity Logs — Codex Machine-Readable Context

## Purpose

This file summarizes the supplied Base44 activity logs in a structured form for Codex-assisted migration/debugging work.

## Key Observations

- Repeated `app.entity.query` calls targeted the `Gallery` entity with `filter_fields: "id"` and `limit: "5000"`.
- One `SendEmail` integration call failed with `404: Cannot send emails to users outside the app`.
- Several events were visible only as type/user/timestamp rows and had no attached `Details` block in the supplied source.
- Source timestamps did not include a timezone, so ISO timestamps are stored as local-time values without timezone offset.

## Recommended Codex Focus

1. Replace Base44 entity-listing behaviour with Railway API routes for gallery list/read operations.
2. Implement external email delivery through a Railway-supported provider instead of Base44's app-user-restricted SendEmail integration.
3. Add audit logging around gallery queries and outbound email attempts.
4. Add migration tests for the gallery fetch pattern currently using `filter_fields: "id"` and `limit: "5000"`.

## Files

- `base44-activity-logs-codex.json` — full structured JSON envelope.
- `base44-activity-logs-codex.ndjson` — one event per line for ingestion pipelines.

## JSON Schema Shape

```json
{
  "schema": "illuminate.logs.codex.v1",
  "record_count": 0,
  "timezone": "local_unspecified",
  "events": [
    {
      "event_id": "log_0001",
      "source": "base44_activity_log_export",
      "type": "app.entity.query",
      "user": "user@example.com",
      "timestamp": "2026-05-16T22:34:58",
      "timestamp_raw": "5/16/2026, 10:34:58 PM",
      "details": {},
      "error": null
    }
  ]
}
```
