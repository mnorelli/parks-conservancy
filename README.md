## Creating pgdumps

`pg_dump -Z0 -Fc -v -O -x --no-tablespaces -t nhdarea ggnpc | pv | pigz > nhdarea.pgdump.gz`

`pigz` is used with `-Z0` because `pg_dump`'s compression is single-threaded.
