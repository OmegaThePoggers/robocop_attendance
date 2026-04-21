import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from main import app
from core.database import get_db, Base

TEST_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/attendance_test"
engine_test = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSession = async_sessionmaker(bind=engine_test, class_=AsyncSession, expire_on_commit=False)


async def override_get_db():
    async with TestSession() as session:
        yield session


app.dependency_overrides[get_db] = override_get_db


@pytest_asyncio.fixture(scope="module")
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client


@pytest.mark.asyncio
async def test_health(async_client):
    response = await async_client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.asyncio
async def test_login_invalid_credentials(async_client):
    response = await async_client.post(
        "/auth/login", json={"email": "nobody@test.com", "password": "wrong"}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_requires_auth(async_client):
    response = await async_client.get("/auth/me")
    assert response.status_code in (401, 403)
