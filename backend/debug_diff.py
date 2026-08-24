import sys

sys.path.insert(0, ".")
from app.services import stellar_verify as sv  # noqa: E402

CID = "CBQSI2TXAXWNRBPFT457JVH5IUVWKR72XMNQFTSPHDUWRRV76SBDUBXF"
HASH = "923ab672b27d2dbd805a233f25c2e3cc46e4ee9e3ad6ff46b23c294d133507a4"
TX = "431266e6e39da647c15873385568952cd1dd8881346452bdec407cf1fbe40b89"
WALLET = "GBBU32EB3VNOIGDS6GUJ6JWWONQ6NP73BRG6IVE5D4BV3LCTYEJJFAHY"

tx = sv._horizon_get(f"/transactions/{TX}")
operations = sv._horizon_get(tx["_links"]["operations"]["href"].split("{")[0] + "?limit=10")
required = {
    sv.scv_symbol_b64("attest"),
    sv.scv_bytes_b64(HASH),
    sv.scv_string_b64("7"),
    sv.scv_address_b64(WALLET),
}
for op in operations["_embedded"]["records"]:
    if op.get("type") != "invoke_host_function":
        continue
    provided = {p.get("value") for p in op.get("parameters") or []}
    print("missing:", required - provided)
    print("extra params count:", len(provided))
