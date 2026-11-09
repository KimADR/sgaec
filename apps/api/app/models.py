from datetime import date, datetime
from typing import Literal
from zoneinfo import ZoneInfo

from pydantic import BaseModel, ConfigDict, Field, field_validator

ANTANANARIVO = ZoneInfo("Indian/Antananarivo")


def _today_in_antananarivo(now: datetime | None = None) -> date:
    return (now or datetime.now(ANTANANARIVO)).astimezone(ANTANANARIVO).date()


class InputBase(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    last_name: str = Field(min_length=2, max_length=120)
    first_names: str = Field(min_length=2, max_length=160)
    birth_date: date
    district: str = Field(min_length=2, max_length=140)
    father_name: str = Field(default="", max_length=160)
    mother_name: str = Field(default="", max_length=160)

    @field_validator("birth_date")
    @classmethod
    def check_birth_date(cls, value: date) -> date:
        if value > _today_in_antananarivo() or value.year < 1900:
            raise ValueError("Date de naissance non valide")
        return value


class LoginRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=False, extra="forbid")

    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=256)


class BirthTransition(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    status: Literal["IN_REVIEW", "VALIDATED", "REJECTED", "ISSUED"]
    reason: str = Field(default="", max_length=500)


class CinTransition(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    status: Literal["IN_REVIEW", "VALIDATED", "REJECTED", "ISSUED"]
    reason: str = Field(default="", max_length=500)


class CinEvidenceUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    has_birth_certificate: bool
    has_residence_proof: bool
    photos_count: int = Field(ge=0, le=8)


class UserCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    username: str = Field(min_length=3, max_length=80, pattern=r"^[A-Za-z0-9._-]+$")
    full_name: str = Field(min_length=2, max_length=160)
    password: str = Field(min_length=16, max_length=256)
    role_code: str = Field(min_length=2, max_length=64, pattern=r"^[A-Z0-9_]+$")
    centre_id: str | None = Field(default=None, min_length=1, max_length=64)


class BirthCreate(InputBase):
    sex: Literal["M", "F"]
    nationality: str = Field(default="Malagasy", min_length=2, max_length=80)
    municipality: str = Field(min_length=2, max_length=140)
    place_of_birth: str = Field(min_length=2, max_length=160)
    address: str = Field(default="", max_length=220)
    declarant_name: str = Field(default="", max_length=160)


class CitizenCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    last_name: str = Field(min_length=2, max_length=120)
    first_names: str = Field(min_length=2, max_length=160)
    sex: Literal["M", "F"]
    birth_date: date
    nationality: str = Field(default="Malagasy", min_length=2, max_length=80)
    birth_place: str = Field(min_length=2, max_length=160)

    @field_validator("birth_date")
    @classmethod
    def check_birth_date(cls, value: date) -> date:
        if value > _today_in_antananarivo() or value.year < 1900:
            raise ValueError("Date de naissance non valide")
        return value


class CitizenUpdate(CitizenCreate):
    pass


class CinCreate(InputBase):
    birth_place: str = Field(min_length=2, max_length=160)
    address: str = Field(min_length=5, max_length=220)
    profession: str = Field(default="", max_length=100)
    has_birth_certificate: bool = False
    has_residence_proof: bool = False
    photos_count: int = Field(default=0, ge=0, le=8)
