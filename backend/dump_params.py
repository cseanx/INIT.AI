import base64
import json
import struct
import sys

sys.path.insert(0, ".")
from app.services import stellar_verify as sv  # noqa: E402

WALLET = "GBBU32EB3VNOIGDS6GUJ6JWWONQ6NP73BRG6IVE5D4BV3LCTYEJJFAHY"

tx = sv._horizon_get("/transactions/431266e6e39da647c15873385568952cd1dd8881346452bdec407cf1fbe40b89")
ops = sv._horizon_get(tx["_links"]["operations"]["href"].split("{")[0] + "?limit=10")
op = ops["_embedded"]["records"][0]
params = [p["value"] for p in op["parameters"]]

def cand(label, raw):
    b64 = base64.b64encode(raw).decode()
    print(f"{label:28} {'HIT' if b64 in params else 'no '}  {b64[:44]}")

key = sv.strkey_to_ed25519(WALLET)
cand("addr: sw18+kt0+key", struct.pack(">III", 18, 0, 0) + key)
cand("addr: sw18+key", struct.pack(">I", 18) + key)
cand("addr: sw18+kt0+key+u32", struct.pack(">IIII", 18, 0, 0, 0) + key)
print()
print("params:")
for p in params:
    print("   ", p[:60])