from datetime import datetime

import re

from pydantic import BaseModel, ConfigDict, field_validator, model_validator
from pydantic.alias_generators import to_camel


class ReportBase(BaseModel):
    """Accept camelCase field names (as the frontend sends them) while
    keeping snake_case internally."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    title: str
    type: str
    status: str = "ready"

    city: str | None = None
    coverage: str | None = None
    period_start: str | None = None
    period_end: str | None = None
    prepared_by: str | None = None
    area: str | None = None
    auto_priority_areas: bool = False
    datasets: list[str] = []
    areas: list[str] = []
    sections: list[str] = []
    recommendations: str = ""

    avg_surface_temp: float | None = None
    peak_temp: float | None = None
    peak_area: str | None = None
    critical_count: int | None = None
    high_count: int | None = None
    moderate_count: int | None = None
    avg_canopy: float | None = None
    mitigation_projects: int | None = None

    generated_at: datetime | None = None


class ReportCreate(ReportBase):
    pass


class ReportAttestationMessage(BaseModel):
    """Everything the frontend needs to attest a report on Stellar.

    `hash` is the server-authoritative SHA-256 of `canonical_payload` —
    the frontend signs/invokes with this hash instead of recomputing one.
    """

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    report_id: str
    hash: str
    canonical_payload: str


class ReportAttestationCreate(BaseModel):
    """Payload the frontend sends after a confirmed Soroban invocation."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    report_hash: str
    tx_hash: str
    contract_id: str
    network: str = "testnet"
    wallet: str
    meta: dict | None = None

    @field_validator("report_hash")
    @classmethod
    def _hash_shape(cls, value: str) -> str:
        if not re.fullmatch(r"[0-9a-f]{64}", value):
            raise ValueError("reportHash must be 64 lowercase hex characters (SHA-256).")
        return value

    @field_validator("tx_hash")
    @classmethod
    def _tx_shape(cls, value: str) -> str:
        if not re.fullmatch(r"[0-9a-fA-F]{64}", value):
            raise ValueError("txHash must be a 64-character Stellar transaction hash.")
        return value.lower()

    @field_validator("contract_id")
    @classmethod
    def _contract_shape(cls, value: str) -> str:
        if not re.fullmatch(r"C[A-Z2-7]{55}", value):
            raise ValueError("contractId must be a 56-character Soroban contract id (C…).")
        return value

    @field_validator("wallet")
    @classmethod
    def _wallet_shape(cls, value: str) -> str:
        if not re.fullmatch(r"G[A-Z2-7]{55}", value):
            raise ValueError("wallet must be a 56-character Stellar account id (G…).")
        return value

    @field_validator("network")
    @classmethod
    def _testnet_only(cls, value: str) -> str:
        # INIT.AI attestations are Testnet-only by policy.
        if value != "testnet":
            raise ValueError("Only the 'testnet' network is supported.")
        return value


class ReportAttestationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    id: int
    report_id: int
    stellar_hash: str
    tx_hash: str
    contract_id: str
    network: str
    wallet: str
    status: str
    meta: dict | None = None
    last_verified_at: datetime | None = None
    created_at: datetime


class ReportUpdate(BaseModel):
    """Partial update — only provided fields are written."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="ignore")

    title: str | None = None
    type: str | None = None
    status: str | None = None
    city: str | None = None
    coverage: str | None = None
    period_start: str | None = None
    period_end: str | None = None
    prepared_by: str | None = None
    area: str | None = None
    auto_priority_areas: bool | None = None
    datasets: list[str] | None = None
    areas: list[str] | None = None
    sections: list[str] | None = None
    recommendations: str | None = None
    avg_surface_temp: float | None = None
    peak_temp: float | None = None
    peak_area: str | None = None
    critical_count: int | None = None
    high_count: int | None = None
    moderate_count: int | None = None
    avg_canopy: float | None = None
    mitigation_projects: int | None = None
    generated_at: datetime | None = None


class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, alias_generator=to_camel, populate_by_name=True)

    id: int
    title: str
    type: str
    status: str
    created_at: datetime
    barangay_name: str | None = None

    city: str | None = None
    coverage: str | None = None
    period_start: str | None = None
    period_end: str | None = None
    prepared_by: str | None = None
    area: str | None = None
    auto_priority_areas: bool = False
    datasets: list[str] = []
    areas: list[str] = []
    sections: list[str] = []
    recommendations: str = ""

    avg_surface_temp: float | None = None
    peak_temp: float | None = None
    peak_area: str | None = None
    critical_count: int | None = None
    high_count: int | None = None
    moderate_count: int | None = None
    avg_canopy: float | None = None
    mitigation_projects: int | None = None

    generated_at: datetime | None = None

    # Display fields the frontend table expects. `date` is the generated-on
    # date; `area` falls back to the legacy barangay for seeded rows.
    date: str = ""

    @model_validator(mode="after")
    def fill_display_fields(self) -> "ReportOut":
        if not self.area:
            if self.barangay_name:
                self.area = self.barangay_name
            elif self.city:
                self.area = f"{self.city} ({self.coverage or 'All Areas'})"
        if not self.date:
            self.date = self.created_at.strftime("%b %d, %Y")
        return self