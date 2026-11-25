# Dependencies — Admin

> Product: [mission.md](mission.md)

## Internal

| Depends on | Used for |
|---|---|
| [platform](../platform/mission.md) API | Everything: lists, profiles, teaming, dashboards, comments, exports/imports, duplicate-phone validation |
| [platform/back-office-operations](../platform/epics/back-office-operations/epic.md) | Roles, communities, salon days and trainings are managed in Django admin today |

## External

| Service | Purpose |
|---|---|
| Google Maps JS + Places | Teaming map, clustering, address autocomplete |
| Google DistanceMatrix | Legacy `fe` copy only; fe-admin uses server-computed distances |
