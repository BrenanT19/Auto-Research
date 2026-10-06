"""Inspect a source PDF in temporary storage; never retain manuals in the project."""
import argparse
import hashlib
import pathlib
import urllib.request

import pymupdf as fitz

parser = argparse.ArgumentParser()
parser.add_argument("url")
parser.add_argument("--name", required=True)
parser.add_argument("--match", default="NORMAL SCHEDULED MAINTENANCE")
args = parser.parse_args()
with urllib.request.urlopen(args.url, timeout=90) as response:
    data = response.read(30_000_001)
if len(data) > 30_000_000 or not data.startswith(b"%PDF-"):
    raise ValueError("Expected a directly retrieved PDF under 30 MB, not fallback HTML")
document = fitz.open(stream=data, filetype="pdf")
out = pathlib.Path("/tmp/auto-maintenance-review")
out.mkdir(exist_ok=True)
print("SHA-256:", hashlib.sha256(data).hexdigest(), "pages:", len(document))
matches = [index for index, page in enumerate(document)
           if args.match.casefold() in page.get_text().casefold()]
indices = sorted({index for match in matches[-4:] for index in range(
    max(0, match - 1), min(len(document), match + 3))})
for index in indices:
    page = document[index]
    image = out / f"{args.name}-pdf-page-{index + 1}.png"
    page.get_pixmap(matrix=fitz.Matrix(1.3, 1.3)).save(image)
    print(f"\nPDF page {index + 1}; image {image}\n{page.get_text()[:8500]}")
