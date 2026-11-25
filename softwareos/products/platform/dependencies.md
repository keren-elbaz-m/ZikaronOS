# Dependencies — Platform

> Product: [mission.md](mission.md)

## Internal

| Depends on | Used for |
|---|---|
| — | Platform is the system of record; nothing internal upstream |

| Consumed by | Via |
|---|---|
| [admin](../admin/mission.md) | REST `/api/*` (lists, profiles, teaming, dashboards, exports/imports) |
| Django admin (super admins) | `/admin/` |

## External

| Service | Purpose | Notes |
|---|---|---|
| AWS RDS Postgres | Primary data | Naive Jerusalem datetimes |
| AWS SQS + Lambda + Secrets Manager | Email delivery pipeline | The Lambda in the repo has a `get_secret` arg bug; the deployed one likely differs |
| SendGrid | Email | Templates in DB (`EmailMessageTemplate`), he/en |
| TexterChat | WhatsApp templates | Hard-coded template names |
| Twilio | SMS login passcodes | |
| AWS EventBridge Scheduler | Reminder trigger | Schedule lives in AWS, not in the repo |
| Google | OAuth sign-in, Maps/Places (FE), Geocoding (webhook), Sheets (witness intake) | |
| ipapi.co | Visitor country (FE) | Defaults to IL |
| nagich.co.il | Accessibility widget (FE) | |
| Google Tag Manager | `dataLayer` events (FE) | `Want_to_host`, `Want_to_be_hosted`, `Guest_Registration_completed`, `Registration_completed_Creating_living_room` |
| Easy | Partner consuming the salon feed | Basic auth |
