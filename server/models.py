from __future__ import annotations
from typing import Annotated, Literal, Union, Any
from pydantic import BaseModel, Discriminator, Tag


class Module(BaseModel):
    ns_type: Literal['module'] = 'module'
    name: str
    full_path: str


def get_discriminator_value(v: Any) -> str | None:
    if isinstance(v, dict):
        return v.get('ns_type') # type: ignore
    return getattr(v, 'ns_type')


class NamespaceTree(BaseModel):
    ns_type: str = 'tree'
    children: list[
            Annotated[
                Union[
                    Annotated[Module, Tag('module')],
                    Annotated[Package, Tag('package')]
                ],
                Discriminator(get_discriminator_value)
            ]
        ]

class Package(NamespaceTree):
    ns_type: str = 'package'
    name: str
    full_path: str