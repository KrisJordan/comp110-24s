from __future__ import annotations


class OverloadInt:
    x: int

    def __init__(self, x: int):
        self.x = x

    def __repr__(self) -> str:
        return f"OverloadInt({self.x})"

    def __mul__(self, rhs: int | OverloadInt) -> OverloadInt:
        print("__mul__ called")
        if isinstance(rhs, OverloadInt):
            return OverloadInt(self.x * rhs.x)
        else:
            return OverloadInt(self.x * rhs)

    def __imul__(self, rhs: int) -> OverloadInt:
        print("__imul__ called")
        return self * rhs


y = OverloadInt(2)
x = y
print(f"y * 2: {y * 2}")
print(f"y: {y}")
y *= 2
print(f"y: {y}")
print(f"x: {x}")
