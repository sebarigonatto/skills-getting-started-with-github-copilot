from fastapi.testclient import TestClient
import pytest

from src.app import app, activities


@pytest.fixture(autouse=True)
def reset_activities():
    # Make a shallow copy of participants to restore after each test
    original = {k: v.copy() for k, v in activities.items()}
    yield
    # restore participants lists
    for k in activities:
        activities[k]["participants"] = original[k]["participants"].copy()


def test_get_activities():
    client = TestClient(app)
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # Expect some known activity keys
    assert "Chess Club" in data


def test_signup_and_unregister():
    client = TestClient(app)
    activity = "Chess Club"
    email = "pytest-user@example.com"

    # Ensure not already in participants
    assert email not in activities[activity]["participants"]

    # Signup
    signup_resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert signup_resp.status_code == 200
    assert email in activities[activity]["participants"]

    # Signup again should error (already signed up)
    signup_resp2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert signup_resp2.status_code == 400

    # Unregister
    unregister_resp = client.post(f"/activities/{activity}/unregister?email={email}")
    assert unregister_resp.status_code == 200
    assert email not in activities[activity]["participants"]

    # Unregister again should error
    unregister_resp2 = client.post(f"/activities/{activity}/unregister?email={email}")
    assert unregister_resp2.status_code == 400
