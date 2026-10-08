"""Inspect relevant pages privately; do not redistribute the manual or its images."""
import hashlib
import json
import pathlib
import urllib.request
import urllib.error

import pymupdf

URL = "https://www.fordservicecontent.com/Ford_Content/Catalog/owner_information/2024_Ford_Mustang_Owners_Manual_version_1_om_EN-US.pdf"
TEMP = pathlib.Path("/tmp/full-profile-mustang-manual")
TEMP.mkdir(exist_ok=True)
request = urllib.request.Request(URL, headers={"User-Agent": "AutoResearch private fact review"})
try:
    with urllib.request.urlopen(request, timeout=90) as response:
        data = response.read()
except urllib.error.HTTPError as error:
    result = {"source_url": URL, "get_status": error.code, "facts_verified": 0,
              "verdict": "Retrieval blocked; HEAD metadata alone does not verify document content. No retry or access-control bypass."}
    pathlib.Path("research/profile-information-audit/mustang-manual-inspection.json").write_text(json.dumps(result, indent=2) + "\n")
    raise
if not data.startswith(b"%PDF"):
    raise RuntimeError("Source returned something other than a PDF; no facts verified.")
pdf = TEMP / "manual.pdf"
pdf.write_bytes(data)
document = pymupdf.open(pdf)
found = []
for page_index, page in enumerate(document):
    text = page.get_text()
    if "15.9" in text or ("octane" in text.lower() and "87" in text):
        image = TEMP / f"page-{page_index + 1}.png"
        page.get_pixmap(matrix=pymupdf.Matrix(1.4, 1.4)).save(image)
        found.append({"pdf_page": page_index + 1, "temporary_image": str(image)})
        print(f"\nPDF PAGE {page_index + 1}\n{text}", flush=True)
result = {
    "source_url": URL,
    "pdf_sha256": hashlib.sha256(data).hexdigest(),
    "pdf_bytes": len(data),
    "pdf_pages": len(document),
    "candidate_pages": found,
    "verdict": "Awaiting visual inspection; source content returned successfully. Reuse permission not decided by this script.",
}
pathlib.Path("research/profile-information-audit/mustang-manual-inspection.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
