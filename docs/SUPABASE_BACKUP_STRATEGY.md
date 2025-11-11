# Supabase Backup Strategy

## Overview

This document outlines the backup and disaster recovery strategy for Chravel's Supabase database.

## Current Status

**Status:** ⚠️ Manual backups only - Automated strategy needed

## Recommended Backup Strategy

### 1. Automated Daily Backups

Supabase Pro/Team plans include automated daily backups. Ensure backups are enabled:

```bash
# Check backup status in Supabase Dashboard
# Settings > Database > Backups
```

**Configuration:**
- **Frequency:** Daily at 2:00 AM UTC (low-traffic window)
- **Retention:** 30 days
- **Point-in-time recovery:** Enabled (if available on plan)

### 2. Manual Backup Before Major Migrations

Before running significant migrations, create a manual backup:

```bash
# Via Supabase CLI
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# Or via Dashboard
# Settings > Database > Backups > Create Backup
```

### 3. Schema-Only Backups

For version control and disaster recovery, maintain schema-only backups:

```bash
# Export schema only (no data)
supabase db dump --schema-only -f schema_backup.sql

# Commit to version control (git)
git add schema_backup.sql
git commit -m "Schema backup: $(date +%Y-%m-%d)"
```

### 4. Critical Data Exports

For compliance and audit purposes, export critical tables regularly:

```sql
-- Export trips data
COPY (
  SELECT * FROM trips
  WHERE created_at >= NOW() - INTERVAL '30 days'
) TO '/tmp/trips_export.csv' WITH CSV HEADER;

-- Export payment data (for financial records)
COPY (
  SELECT * FROM trip_payment_messages
  WHERE created_at >= NOW() - INTERVAL '90 days'
) TO '/tmp/payments_export.csv' WITH CSV HEADER;
```

## Backup Verification

### Weekly Backup Test

1. **Restore Test:** Restore latest backup to staging environment
2. **Data Integrity Check:** Verify critical tables have expected row counts
3. **Application Test:** Run smoke tests against restored database

### Monitoring

Set up alerts for:
- Backup failures
- Backup size anomalies (sudden drops)
- Backup age (backups older than 24 hours)

## Disaster Recovery Plan

### Recovery Time Objective (RTO)
- **Target:** < 4 hours
- **Maximum:** < 24 hours

### Recovery Point Objective (RPO)
- **Target:** < 1 hour of data loss
- **Maximum:** < 24 hours of data loss

### Recovery Steps

1. **Assess Damage:** Identify affected tables/data
2. **Choose Recovery Point:** Select backup timestamp
3. **Restore Backup:** Use Supabase Dashboard or CLI
4. **Verify Data:** Run integrity checks
5. **Update Application:** Point to restored database
6. **Monitor:** Watch for issues post-recovery

## Migration Safety

### Pre-Migration Checklist

- [ ] Create manual backup
- [ ] Test migration on staging environment
- [ ] Review migration SQL for destructive operations
- [ ] Document rollback procedure
- [ ] Schedule during low-traffic window

### Post-Migration Checklist

- [ ] Verify data integrity
- [ ] Check application functionality
- [ ] Monitor error logs
- [ ] Create post-migration backup

## Backup Storage

### Primary Storage
- **Location:** Supabase managed backups (cloud)
- **Access:** Via Supabase Dashboard

### Secondary Storage (Recommended)
- **Location:** AWS S3 or similar
- **Frequency:** Weekly exports
- **Retention:** 90 days

### Setup Secondary Backup

```bash
# Export and upload to S3
supabase db dump -f backup.sql
aws s3 cp backup.sql s3://chravel-backups/daily/backup_$(date +%Y%m%d).sql
```

## Compliance & Audit

### Backup Logs

Maintain a log of all backups:

| Date | Type | Size | Location | Verified |
|------|------|------|----------|----------|
| 2025-02-01 | Automated | 2.3 GB | Supabase Cloud | ✅ |
| 2025-02-01 | Manual (pre-migration) | 2.3 GB | Supabase Cloud | ✅ |

### Retention Policy

- **Daily backups:** 30 days
- **Weekly backups:** 90 days
- **Monthly backups:** 1 year
- **Annual backups:** 7 years (for compliance)

## Next Steps for Developer Agency

1. **Enable Automated Backups:** Verify in Supabase Dashboard
2. **Set Up Monitoring:** Configure alerts for backup failures
3. **Test Recovery:** Perform test restore to staging
4. **Document Procedures:** Create runbook for team
5. **Schedule Regular Reviews:** Monthly backup verification

## References

- [Supabase Backup Documentation](https://supabase.com/docs/guides/platform/backups)
- [PostgreSQL Backup Best Practices](https://www.postgresql.org/docs/current/backup.html)
- [Disaster Recovery Planning](https://supabase.com/docs/guides/platform/backups#point-in-time-recovery)
