# Mogwash Media Recovery (CLI + Web UI)

A forensic-style recovery tool for aggressively carving long-deleted photos/videos from raw storage dumps.

## Run the Web UI (new)

```bash
python3 web_app.py
```

Then open:

- http://localhost:8000

The UI lets you configure all major options (`types`, `aggressive level`, min size, dry-run, etc.) and executes `recover_media.py` for you.

## CLI quick start

```bash
python3 recover_media.py <input_image> <output_dir> --aggressive-level 3 --min-size-kb 4 --verbose
```

## Core aggressive options

- `--aggressive-level {0,1,2,3}`: controls how deeply to search damaged/deleted remnants
- `--chunk-size-mb`: tune scan granularity for big dumps
- `--min-size-kb`: lower for deeper fragment hunting
- `--types`: restrict to specific media classes
- `--dry-run`: preview without writing recovered files

## Recommended deep-recovery workflow

1. Image source drive first (do not recover directly to source disk).
2. Use Web UI or CLI with `--dry-run` for reconnaissance.
3. Run pass 1: `--aggressive-level 2 --min-size-kb 16`.
4. Run pass 2: `--aggressive-level 3 --min-size-kb 4`.
5. Review JSON/CSV reports and validate recovered files.

## Safety notes

- Recovery is best effort; heavily overwritten data may be unrecoverable.
- Aggressive mode can produce partial/false-positive files.
- Always write output to a different storage device.
