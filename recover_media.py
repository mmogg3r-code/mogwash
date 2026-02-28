#!/usr/bin/env python3
"""Aggressive media recovery utility for deleted/long-lost files."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import mmap
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple


@dataclass(frozen=True)
class Signature:
    extension: str
    headers: Sequence[bytes]
    footer: Optional[bytes] = None
    max_size: int = 512 * 1024 * 1024


SIGNATURES: Dict[str, Signature] = {
    "jpg": Signature("jpg", headers=(b"\xff\xd8\xff",), footer=b"\xff\xd9", max_size=128 * 1024 * 1024),
    "png": Signature("png", headers=(b"\x89PNG\r\n\x1a\n",), footer=b"IEND\xaeB`\x82", max_size=256 * 1024 * 1024),
    "gif": Signature("gif", headers=(b"GIF87a", b"GIF89a"), footer=b"\x00;", max_size=128 * 1024 * 1024),
    "webp": Signature("webp", headers=(b"RIFF",), max_size=256 * 1024 * 1024),
    "heic": Signature("heic", headers=(b"ftypheic", b"ftypheix", b"ftypmif1", b"ftypmsf1"), max_size=512 * 1024 * 1024),
    "mp4": Signature("mp4", headers=(b"ftypisom", b"ftypmp41", b"ftypmp42", b"ftypavc1", b"ftypdash"), max_size=4 * 1024 * 1024 * 1024),
    "mov": Signature("mov", headers=(b"ftypqt",), max_size=4 * 1024 * 1024 * 1024),
    "3gp": Signature("3gp", headers=(b"ftyp3gp", b"ftyp3g2"), max_size=2 * 1024 * 1024 * 1024),
    "mkv": Signature("mkv", headers=(b"\x1a\x45\xdf\xa3",), max_size=8 * 1024 * 1024 * 1024),
    "avi": Signature("avi", headers=(b"RIFF",), max_size=4 * 1024 * 1024 * 1024),
}

# Extra weaker signatures used in aggressive mode.
AGGRESSIVE_HEADERS: Dict[str, Sequence[bytes]] = {
    "jpg": (b"\xff\xd8",),
    "png": (b"PNG\r\n\x1a\n",),
    "mp4": (b"moov", b"mdat"),
    "mov": (b"moov", b"mdat"),
}


@dataclass
class RecoveryRecord:
    index: int
    extension: str
    start: int
    end: int
    output_path: Path
    carve_strategy: str
    sha256: Optional[str] = None
    duplicate_of: Optional[str] = None

    @property
    def size(self) -> int:
        return self.end - self.start


@dataclass(frozen=True)
class RawHit:
    extension: str
    start: int
    strength: str  # strong / aggressive / footer-backtrack


class MediaRecoverer:
    def __init__(
        self,
        input_path: Path,
        output_dir: Path,
        types: Iterable[str],
        min_size: int,
        max_files: Optional[int],
        chunk_size: int,
        dry_run: bool,
        dedupe: bool,
        report_prefix: str,
        verbose: bool,
        aggressive_level: int,
    ) -> None:
        self.input_path = input_path
        self.output_dir = output_dir
        self.types = [t.strip().lower() for t in types if t.strip()]
        self.min_size = min_size
        self.max_files = max_files
        self.chunk_size = chunk_size
        self.dry_run = dry_run
        self.dedupe = dedupe
        self.report_prefix = report_prefix
        self.verbose = verbose
        self.aggressive_level = aggressive_level

        unsupported = [t for t in self.types if t not in SIGNATURES]
        if unsupported:
            raise ValueError(f"Unsupported file type(s): {', '.join(sorted(set(unsupported)))}")

        self._headers = self._build_header_index()
        self._seen_hashes: Dict[str, Path] = {}

    def recover(self) -> List[RecoveryRecord]:
        if not self.dry_run:
            self.output_dir.mkdir(parents=True, exist_ok=True)

        records: List[RecoveryRecord] = []
        with self.input_path.open("rb") as handle:
            with mmap.mmap(handle.fileno(), 0, access=mmap.ACCESS_READ) as data:
                if len(data) == 0:
                    self._write_reports(records)
                    return records

                hits = self._scan_headers(data)
                hits = sorted(hits, key=lambda h: h.start)

                for hit in hits:
                    if self.max_files is not None and len(records) >= self.max_files:
                        break

                    signature = SIGNATURES[hit.extension]
                    end, strategy = self._find_end(data, hit, signature, hits)
                    if end is None:
                        continue

                    size = end - hit.start
                    if size < self.min_size:
                        continue

                    output_name = f"recovered_{len(records) + 1:06d}.{hit.extension}"
                    output_path = self.output_dir / output_name
                    record = RecoveryRecord(
                        index=len(records) + 1,
                        extension=hit.extension,
                        start=hit.start,
                        end=end,
                        output_path=output_path,
                        carve_strategy=strategy,
                    )

                    blob = data[hit.start:end]
                    if self.dedupe:
                        digest = hashlib.sha256(blob).hexdigest()
                        record.sha256 = digest
                        if digest in self._seen_hashes:
                            record.duplicate_of = self._seen_hashes[digest].name
                        else:
                            self._seen_hashes[digest] = output_path

                    records.append(record)

                    if not self.dry_run and record.duplicate_of is None:
                        with output_path.open("wb") as out:
                            out.write(blob)

                    if self.verbose:
                        print(
                            f"[hit #{record.index}] {record.extension} offset={record.start} "
                            f"size={record.size / (1024 * 1024):.2f} MB strategy={record.carve_strategy}"
                        )

        self._write_reports(records)
        return records

    def _build_header_index(self) -> List[Tuple[str, bytes, str]]:
        headers: List[Tuple[str, bytes, str]] = []
        for extension in self.types:
            sig = SIGNATURES[extension]
            for header in sig.headers:
                headers.append((extension, header, "strong"))

            if self.aggressive_level >= 2 and extension in AGGRESSIVE_HEADERS:
                for header in AGGRESSIVE_HEADERS[extension]:
                    headers.append((extension, header, "aggressive"))

        return headers

    def _scan_headers(self, data: mmap.mmap) -> List[RawHit]:
        hits: List[RawHit] = []
        overlap = max(len(h) for _, h, _ in self._headers)
        size = len(data)
        cursor = 0

        while cursor < size:
            end = min(size, cursor + self.chunk_size)
            chunk = data[cursor:end]

            for extension, header, strength in self._headers:
                start_at = 0
                while True:
                    idx = chunk.find(header, start_at)
                    if idx == -1:
                        break
                    hits.append(RawHit(extension=extension, start=cursor + idx, strength=strength))
                    start_at = idx + 1

            if end == size:
                break
            cursor = end - overlap

        if self.aggressive_level >= 3:
            hits.extend(self._footer_backtrack_hits(data))

        deduped = sorted({(h.extension, h.start, h.strength) for h in hits}, key=lambda x: x[1])
        return [RawHit(extension=e, start=s, strength=t) for e, s, t in deduped]

    def _footer_backtrack_hits(self, data: mmap.mmap) -> List[RawHit]:
        """Extra-deep mode: discover likely starts by scanning footers and backtracking."""
        hits: List[RawHit] = []
        for extension in ("jpg", "png", "gif"):
            if extension not in self.types:
                continue
            sig = SIGNATURES[extension]
            if sig.footer is None:
                continue

            pos = 0
            while True:
                footer = data.find(sig.footer, pos)
                if footer == -1:
                    break

                search_start = max(0, footer - 4 * 1024 * 1024)
                likely = -1
                for header in sig.headers:
                    candidate = data.rfind(header, search_start, footer)
                    if candidate > likely:
                        likely = candidate

                if likely != -1:
                    hits.append(RawHit(extension=extension, start=likely, strength="footer-backtrack"))
                pos = footer + 1

        return hits

    def _find_end(
        self,
        data: mmap.mmap,
        hit: RawHit,
        signature: Signature,
        hits: Sequence[RawHit],
    ) -> Tuple[Optional[int], str]:
        start = hit.start

        if signature.extension == "webp":
            riff_start = max(0, start - 8)
            if data[riff_start:riff_start + 4] == b"RIFF" and data[riff_start + 8:riff_start + 12] == b"WEBP":
                declared = int.from_bytes(data[riff_start + 4:riff_start + 8], "little")
                end = riff_start + 8 + declared
                if end > riff_start:
                    return min(len(data), end), "webp-riff-size"

        if signature.footer:
            footer_idx = data.find(signature.footer, start + 1)
            if footer_idx != -1:
                return footer_idx + len(signature.footer), "footer-match"

        next_start = None
        for candidate in hits:
            if candidate.start > start:
                next_start = candidate.start
                break
        if next_start is None:
            next_start = len(data)

        fallback_end = min(next_start, start + signature.max_size)

        if self.aggressive_level >= 1:
            return fallback_end, "next-header-fallback"

        return None, "discarded-no-footer"

    def _write_reports(self, records: Sequence[RecoveryRecord]) -> None:
        report_base = self.output_dir if not self.dry_run else Path.cwd()
        json_report = report_base / f"{self.report_prefix}.json"
        csv_report = report_base / f"{self.report_prefix}.csv"

        json_payload = [
            {
                "index": r.index,
                "extension": r.extension,
                "start": r.start,
                "end": r.end,
                "size": r.size,
                "strategy": r.carve_strategy,
                "output": str(r.output_path),
                "sha256": r.sha256,
                "duplicate_of": r.duplicate_of,
            }
            for r in records
        ]
        json_report.write_text(json.dumps(json_payload, indent=2), encoding="utf-8")

        with csv_report.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            writer.writerow(["index", "extension", "start", "end", "size", "strategy", "output", "sha256", "duplicate_of"])
            for r in records:
                writer.writerow(
                    [
                        r.index,
                        r.extension,
                        r.start,
                        r.end,
                        r.size,
                        r.carve_strategy,
                        str(r.output_path),
                        r.sha256 or "",
                        r.duplicate_of or "",
                    ]
                )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Aggressive media recovery app for deep carving of deleted photos and videos from storage dumps.",
    )
    parser.add_argument("input", type=Path, help="Path to raw image/device dump")
    parser.add_argument("output", type=Path, help="Output directory for recovered files")
    parser.add_argument(
        "--types",
        default="jpg,png,gif,webp,heic,mp4,mov,3gp,mkv,avi",
        help="Comma-separated media types to recover",
    )
    parser.add_argument("--min-size-kb", type=int, default=8, help="Minimum file size in KB")
    parser.add_argument("--max-files", type=int, default=None, help="Stop after N recovered files")
    parser.add_argument("--chunk-size-mb", type=int, default=16, help="Scan chunk size in MB (higher = faster, more RAM)")
    parser.add_argument("--aggressive-level", type=int, choices=[0, 1, 2, 3], default=2, help="0=safe, 1=fallback carving, 2=weak signatures, 3=footer backtracking")
    parser.add_argument("--no-dedupe", action="store_true", help="Disable SHA256 duplicate detection")
    parser.add_argument("--report-prefix", default="recovery_report", help="Prefix for generated JSON/CSV report files")
    parser.add_argument("--dry-run", action="store_true", help="Scan only; do not write recovered media")
    parser.add_argument("--verbose", action="store_true", help="Print each detected recovery candidate")
    return parser.parse_args()


def print_summary(records: Sequence[RecoveryRecord], output_dir: Path, report_prefix: str, dry_run: bool) -> None:
    total = sum(r.size for r in records)
    duplicates = sum(1 for r in records if r.duplicate_of is not None)
    restored = len(records) - duplicates
    aggressive = sum(1 for r in records if r.carve_strategy != "footer-match")

    print(f"Found {len(records)} candidate files.")
    print(f"Recoverable unique files: {restored}")
    print(f"Duplicate candidates skipped: {duplicates}")
    print(f"Aggressive/heuristic recoveries: {aggressive}")
    print(f"Total carved bytes: {total / (1024 * 1024):.2f} MB")

    report_base = output_dir if not dry_run else Path.cwd()
    print(f"JSON report: {report_base / (report_prefix + '.json')}")
    print(f"CSV report:  {report_base / (report_prefix + '.csv')}")


def main() -> None:
    args = parse_args()
    if not args.input.exists():
        raise SystemExit(f"Input path does not exist: {args.input}")

    file_types = [t.strip().lower() for t in args.types.split(",") if t.strip()]
    recoverer = MediaRecoverer(
        input_path=args.input,
        output_dir=args.output,
        types=file_types,
        min_size=max(1, args.min_size_kb) * 1024,
        max_files=args.max_files,
        chunk_size=max(1, args.chunk_size_mb) * 1024 * 1024,
        dry_run=args.dry_run,
        dedupe=not args.no_dedupe,
        report_prefix=args.report_prefix,
        verbose=args.verbose,
        aggressive_level=args.aggressive_level,
    )

    records = recoverer.recover()
    print_summary(records, args.output, args.report_prefix, args.dry_run)


if __name__ == "__main__":
    main()
