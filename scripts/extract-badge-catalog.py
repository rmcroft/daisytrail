#!/usr/bin/env python3
"""Extract Badge Explorer PDF rows into the Angular badge catalog."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pdfplumber


SOURCE_URL = "https://www.girlscouts.org/en/members/for-girl-scouts/badges-journeys-awards/badge-explorer.html"
LEVELS = {
    "Junior": "Junior (Grades 4-5)",
    "Cadette": "Cadette (Grades 6-8)",
    "Brownie": "Brownie (Grades 2-3)",
}


def clustered(values: list[float], tolerance: float = 4) -> list[float]:
    groups: list[list[float]] = []
    for value in sorted(values):
        if not groups or value - groups[-1][-1] > tolerance:
            groups.append([value])
        else:
            groups[-1].append(value)
    return [sum(group) / len(group) for group in groups]


def clean_lines(text: str | None) -> list[str]:
    lines = []
    for line in (text or "").splitlines():
        cleaned = re.sub(r"\s+", " ", line).strip()
        cleaned = re.sub(r"(?:More Details\s+)?Get This (?:Badge|Journey)", "", cleaned, flags=re.IGNORECASE).strip()
        cleaned = re.sub(r"\bMore Details\b", "", cleaned, flags=re.IGNORECASE).strip()
        if cleaned:
            lines.append(cleaned)
    return lines


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def parse_requirements(lines: list[str]) -> tuple[list[str], str]:
    lines = [line for line in lines if line != "GET THIS BADGE"]
    requirements: list[str] = []
    description: list[str] = []
    active_requirement = -1
    in_summary = False

    for line in lines:
        match = re.match(r"^(\d+)\.\s*(.+)$", line)
        if match:
            requirements.append(match.group(2).strip())
            active_requirement = len(requirements) - 1
            in_summary = False
            continue

        summary_start = line.startswith(("When ", "This badge", "You can ", "Earn ", "Find out more"))
        if summary_start:
            in_summary = True
            active_requirement = -1

        if active_requirement >= 0 and not in_summary:
            requirements[active_requirement] += f" {line}"
        else:
            description.append(line)

    return requirements, " ".join(description)


def extract_pdf(path: Path, level: str) -> list[dict]:
    level_label = LEVELS[level]
    badges: list[dict] = []
    seen_ids: dict[str, int] = {}

    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            boundaries = clustered([
                float(edge["top"])
                for edge in page.edges
                if float(edge["x1"]) - float(edge["x0"]) > 400 and float(edge["top"]) >= 140
            ])
            for top, bottom in zip(boundaries, boundaries[1:]):
                left = clean_lines(page.crop((30, top + 2, 170, bottom - 2)).extract_text(x_tolerance=2, y_tolerance=3))
                if not any(level_label in line for line in left):
                    continue

                level_index = next(index for index, line in enumerate(left) if level_label in line)
                title = " ".join(left[:level_index]).strip()
                topics = [line for line in left[level_index + 1:] if line not in {"GET THIS BADGE"}]
                right = clean_lines(page.crop((180, top + 2, 555, bottom - 2)).extract_text(x_tolerance=2, y_tolerance=3))
                requirements, description = parse_requirements(right)

                if not title:
                    continue
                base_id = f"catalog-{level.lower()}-{slug(title)}"
                seen_ids[base_id] = seen_ids.get(base_id, 0) + 1
                badge_id = base_id if seen_ids[base_id] == 1 else f"{base_id}-{seen_ids[base_id]}"
                badges.append({
                    "id": badge_id,
                    "title": title,
                    "level": level,
                    "topic": " / ".join(topics) if topics else "General",
                    "description": description,
                    "sourceUrl": SOURCE_URL,
                    "requirements": [
                        {"id": f"{badge_id}-req-{index}", "title": requirement}
                        for index, requirement in enumerate(requirements, start=1)
                    ],
                })

    return badges


def main() -> None:
    if len(sys.argv) != 5:
        raise SystemExit("usage: extract-badge-catalog.py JUNIOR CADETTE BROWNIE OUTPUT")

    badges = []
    for path, level in zip(map(Path, sys.argv[1:4]), ("Junior", "Cadette", "Brownie")):
        badges.extend(extract_pdf(path, level))

    output = Path(sys.argv[4])
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(badges, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")
    counts = {level: sum(badge["level"] == level for badge in badges) for level in LEVELS}
    print(json.dumps({"total": len(badges), "levels": counts}))


if __name__ == "__main__":
    main()
