"""Build an original, de-identified research report, without bundling source material."""
import csv
import json
import pathlib
import textwrap
import zipfile

import pymupdf

root = pathlib.Path("docs/research/maintenance-and-issues")
data = json.loads((root / "batch-2026-10-05.json").read_text())
catalog = json.loads(pathlib.Path(
    "artifacts/api-server/src/data/model-year-catalog.json").read_text())
with (root / "catalog-research-coverage.csv").open(newline="") as file:
    coverage = list(csv.DictReader(file))
assert len(coverage) == len(catalog["entries"]) == data["scope"]["catalogProfileCount"]
assert {row["catalogProfileId"] for row in coverage} == {e["id"] for e in catalog["entries"]}
assert len({row["catalogProfileId"] for row in coverage}) == len(coverage)
assert not data["publicReleaseAuthorized"] and not data["ingestedIntoApplication"]
assert len(data["maintenance"]) == 12 and len(data["complaints"]) == 6
for row in data["maintenance"]:
    assert row["sourceUrl"].startswith("https://") and row["sourceLocator"]
    assert row["rightsStatus"] == "needs_commercial_source_use_review"
    assert row["publicationStatus"] == "withheld_pending_review"
    assert row["distanceIntervalMiles"] or row["monthInterval"]
for row in data["complaints"]:
    assert row["evidenceType"] == "external_owner_report"
    assert row["distanceUnit"] is None
    assert row["typicalFailureMileage"] is None and row["failureRate"] is None
    assert "summary" not in row and "vin" not in row
    if row["make"] == "CHEVROLET":
        assert "1500" in row["profileMappingStatus"]
assert next(r for r in data["complaints"] if r["odiNumber"] == "11763307")[
    "reportedFailureMileageValue"] == 4

document = pymupdf.open()
page = None
y = 0


def new_page():
    global page, y
    page = document.new_page(width=595, height=842)
    page.insert_text((42, 28), "AUTORESEARCH | INTERNAL REVIEW DRAFT", fontsize=8)
    y = 58


def line(text, size=9.5, bold=False):
    global y
    # Built-in PDF fonts: use ASCII punctuation, original prose only.
    text = text.replace("\u2014", "-").replace("\u2019", "'")
    for part in textwrap.wrap(text, width=90 if size < 11 else 70) or [""]:
        if page is None or y > 784:
            new_page()
        page.insert_text((42, y), part, fontsize=size,
                         fontname="hebo" if bold else "helv")
        y += size + 4


def paragraph(text):
    global y
    line(text)
    y += 5


def heading(text):
    global y
    if page is None or y > 738:
        new_page()
    y += 8
    line(text, size=12, bold=True)
    y += 3


heading("Maintenance and reported-problem research")
paragraph("First partial batch | reviewed October 5, 2026 | U.S. catalog")
paragraph("Private review files only. No database ingestion, public release, migration, "
          "or changes to vehicle profiles are part of this batch.")
heading("Coverage and meaning of verification")
paragraph("Catalog: 4,661 model/year profiles across 13 brands. This batch contains "
          "12 maintenance facts for two profiles and six selected NHTSA complaint "
          "records across three profiles. The other 4,658 profiles have no evidence "
          "drafts from this batch. Even these three profiles are not fully researched.")
paragraph("Source-checked means a statement matches the cited record. It does not "
          "mean an alleged failure or odometer value has been independently proved. "
          "The six complaints are examples, not a representative sample. They do "
          "not establish a common problem, typical failure mileage or failure rate.")
heading("Publication and source-use decisions")
paragraph("NHTSA: the Data.gov record explicitly declares a public-domain license. "
          "Retain normalized factual fields, complaint IDs and source links. Do "
          "not assume this permits copying manufacturer documents, third-party "
          "expression or private information. No complaint narratives are bundled.")
paragraph("OEM sources: Ford, Chevrolet and Tesla website terms were inspected; "
          "they restrict commercial copying or reuse of site materials. These "
          "restrictions do not make all independent vehicle facts copyrighted, "
          "nor require a blanket brand license. The exact contractual access and "
          "commercial factual-normalization use still need review.")
paragraph("Attribution is not permission. Fact checks, configuration applicability "
          "and source-use decisions are separate gates. All OEM maintenance "
          "records remain withheld from publication. This report is not legal "
          "assurance; obtain qualified advice for unresolved intended uses.")

new_page()
heading("2024 Chevrolet Silverado 1500: partial maintenance")
paragraph("Official GM-hosted owner manual: 85516379C, March 4, 2024, third printing. "
          "Maintenance pages 425-427 (PDF pages 426-428). Gasoline scope only; "
          "diesel supplements and exact retail configurations were not reviewed. "
          "The catalog's broader Silverado family is not blanket applicability.")
for row in data["maintenance"]:
    if row["make"] != "Chevrolet":
        continue
    interval = []
    if row["distanceIntervalMiles"]:
        interval.append(f'{row["distanceIntervalMiles"]:,} miles')
    if row["monthInterval"]:
        interval.append(f'{row["monthInterval"]} months')
    paragraph(f'{row["task"]}: {" / ".join(interval)}. '
              f'{row["serviceCondition"]} service. {row["qualifiers"]} '
              f'[{row["sourceLocator"]}]')
heading("Tesla Model 3: current 2024+ manual, partial maintenance")
paragraph("Official North American online manual. Root identifies 2024+ and "
          "software version 2026.32. These are current recommendations, not an "
          "archived 2024 factory schedule. Confirm the individual vehicle manual.")
for row in data["maintenance"]:
    if row["make"] != "Tesla":
        continue
    interval = []
    if row["distanceIntervalMiles"]:
        interval.append(f'{row["distanceIntervalMiles"]:,} miles')
    if row["monthInterval"]:
        interval.append(f'{row["monthInterval"]} months')
    paragraph(f'{row["task"]}: {" / ".join(interval)}. {row["qualifiers"]}')
paragraph("The Tesla brake-fluid numeric interval disappeared in extracted "
          "text, so it is not included or guessed. Ford Mustang maintenance "
          "also remains unverified: the attempted direct PDF returned HTML.")

new_page()
heading("Selected external owner-reported problems")
paragraph("The following numeric failure-mileage values were checked against "
          "explicit NHTSA complaint statements. The selected clauses do not "
          "print a distance unit, and the API has no structured failure-mileage "
          "field. Unit confirmation remains pending: do not publish them with "
          "a miles label yet. Exact values are preserved, including the value 4.")
for row in data["complaints"]:
    value = f'{row["reportedFailureMileageValue"]:,}'
    if row["approximate"]:
        value = "approximately " + value
    paragraph(f'2024 {row["make"]} {row["model"]} | ODI {row["odiNumber"]} | '
              f'Reported failure-mileage value: {value}. '
              f'Filed {row["filedDate"]}; incident {row["incidentDate"]}. '
              f'{row["reportedSymptom"]}')
    if row["dataQualityNote"]:
        paragraph("Quality flag: " + row["dataQualityNote"])
paragraph("No repair costs, reliability scores, typical onset range, failure "
          "rate or verified diagnosis is inferred from these records. Records "
          "remain external reports, not submissions to AutoResearch.")

new_page()
heading("Official maintenance-source directories")
paragraph("Directory checks identify where to obtain evidence. They do not "
          "verify every manual, historical year, service interval or use right.")
for row in data["sourceDirectories"]:
    line(", ".join(row["brands"]), bold=True)
    paragraph(row["url"])
    paragraph(row["note"])

new_page()
heading("Exact evidence and source-use links")
links = [
    ("Chevrolet manual", data["maintenance"][0]["sourceUrl"]),
    ("Chevrolet terms", "https://www.chevrolet.com/user-guide-lines"),
    ("Tesla maintenance chapter", data["maintenance"][-1]["sourceUrl"]),
    ("Tesla website copyright policy",
     "https://www.tesla.com/legal/additional-resources"),
    ("Ford terms", "https://corporate.ford.com/help/terms"),
    ("NHTSA dataset / public-domain declaration",
     data["complaints"][0]["rightsUrl"]),
]
links.extend((f'NHTSA 2024 {r["make"]} {r["model"]}', r["sourceUrl"])
             for r in data["complaintQueryCounts"])
for label, url in links:
    line(label, bold=True)
    start_y = y - 9
    paragraph(url)
    page.insert_link({"kind": pymupdf.LINK_URI, "from": pymupdf.Rect(
        42, start_y, 552, y), "uri": url})
heading("Files and safe next steps")
paragraph("The companion CSVs list maintenance facts, complaint facts, source "
          "directories and every catalog profile's research status. JSON is "
          "the full structured ledger. No original manuals, screenshots, "
          "narratives, VINs or personal information are distributed.")
paragraph("Before any app integration, preserve calendar intervals, "
          "whichever-first triggers and service conditions. The current "
          "canonical maintenance read-model only exposes mileage. Do not "
          "replace time-only intervals with invented mileage or flatten "
          "conditional engine/4WD/severe-service scope.")
for index, report_page in enumerate(document):
    report_page.insert_text((42, 819), f"Review draft | Page {index + 1} of "
                            f"{len(document)} | Not a publication release", fontsize=8)
document.set_metadata({"title": "AutoResearch maintenance and reported-problem review",
                       "author": "AutoResearch", "subject": "First partial evidence batch"})
pdf = root / "research-review.pdf"
document.save(pdf, garbage=4, deflate=True)
assert all(len(p.get_text()) > 50 for p in document)
with zipfile.ZipFile(root / "research-review-bundle.zip", "w",
                     zipfile.ZIP_DEFLATED) as archive:
    for name in ["README.md", "batch-2026-10-05.json", "maintenance-facts.csv",
                 "reported-problem-evidence.csv", "catalog-research-coverage.csv",
                 "source-directories.csv", "research-review.pdf"]:
        archive.write(root / name, arcname=name)
preview = pathlib.Path("/tmp/auto-maintenance-review/report-preview.png")
document[0].get_pixmap(matrix=pymupdf.Matrix(1.4, 1.4)).save(preview)
print(f"Validated 4,661 coverage rows, 12 maintenance facts and six complaint records.")
print(f"Report: {pdf} ({len(document)} pages); preview: {preview}")
