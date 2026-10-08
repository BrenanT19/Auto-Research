"""Generate read-only verification deliverables from the completed profile census."""
import collections
import csv
import html
import json
import pathlib
import re

ROOT = pathlib.Path("research")
AUDIT = ROOT / "profile-information-audit"


def rows(name):
    with (AUDIT / name).open(newline="", encoding="utf-8") as file:
        return list(csv.DictReader(file))


def inline(text):
    value = html.escape(text)
    value = re.sub(r"`([^`]+)`", r"<code>\1</code>", value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", value)
    value = re.sub(r"\[\[(\d+)\]\]\(([^ \t]+)\)", r'<a href="\2">[\1]</a>', value)
    value = re.sub(r"\[([^\]]+)\]\(([^ \t]+)\)", r'<a href="\2">\1</a>', value)
    return value


def make_html(markdown, title):
    blocks, paragraph, list_kind = [], [], None
    source_section = False
    lines = markdown.splitlines()
    index = 0

    def flush():
        nonlocal paragraph, list_kind
        if paragraph:
            blocks.append("<p>" + inline(" ".join(paragraph)) + "</p>")
            paragraph = []
        if list_kind:
            blocks.append("</" + list_kind + ">")
            list_kind = None

    while index < len(lines):
        line = lines[index].strip()
        if not line:
            flush()
        elif line.startswith("#"):
            flush()
            heading = re.match(r"^(#{1,6})\s+(.+)$", line)
            level, text = len(heading[1]), heading[2]
            source_section = text == "Sources" or (source_section and level > 2)
            blocks.append(f"<h{level}>{inline(text)}</h{level}>")
        elif line.startswith("|"):
            flush()
            table = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                cells = [cell.strip() for cell in lines[index].strip().strip("|").split("|")]
                if not all(re.fullmatch(r"[-: ]+", cell or " ") for cell in cells):
                    table.append(cells)
                index += 1
            blocks.append("<div class='table'><table>")
            for number, cells in enumerate(table):
                tag = "th" if number == 0 else "td"
                blocks.append("<tr>" + "".join(f"<{tag}>{inline(cell)}</{tag}>" for cell in cells) + "</tr>")
            blocks.append("</table></div>")
            continue
        elif re.match(r"^(\d+\.\s+|-\s+)", line):
            if paragraph:
                blocks.append("<p>" + inline(" ".join(paragraph)) + "</p>")
                paragraph = []
            match = re.match(r"^(\d+)\.\s+(.+)$", line)
            kind = "ol" if match else "ul"
            if list_kind != kind:
                if list_kind:
                    blocks.append("</" + list_kind + ">")
                blocks.append("<" + kind + ">")
                list_kind = kind
            content = match[2] if match else line[2:]
            anchor = f' id="source-{match[1]}"' if source_section and match else ""
            blocks.append(f"<li{anchor}>{inline(content)}</li>")
        else:
            paragraph.append(line)
        index += 1
    flush()
    css = """
    *{box-sizing:border-box}body{margin:0;background:#f3f5f7;color:#17232c;font:16px/1.65 system-ui,sans-serif}
    main{max-width:1080px;margin:36px auto;padding:38px;background:white;border:1px solid #dae1e6}
    h1{font-size:32px;line-height:1.2}h2{margin-top:34px;font-size:24px}h3{font-size:19px}
    a{color:#165a8c;overflow-wrap:anywhere}code{background:#eef2f4;padding:2px 4px;font-size:.9em}
    .table{overflow:auto}table{border-collapse:collapse;width:100%;font-size:14px}
    th,td{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid #d9e0e5}th{background:#edf2f5}
    li{margin:9px 0}@media(max-width:650px){main{margin:0;padding:22px;border:0}h1{font-size:26px}}
    """
    return f"<!doctype html><html lang='en'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>{html.escape(title)}</title><style>{css}</style><main>{''.join(blocks)}</main></html>"


def main():
    summary = json.loads((AUDIT / "summary.json").read_text())
    epa = json.loads((AUDIT / "epa-live-recheck.json").read_text())
    profiles, fields = rows("profiles.csv"), rows("populated-information.csv")
    assert len(profiles) == summary["distinct_profile_count"] == 4715
    assert len({row["profile_id"] for row in profiles}) == len(profiles)
    assert epa["same_hashed_payload"] and not epa["mismatches"]
    issues = rows("structural-issues.csv")
    assert not any(row["issue"] in {"request_failed", "wrong_profile_id", "browse_detail_mismatch"} for row in issues)
    generations = {row["profile_id"] for row in fields if row["field"] == "generation"}
    with (ROOT / "catalog-release-readiness.csv").open(newline="", encoding="utf-8") as file:
        prior = list(csv.DictReader(file))
    assert {row["profile_id"] for row in prior} == {row["profile_id"] for row in profiles}
    counts = {row["profile_id"]: row for row in profiles}
    for row in prior:
        if row["source_id"] == "epa-1984-present":
            row["profile_audit_status"] = "All referenced identity fields match; extracted CSV SHA256 matches catalog source hash; ZIP and CSV hashes are different payloads."
            if int(row["year"]) != 2027:
                row["evidence_and_scope"] = "All referenced EPA identity rows and the extracted CSV checksum match. Dataset identity support is not proof of an exhaustive retail-sales catalog."
        row["api_profile_retrieved"] = "Yes"
        row["browse_identity_matches_detail"] = "Yes"
        row["populated_top_level_information_fields"] = counts[row["profile_id"]]["populated_information_fields"]
        row["has_populated_generation_information"] = "Yes" if row["profile_id"] in generations else "No"
        row["full_factual_verification_complete"] = "No"
        row["release_ready_now"] = "No"
        row["owner_release_approval"] = "Conditional instruction: verify every profile and its information, then prepare publication; not approval for unresolved data."
    for destination in [AUDIT / "profile-dispositions.csv", ROOT / "catalog-release-readiness.csv"]:
        with destination.open("w", newline="", encoding="utf-8") as file:
            writer = csv.DictWriter(file, fieldnames=list(prior[0]))
            writer.writeheader()
            writer.writerows(prior)

    registry = json.loads((ROOT / "sources.json").read_text())
    by_url, by_key = {s["url"]: s for s in registry}, {s["key"]: s for s in registry}

    def cite(url):
        source = by_url[url]
        assert source.get("citationEligible", True), url
        evidence = [source["savedEvidencePath"], *source.get("additionalEvidencePaths", [])]
        assert any(pathlib.Path(path).exists() for path in evidence), url
        return "[@" + source["key"] + "]"

    draft = f"""# All-profile information verification — current results

**Checked:** 2026-10-08 UTC / 2026-10-07 Pacific  
**Status:** Full factual verification is incomplete. No public release was prepared or published.

## What was checked

Every one of the **4,715 distinct development profiles** was retrieved, not just sampled. All profile IDs and make/model/year/trim values matched their Browse records. The census found **14,936 nonempty top-level information fields**, **5,668 claim/source associations**, and **97 distinct external source URLs**. Empty reliability objects with null values were excluded from populated research. These are reproducible local inventory results, not a claim that all facts are verified. [Inventory summary](profile-information-audit/summary.json) · [Field-by-field inventory](profile-information-audit/populated-information.csv)

The request is to verify existing information before publication. Missing research may remain clearly labeled missing; it need not be invented. A model-year identity does not require a complete retail build sheet, and a trim-name preview does not require an exhaustive option matrix unless it claims such facts. Conversely, a populated generation label, fuel specification, or factual overview needs evidence for the actual value and scope displayed.

## Corrected EPA checksum finding

The earlier audit incorrectly compared the ZIP archive checksum with the catalog's extracted-CSV checksum. A fresh download's extracted **vehicles.csv exactly matches the catalog hash**. All **18,764 referenced vehicle rows across 3,639 profiles** were rechecked, with zero ID/make/model/year/base-model mismatches. The source-version discrepancy is therefore resolved, not an outstanding release blocker. [Recheck evidence](profile-information-audit/epa-live-recheck.json) The official dataset page defines its fuel-economy scope; EPA's annual-guide archive and web-services documentation provide their respective file and identifier contexts. {cite('https://www.fueleconomy.gov/feg/download.shtml')} {cite('https://www.epa.gov/compliance-and-fuel-economy-data/test-data-annual-fuel-economy-guide')} {cite('https://www.fueleconomy.gov/feg/ws/index.shtml')}

EPA's default public-domain statement is favorable for EPA-produced data, subject to stated exceptions and dataset metadata. It does not create a blanket requirement for manufacturer permission merely because facts concern their products. Copyright limitations on factual material and source-specific contractual restrictions are different questions. {cite('https://edg.epa.gov/EPA_Data_License.htm')} {cite('https://www.copyright.gov/circs/circ33.pdf')} vPIC's public-use FAQ and API documentation support a narrow agency-query use, not a complete national retail-sales census. {cite('https://vpic.nhtsa.dot.gov/api/home/index/faq')} {cite('https://vpic.nhtsa.dot.gov/api')}

## Remaining factual checks

| Information | Exact result | Remaining issue |
|---|---|---|
| EPA identities | 3,639 profiles / 18,764 reference rows match and CSV hash matches | Record support is scoped to EPA's dataset, not every retail offering |
| Annual-guide identities | Prior check: 488 profiles / 908 locators and six file hashes match | Preserve guide scope and source-specific conditions |
| Historical identities | Seven GM archive-kit titles corroborated; underlying PDFs not inspected | The other 532 identities are not independently corroborated; exact article revisions remain missing |
| MY2027 | 34 all-years identities match; separate workbook has 21 name matches and 13 misses | No exact workbook-ID join established; misses do not mean unavailable vehicles |
| Trim names | Fresh document support for 17 Chevrolet/GMC, 12 Ram and four Lucid labels | Ten other previews lack new original-document checks; exact claimed market scope and source-use conditions remain open |
| Generation information | 699 profiles contain it; 142 bundled era rows were inventoried | No complete interval in that 142-row batch was fully re-verified; three onset claims received limited corroboration |
| Mustang specifications | Final-year EPA evidence supports RWD and 10-speed automatic in its own record scope | Fastback applicability/EcoBoost naming remain partial; exact octane wording and 15.9 U.S. gallons unresolved |

The historical matches are **archive-index titles**, not inspected specification kits. GM's collection and The Henry Ford's bounded production-record holdings cannot by themselves establish every historical year/nameplate claim. {cite('https://www.gm.com/heritage/archive/vehicle-information-kits')} {cite('https://www.thehenryford.org/collections/explore/popular-research-topics/vehicle-production-records')} Wikimedia reuse guidance and the relevant license explain attribution obligations; they do not identify the particular revisions used by this catalog. {cite('https://www.mediawiki.org/wiki/Wikimedia_APIs/Content_reuse')} {cite('https://creativecommons.org/licenses/by-sa/4.0/legalcode.en')}

The separate 2027 workbook remains preliminary-source evidence. Name matching does not establish an exact identifier join, and absence from that workbook cannot prove no U.S. offering. {cite('https://www.fueleconomy.gov/feg/epadata/27data.zip')} The all-years row checks remain valid; the unresolved question is what the profile can truthfully claim about status and scope.

## Trim-source evidence and limits

| Source inspected | What it supports in this pass |
|---|---|
| 2024 Chevrolet Silverado PDF | Nine named trim labels and model year; not an exhaustive configuration matrix {cite('https://media.chevrolet.com/content/dam/Media/images/US/Vehicles/Chevrolet/Trucks/Silverado/2024/2024-Chevrolet-Silverado-033023.pdf')} |
| 2024 GMC Sierra PDF | Eight named trim labels and model year; not every compatible option combination {cite('https://media.gmc.com/content/dam/Media/images/US/Vehicles/GMC/Sierra/2024/2024-GMC-Sierra-1500.pdf')} |
| Ram Heavy Duty press kit and off-road announcement | Seven 2500 / five 3500 grade identities in stated North American scope {cite('https://media.stellantisnorthamerica.com/newsrelease.do?id=25278&mid=69')} {cite('https://media.stellantisnorthamerica.com/newsrelease.do?id=25278&fIId=25845&mid=69')} |
| Ram availability matrix | Combined 2500/3500 cab/bed evidence, not a model-separated U.S. build-sheet matrix {cite('https://s3.amazonaws.com/chryslermedia.iconicweb.com/mediasite/specs/2024_RAM_2500_3500_HD_FA.pdf')} |
| Lucid announcement | Four named Air variants and North American context, with model-year limitations {cite('https://ir.lucidmotors.com/news-releases/news-release-details/lucid-air-model-line-updates-offer-customers-more-freedom-power')} |
| Four EPA Lucid examples | MY2024 Pure RWD, Touring AWD, G Touring XR AWD, Sapphire AWD examples—not every build {cite('https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=47454')} {cite('https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=47839')} {cite('https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=47836')} {cite('https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=47456')} |

Source-host conditions must be applied to the actual site and intended use, not transferred indiscriminately between sibling hosts. The inspected Stellantis North America media terms restrict copying for commercial distribution and distinguish editorial access. {cite('https://media.stellantisnorthamerica.com/page.do?file=legal')} The inspected From The Road terms address that Ford site. {cite('https://www.fromtheroad.ford.com/us/en/terms-and-conditions')} The Lucid IR homepage did not establish a reuse grant; absence of visible terms is not permission. {cite('https://ir.lucidmotors.com/')} These observations do not prove that ordinary normalized vehicle facts need a blanket brand license.

## Generation and Mustang information

Limited independent corroboration supports three refresh onsets: Model S in 2016, U.S. Model 3 Highland in 2024, and Pacifica in MY2021. It does **not** verify their complete end dates or all 142 era intervals. {cite('https://www.consumerreports.org/hybrids-evs/tesla-model-s-gets-facelift-upgraded-equipment')} {cite('https://www.theverge.com/2024/1/10/24032562/tesla-model-3-2024-refresh-us-available-highland')} {cite('https://www.motor1.com/news/397218/2021-chrysler-pacifica-facelift-debut')} Tesla's Model 3 manual selector supports a 2024+ U.S. manual grouping, not every transition detail. {cite('https://www.tesla.com/ownersmanual/index-model-3.html')} Calendar announcement/production dates must not be substituted for model years. {cite('https://www.ecfr.gov/current/title-40/chapter-I/subchapter-C/part-85/subpart-X/section-85.2302')} A prohibited PR Newswire capture and a failed fleet-page retrieval were excluded from evidence.

The final-year EPA Mustang record supplies 2.3L/four-cylinder, 10-speed automatic and rear-drive attributes; it does not establish the retail Fastback-versus-convertible mapping or minimum AKI. {cite('https://fueleconomy.gov/feg/noframes/46646.shtml')} The manual capture exposed relevant headings but not the necessary octane and tank-capacity passages. A second, direct PDF inspection attempt received HTTP 403 despite successful HEAD metadata; its pages were not inspected and no access-control bypass was attempted. [Retrieval result](profile-information-audit/mustang-manual-inspection.json) Neither value is newly verified from that incomplete extraction, and a secondary 16.0-gallon claim is not a basis to silently replace 15.9. {cite('https://www.fordservicecontent.com/Ford_Content/Catalog/owner_information/2024_Ford_Mustang_Owners_Manual_version_1_om_EN-US.pdf')}

The Mustang overview is an authored historical research snapshot. Current government requests again returned **12 recall campaigns**, but now **82 complaints**, compared with its October 3 snapshot's 81. NCAP still returns five-star overall and InvestigationCount 0 for the two-door RWD family. These are not exact-configuration recalls, defect rates, VIN-open status, or a transferred EcoBoost safety rating. A visible snapshot date must accompany the older total. [Saved current responses](profile-information-audit/mustang-complaints-live.json) · [Recall response](profile-information-audit/mustang-recalls-live.json) · [NCAP response](profile-information-audit/mustang-safety-live.json)

## Flag triage and release decision

The 19 automated flags all concern the private Mustang: five unknown-field references whose claims are not exposed, twelve claims with unresolved applicability, and two internally authored notes without external URLs. There are **zero missing claim references on known fields**. Unknown recall/safety/MPG values remain withheld; these flags are not 19 incorrect displayed facts. [Raw flags](profile-information-audit/structural-issues.csv)

Full factual verification remains incomplete, particularly for existing generation information, historical identities, claimed market scope and Mustang details. Missing research and lack of an exhaustive national sales census are **not**, by themselves, reasons to reject a correctly scoped identity profile. The problem is unresolved support for information actually present and its usable provenance. No profile was removed, no optional fact invented, no production data changed, and no publication attempted.

The per-profile output keeps factual-verification completion and release readiness at **No** until the required checks are complete. It records the owner's conditional verification-then-publication instruction rather than an approval to publish unresolved rows. Publishing the current development-preview build would not make these profiles a verified production catalog. [All 4,715 profile dispositions](profile-information-audit/profile-dispositions.csv)
"""
    ordered_keys = list(dict.fromkeys(re.findall(r"\[@([^\]]+)\]", draft)))
    numbers = {key: number for number, key in enumerate(ordered_keys, 1)}
    rendered = re.sub(r"\[@([^\]]+)\]", lambda match: f"[[{numbers[match[1]]}]]({by_key[match[1]]['url']})", draft)
    rendered += "\n## Sources\n\n"
    for key in ordered_keys:
        source = by_key[key]
        paths = [source["savedEvidencePath"], *source.get("additionalEvidencePaths", [])]
        evidence = next((p for p in paths if "full-verification-" in p and pathlib.Path(p).exists()), source["savedEvidencePath"])
        rendered += f"{numbers[key]}. [{source['title'] or key}]({source['url']}) — Published: {source.get('publicationDate') or 'not surfaced'}; {source['tier']}; evidence: `{evidence}`.\n"
    rendered = rendered.replace("**Status:**", f"**Sources cited:** {len(ordered_keys)}  \n**Status:**", 1)
    (ROOT / "profile-information-verification.md").write_text(rendered)
    (ROOT / "profile-information-verification.html").write_text(make_html(rendered, "All-profile information verification"))
    # Rebuild derived reports so their HTML no longer repeats the false checksum claim.
    for name in ["catalog-coverage-report", "catalog-release-readiness"]:
        markdown = (ROOT / (name + ".md")).read_text()
        (ROOT / (name + ".html")).write_text(make_html(markdown, name.replace("-", " ").title()))
    print(json.dumps({"profiles": len(prior), "populated_fields": len(fields), "profiles_with_generation": len(generations), "cited_sources": len(ordered_keys), "release_ready": 0}, indent=2))


if __name__ == "__main__":
    main()
