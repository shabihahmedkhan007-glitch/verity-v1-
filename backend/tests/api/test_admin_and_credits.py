"""Tests for credits ledger, run credit gating, and admin user creation."""

import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from test_sse_and_routes import code_hash
from verity.api.app import create_app
from verity.config import AuthConfig, LimitsConfig
from verity.contracts import CreateRunRequest
from verity.core.parse import live_families
from verity.llm.fake import FakeProvider
from verity.research import FakeSearchAdapter, ResearchService
from verity.runs.manager import RunManager
from verity.store import SqliteStore
from verity_test_support import FakeToolRunner, make_settings


def client_for(tmp_path, packs, *, admin_emails=None):
    admin_list = admin_emails or ["admin@verity.com"]
    settings = make_settings(
        tmp_path,
        auth=AuthConfig(
            required=False,
            admin_emails=admin_list,
            initial_credits=3,
        ),
        limits=LimitsConfig(
            concurrent_per_session=5,
            concurrent_global=10,
            runs_per_session_per_hour=10,
        ),
        access_code_hashes=SecretStr(f"team:{code_hash('teamcode')},judge:{code_hash('judgecode')}"),
    )

    store = SqliteStore(settings)
    provider = FakeProvider(settings, delay_s=0.0)
    tools = FakeToolRunner()
    adapter = FakeSearchAdapter()
    research = ResearchService(settings, store, provider, adapter, live_families(packs))
    manager = RunManager(settings, store, provider, tools, packs, research=research, threads=store)
    app = create_app(settings, manager, startup=[store.open], shutdown=[store.close, provider.aclose, research.aclose])
    return TestClient(app)


def test_auth_me_anonymous(tmp_path, packs):
    client = client_for(tmp_path, packs)
    with client:
        res = client.get("/auth/me")
        assert res.status_code == 200
        data = res.json()
        assert data["credits"] == 3
        assert data["isAdmin"] is False
        assert data["anonymous"] is True


def test_auth_me_and_admin_routes_with_team_code(tmp_path, packs):
    client = client_for(tmp_path, packs)
    with client:
        # Team role from access code is recognized as admin
        s_res = client.post("/auth/session", json={"accessCode": "teamcode"})
        assert s_res.status_code == 200
        token = s_res.json()["token"]

        headers = {"Authorization": f"Bearer {token}"}
        me_res = client.get("/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["isAdmin"] is True
        assert me_res.json()["role"] == "team"

        # Admin user creation
        create_res = client.post(
            "/admin/users",
            headers=headers,
            json={"email": "newuser@example.com", "password": "securepassword123", "credits": 5},
        )
        assert create_res.status_code == 201
        created = create_res.json()
        assert created["ok"] is True
        assert created["email"] == "newuser@example.com"
        assert created["credits"] == 5

        # Check credits set for new user
        owner = f"u:{created['userId']}"
        cred_res = client.post(
            "/admin/credits",
            headers=headers,
            json={"owner": owner, "credits": 10},
        )
        assert cred_res.status_code == 200
        assert cred_res.json()["credits"] == 10


def test_admin_routes_forbidden_for_non_admin(tmp_path, packs):
    client = client_for(tmp_path, packs)
    with client:
        # Judge role is not admin
        s_res = client.post("/auth/session", json={"accessCode": "judgecode"})
        assert s_res.status_code == 200
        token = s_res.json()["token"]

        headers = {"Authorization": f"Bearer {token}"}
        me_res = client.get("/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["isAdmin"] is False

        # Attempt to create user fails with 403
        create_res = client.post(
            "/admin/users",
            headers=headers,
            json={"email": "forbidden@example.com", "password": "password123"},
        )
        assert create_res.status_code == 403
        assert "Admin privileges required" in create_res.json()["error"]


def test_runs_gate_by_credits(tmp_path, packs):
    client = client_for(tmp_path, packs)
    with client:
        # Initial credits = 3
        me_res = client.get("/auth/me")
        assert me_res.json()["credits"] == 3

        # Run 1
        r1 = client.post("/runs", json={"presetId": "add8", "priority": "area", "mode": "fast"})
        assert r1.status_code == 201
        assert client.get("/auth/me").json()["credits"] == 2

        # Run 2
        r2 = client.post("/runs", json={"presetId": "add8", "priority": "area", "mode": "fast"})
        assert r2.status_code == 201
        assert client.get("/auth/me").json()["credits"] == 1

        # Run 3
        r3 = client.post("/runs", json={"presetId": "add8", "priority": "area", "mode": "fast"})
        assert r3.status_code == 201
        assert client.get("/auth/me").json()["credits"] == 0

        # Run 4 is rejected because credits are exhausted
        r4 = client.post("/runs", json={"presetId": "add8", "priority": "area", "mode": "fast"})
        assert r4.status_code == 429
        data = r4.json()
        assert data["reason"] == "credits_exhausted"
        assert "You have used all your run credits" in data["error"]
