"""Build a reproducible identity-only snapshot from official EPA files.

Only make, publisher model grouping, model year and record locators are retained.
This does not infer retail trims, generations, specifications or US sales.
"""
import csv
import hashlib
import io
import json
import pathlib
import re
import urllib.request
import zipfile
from collections import defaultdict

BRANDS = ["Ford", "Lincoln", "Chevrolet", "Buick", "GMC", "Cadillac",
          "Chrysler", "Dodge", "Jeep", "Ram", "Tesla", "Rivian", "Lucid"]
OUT = pathlib.Path("artifacts/api-server/src/data/model-year-catalog.json")


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def stable_id(value):
    return int(hashlib.sha256(value.encode()).hexdigest()[:12], 16)


def download(url):
    request = urllib.request.Request(url, headers={"User-Agent": "AutoResearch/1.0 identity catalog review"})
    with urllib.request.urlopen(request, timeout=90) as response:
        return response.read()


def build():
    url = "https://www.fueleconomy.gov/feg/epadata/vehicles.csv.zip"
    archive = download(url)
    csv_bytes = zipfile.ZipFile(io.BytesIO(archive)).read("vehicles.csv")
    rows = csv.DictReader(io.StringIO(csv_bytes.decode("utf-8-sig")))
    groups = {}
    for row in rows:
        if row["make"] not in BRANDS:
            continue
        model = row["baseModel"].strip()
        year = int(row["year"])
        if not model or not 1984 <= year <= 2027:
            raise ValueError("Unexpected government identity: review before importing")
        key = (row["make"], model, year)
        group = groups.setdefault(key, {
            "make": row["make"], "model": model, "year": year,
            "source": "epa-1984-present", "records": [],
        })
        group["records"].append({"id": int(row["id"]), "model": row["model"]})
    sources = [{
        "id": "epa-1984-present", "url": url,
        "publisher": "U.S. Environmental Protection Agency / FuelEconomy.gov",
        "rightsUrl": "https://edg.epa.gov/EPA_Data_License.htm",
        "rightsStatus": "allowed", "checksumScope": "retrieved source file",
        "sha256": hashlib.sha256(csv_bytes).hexdigest(),
        "document": "FuelEconomy.gov all-model-years vehicle data",
        "limitations": "EPA baseModel grouping, not a verified retail trim or sales-availability claim. Combined publisher group names remain combined. MY2027 listings may be preliminary. Heavy-duty and other unlisted vehicles are not covered.",
    }]
    # Historical guide files identify manufacturer and car line explicitly.
    # Lincoln-Mercury is a shared heading: only named Lincoln car lines enter.
    for year in range(1978, 1984):
        url = f"https://www.fueleconomy.gov/feg/epadata/{str(year)[2:]}guide.txt"
        content = download(url)
        lines = content.decode("latin-1").splitlines()
        source = f"epa-guide-{year}"
        sources.append({
            "id": source, "url": url,
            "publisher": "U.S. Environmental Protection Agency / FuelEconomy.gov",
            "rightsUrl": "https://edg.epa.gov/EPA_Data_License.htm",
            "rightsStatus": "allowed", "checksumScope": "retrieved source file",
            "sha256": hashlib.sha256(content).hexdigest(),
            "document": f"{year} EPA Fuel Economy Guide",
            "limitations": "Historical guide car-line names are retained as printed, including combined names. Preliminary, unedited and state-specific listings may occur. A listing does not establish a retail trim or production configuration.",
        })
        make = None
        for index, line in enumerate(lines):
            # ASA carriage-control character precedes the printed content.
            if not line.startswith("0"):
                continue
            printed = line[1:]
            if printed and not printed.startswith(" "):
                heading = printed.strip()
                make = next((brand for brand in BRANDS if heading == brand.upper()), None)
                if heading == "LINCOLN-MERCURY":
                    make = "Lincoln-Mercury"
            match = re.match(r"^  (\S.{0,34})", printed)
            if not make or not match:
                continue
            model = match.group(1).strip()
            if not model or not re.match(r"^[A-Z0-9]", model):
                continue
            if make == "Lincoln-Mercury":
                if not re.match(r"^(LINCOLN|CONTINENTAL|MARK [IVX]+|TOWN CAR)", model):
                    continue
                brand = "Lincoln"
            else:
                brand = make
            key = (brand, model, year)
            group = groups.setdefault(key, {
                "make": brand, "model": model, "year": year,
                "source": source, "records": [],
            })
            group["records"].append({"line": index + 1, "model": model})
    # Manually reviewed historical model-year facts, not production-date guesses.
    classic = json.loads(pathlib.Path("lib/db/research/classic-model-year-identities.json").read_text())
    for item in classic:
        source = f"classic-{slug(item['make'])}-{slug(item['model'])}"
        sources.append({
            "id": source, "url": item["url"], "publisher": "Wikipedia contributors",
            "rightsUrl": "https://creativecommons.org/licenses/by-sa/4.0/",
            "rightsStatus": "allowed", "checksumScope": "normalized factual review",
            "sha256": hashlib.sha256(json.dumps(item, sort_keys=True).encode()).hexdigest(),
            "document": f"{item['make']} {item['model']} historical model-year identity review",
            "limitations": item["limitations"] + " Only independently normalized names/year relationships and original review notes are retained, with source attribution; no article prose or images are copied.",
        })
        for start, end in item["ranges"]:
            if not 1900 <= start <= end < 1978:
                raise ValueError("Classic supplement must contain reviewed historical model years")
            for year in range(start, end + 1):
                key = (item["make"], item["model"], year)
                if key in groups:
                    raise ValueError("Classic supplement overlaps an existing identity")
                groups[key] = {
                    "make": item["make"], "model": item["model"], "year": year,
                    "source": source, "records": [{"model": item["model"], "locator": item["locator"]}],
                }
    entries = []
    for (make, model, year), group in sorted(groups.items()):
        group["id"] = f"{slug(make)}-{slug(model)}-{year}-model-year"
        group["modelId"] = stable_id(f"{make}:{model.casefold()}")
        group["modelYearId"] = stable_id(group["id"])
        group["makeId"] = BRANDS.index(make) + 1
        group["modelSlug"] = slug(model)
        group["makeSlug"] = slug(make)
        # Duplicated engine/wheel/drive entries support ONE model/year profile.
        unique = {json.dumps(record, sort_keys=True): record for record in group["records"]}
        group["records"] = list(unique.values())
        entries.append(group)
    if len({entry["id"] for entry in entries}) != len(entries):
        raise ValueError("Slug collision requires an explicit reviewed crosswalk")
    ids = {entry["modelId"] for entry in entries}
    if len(ids) != len({(entry["make"], entry["model"].casefold()) for entry in entries}):
        raise ValueError("Model ID collision")
    if len({entry["modelYearId"] for entry in entries}) != len(entries):
        raise ValueError("Model-year ID collision")
    snapshot = {
        "reviewedAt": "2026-10-06", "market": "US",
        "identityScope": "Source-backed model/year, not retail-trim configuration; EPA listings plus a reviewed historical supplement",
        "rights": {
            "status": "allowed",
            "url": "https://edg.epa.gov/EPA_Data_License.htm",
            "basis": "Independent make/model/year facts and minimal locators only. EPA default public-domain data policy for agency facts; independently normalized historical facts with Wikipedia attribution and source-specific license metadata. No prose, images, tables, MPG or optional research retained.",
        },
        "sources": sources, "entries": entries,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")) + "\n")
    counts = defaultdict(list)
    for entry in entries:
        counts[entry["make"]].append(entry["year"])
    print(f"{len(entries)} model/year profiles")
    for brand in BRANDS:
        years = counts[brand]
        print(f"{brand}: {len(years)} profiles, {min(years)}–{max(years)}")


if __name__ == "__main__":
    build()
