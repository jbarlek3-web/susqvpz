"""Build the York County assessment-roll search index used by Ordinance Aide.

Source workbook (default): Desktop\\Parcels_.xlsx
Output: src/lib/data/york-parcel-index/index.json.gz

Tuple layout (keep in sync with src/lib/york-parcel-index.ts):
  0 pidn, 1 address, 2 owner, 3 acres, 4 class, 5 luc, 6 school,
  7 land, 8 building, 9 assessed, 10 saleDate, 11 salePrice,
  12 yearBuilt, 13 livingArea, 14 deed, 15 utility, 16 style,
  17 mail, 18 district
"""

from __future__ import annotations

import gzip
import json
import sys
import xml.etree.ElementTree as ET
import zipfile
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
MAIN = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_XLSX = Path(r"C:\Users\Shadow 13 Solutions\Desktop\Parcels_.xlsx")
OUT = ROOT / "src" / "lib" / "data" / "york-parcel-index" / "index.json.gz"


def col_index(ref: str) -> int:
    col = "".join(ch for ch in ref if ch.isalpha())
    n = 0
    for ch in col:
        n = n * 26 + (ord(ch.upper()) - 64)
    return n - 1


def shared_strings(zf: zipfile.ZipFile) -> list[str]:
    root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
    strings: list[str] = []
    for si in root.findall("m:si", NS):
        parts = [t.text or "" for t in si.iter(f"{MAIN}t")]
        strings.append("".join(parts))
    return strings


def cell_text(cell: ET.Element, strings: list[str]) -> str:
    kind = cell.get("t")
    if kind == "inlineStr":
        parts = [t.text or "" for t in cell.iter(f"{MAIN}t")]
        return "".join(parts).strip()
    value = cell.find("m:v", NS)
    if value is None or value.text is None:
        return ""
    raw = value.text
    if kind == "s":
        return strings[int(raw)].strip()
    return raw.strip()


def excel_date(raw: str) -> str:
    if not raw:
        return ""
    try:
        num = float(raw)
    except ValueError:
        return ""
    if 19000101 <= num <= 21001231 and float(num).is_integer():
        text = str(int(num))
        return f"{text[0:4]}-{text[4:6]}-{text[6:8]}"
    if not 20000 <= num <= 60000:
        return ""
    day = datetime(1899, 12, 30) + timedelta(days=int(num))
    return day.strftime("%Y-%m-%d")


def alnum(raw: str) -> str:
    return "".join(ch for ch in raw.strip().upper() if ch.isalnum())


def compose_pidn(district: str, block: str, map_no: str, parcel: str, raw: str) -> str:
    """York PIDNs are district(2) + block(3) + map(2) + parcel(6), and parcel may end in a letter."""

    def fixed(value: str, width: int) -> str:
        chars = alnum(value)
        if not chars:
            return ""
        if chars.isdigit():
            return chars.zfill(width)[-width:]
        return chars.zfill(width) if len(chars) < width else chars

    parcel_id = alnum(parcel)
    if parcel_id.isdigit():
        parcel_id = parcel_id.zfill(6)[-6:]
    elif parcel_id and len(parcel_id) < 6:
        parcel_id = parcel_id.zfill(6)
    composed = f"{fixed(district, 2)}{fixed(block, 3)}{fixed(map_no, 2)}{parcel_id}"
    if len(composed) == 13:
        return composed

    fallback = alnum(raw)
    if fallback.isdigit() and 0 < len(fallback) < 13:
        fallback = fallback.zfill(13)
    return fallback or composed


def number(raw: str) -> float:
    if not raw:
        return 0
    try:
        return float(raw)
    except ValueError:
        return 0


def whole(raw: str) -> int:
    value = number(raw)
    if value <= 0:
        return 0
    return int(round(value))


def text(raw: str) -> str:
    return " ".join(raw.split())


def build(xlsx: Path) -> None:
    print(f"Reading {xlsx}")
    with zipfile.ZipFile(xlsx) as zf:
        strings = shared_strings(zf)
        print(f"Shared strings: {len(strings)}")
        root = ET.fromstring(zf.read("xl/worksheets/sheet1.xml"))

    rows = root.findall("m:sheetData/m:row", NS)
    if not rows:
        raise SystemExit("Workbook has no rows")

    header_cells = rows[0].findall("m:c", NS)
    headers: dict[int, str] = {}
    for cell in header_cells:
        ref = cell.get("r") or ""
        headers[col_index(ref)] = cell_text(cell, strings)

    def field(values: dict[int, str], name: str) -> str:
        for index, header in headers.items():
            if header == name:
                return values.get(index, "")
        return ""

    classes: Counter[str] = Counter()
    packed: list[list[object]] = []
    for row in rows[1:]:
        values: dict[int, str] = {}
        for cell in row.findall("m:c", NS):
            ref = cell.get("r") or ""
            values[col_index(ref)] = cell_text(cell, strings)

        pidn = compose_pidn(
            field(values, "DISTRICT"),
            field(values, "BLOCK"),
            field(values, "MAP"),
            field(values, "PARCEL"),
            field(values, "PIDN"),
        )
        address = text(field(values, "PROPADR"))
        owner = text(field(values, "OWNER_FULL"))
        if not pidn and not address and not owner:
            continue

        class_code = text(field(values, "CLASS")).upper()
        if class_code:
            classes[class_code] += 1
        school = text(field(values, "SCHOOL_DIS"))
        if school.isdigit() and len(school) < 3:
            school = school.zfill(3)
        district = text(field(values, "DISTRICT"))
        if district.isdigit() and len(district) < 2:
            district = district.zfill(2)
        deed_bk = text(field(values, "DEED_BK"))
        deed_pg = text(field(values, "DEED_PG"))
        deed = f"{deed_bk}/{deed_pg}" if deed_bk or deed_pg else ""
        acres = number(field(values, "ACRES"))

        packed.append(
            [
                pidn,
                address,
                owner,
                round(acres, 4) if acres > 0 else 0,
                class_code,
                text(field(values, "LUC")),
                school,
                whole(field(values, "APRLAND")),
                whole(field(values, "APRBLDG")),
                whole(field(values, "APRTOTAL")),
                excel_date(field(values, "SALEDT")),
                whole(field(values, "PRICE")),
                whole(field(values, "YRBLT")),
                whole(field(values, "RES_LIVING_AREA")),
                deed,
                text(field(values, "UTILITY")),
                text(field(values, "STYLE")),
                text(field(values, "MAIL_ADDR_FULL")),
                district,
            ]
        )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {"v": 1, "source": "York County assessment roll", "count": len(packed), "rows": packed}
    with gzip.open(OUT, "wt", encoding="utf-8") as handle:
        json.dump(payload, handle, separators=(",", ":"))

    size_mb = OUT.stat().st_size / (1024 * 1024)
    print(f"Parcels: {len(packed)}")
    print(f"Wrote {OUT} ({size_mb:.1f} MB)")
    print("Class codes:", ", ".join(f"{code}={count}" for code, count in classes.most_common()))


if __name__ == "__main__":
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_XLSX
    if not source.exists():
        raise SystemExit(f"Workbook not found: {source}")
    build(source)
