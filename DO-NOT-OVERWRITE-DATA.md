# DO NOT OVERWRITE DATA FILES

These files are the live stored polling data:

- `data/polling.json`
- `data/polling-history.json`

Do not replace them with older copies when uploading design or code updates.

## Why

- `data/polling.json` is the latest scraper output.
- `data/polling-history.json` is the growing history used for graphs and 7-day changes.

## Safe update rule

Upload/edit code, HTML, CSS, scraper files, and docs. Leave the two data files alone unless you intentionally want to change the data structure.

## Protection included

`.github/workflows/protect-polling-data.yml` watches pushes to `main`.

If a normal/manual commit changes the protected data files, the workflow restores the previous versions. The scraper bot is still allowed to update the files.

To intentionally bypass the protection, include `[allow-data]` in the commit message.
