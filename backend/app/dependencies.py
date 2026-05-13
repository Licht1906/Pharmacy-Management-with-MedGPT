from fastapi import Header
from typing import Optional

class CurrentUser:
    def __init__(self, role: str, store_id: int, employee_id: int):
        self.role = role
        self.store_id = store_id
        self.employee_id = employee_id

def get_current_user(
    x_role: Optional[str] = Header(None, alias="X-Role"),
    x_store_id: Optional[int] = Header(None, alias="X-Store-ID"),
    x_employee_id: Optional[int] = Header(None, alias="X-Employee-ID")
) -> Optional[CurrentUser]:
    if x_role and x_store_id is not None and x_employee_id is not None:
        return CurrentUser(role=x_role, store_id=x_store_id, employee_id=x_employee_id)
    return None
