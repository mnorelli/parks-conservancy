# trailhead-importer

Imports trailheads from Transit&Trails.  Merges those with
`non_profit_partner_id=1` and `user_id=2280` and de-duplicates.

## Identifying Mismatches

To identify trailheads present in the GGNPC-provided `locations` layer but
missing from the generated TnT extract:

```sql
SELECT l.*
  FROM locations l
LEFT JOIN trailheads th ON ST_DWithin(th.geom, l.geom, 250)
  WHERE l.type = 'Trailhead'
  AND th.name IS NULL;
```
