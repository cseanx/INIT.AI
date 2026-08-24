import sys

sys.path.insert(0, ".")
from app.services import stellar_verify as sv  # noqa: E402

CID = "CBQSI2TXAXWNRBPFT457JVH5IUVWKR72XMNQFTSPHDUWRRV76SBDUBXF"
HASH = "923ab672b27d2dbd805a233f25c2e3cc46e4ee9e3ad6ff46b23c294d133507a4"
TX = "431266e6e39da647c15873385568952cd1dd8881346452bdec407cf1fbe40b89"
WALLET = "GBBU32EB3VNOIGDS6GUJ6JWWONQ6NP73BRG6IVE5D4BV3LCTYEJJFAHY"

# positive
result = sv.verify_attest_transaction(
    TX, expected_contract_id=CID, expected_hash_hex=HASH,
    expected_report_ref="7", expected_wallet=WALLET,
)
print("positive:", result)

# negative: wrong report ref
try:
    sv.verify_attest_transaction(TX, expected_contract_id=CID, expected_hash_hex=HASH,
                                 expected_report_ref="999", expected_wallet=WALLET)
    print("NEGATIVE FAILED: wrong ref accepted")
except sv.TransactionVerificationError as e:
    print("wrong ref rejected:", str(e)[:50])

# negative: wrong wallet (claiming someone else's tx)
try:
    sv.verify_attest_transaction(TX, expected_contract_id=CID, expected_hash_hex=HASH,
                                 expected_report_ref="7",
                                 expected_wallet="GBBU32EB3VNOIGDS6GUJ6JWWONQ6NP73BRG6IVE5D4BV3LCTYEJJFAH")
    print("NEGATIVE FAILED: wrong wallet accepted")
except (sv.TransactionVerificationError, ValueError):
    print("wrong wallet rejected")

# negative: fabricated tx hash
try:
    sv.verify_attest_transaction("c" * 64, expected_contract_id=CID, expected_hash_hex=HASH,
                                 expected_report_ref="7", expected_wallet=WALLET)
    print("NEGATIVE FAILED: fake tx accepted")
except sv.TransactionVerificationError as e:
    print("fake tx rejected:", str(e)[:40])