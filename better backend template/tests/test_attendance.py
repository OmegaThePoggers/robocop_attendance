import pytest


@pytest.mark.asyncio
async def test_create_session_requires_teacher(async_client):
    response = await async_client.post("/attendance-sessions/", json={"class_id": "fake-id"})
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_session_results_requires_auth(async_client):
    response = await async_client.get("/attendance-sessions/fake-id/results")
    assert response.status_code in (401, 403)
