import pytest


@pytest.mark.asyncio
async def test_create_student_requires_admin(async_client):
    """Creating a student without an admin token should fail."""
    response = await async_client.post(
        "/students/",
        json={"email": "s1@test.com", "password": "pass123", "name": "S One", "sap_id": "SAP001"},
    )
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_list_students_requires_auth(async_client):
    response = await async_client.get("/students/")
    assert response.status_code in (401, 403)
