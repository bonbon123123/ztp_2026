from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from app.notifications.service.notification_validators import convert_to_utc

def build_push_notification_payload() -> dict:
    scheduled_local = datetime.now(ZoneInfo("Europe/Warsaw")) + timedelta(minutes=10)

    return {
        "content": "Test PUSH notification",
        "channel": "PUSH",
        "recipient": "test",
        "scheduled_at": scheduled_local.replace(tzinfo=None).isoformat(timespec="seconds"),
        "timezone": "Europe/Warsaw",
    }


def build_email_notification_payload() -> dict:
    scheduled_local = datetime.now(ZoneInfo("Europe/Warsaw")) + timedelta(minutes=10)

    return {
        "content": "Test EMAIL notification",
        "channel": "EMAIL",
        "recipient": "test@example.com",
        "scheduled_at": scheduled_local.replace(tzinfo=None).isoformat(timespec="seconds"),
        "timezone": "Europe/Warsaw",
    }


def test_get_notifications_returns_200_and_list(client):
    response = client.get("/api/v1/notifications")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


def test_post_push_notification_creates_record_and_converts_time_to_utc(client):
    payload = build_push_notification_payload()

    create_response = client.post("/api/v1/notifications", json=payload)

    assert create_response.status_code == 201
    created = create_response.json()

    assert created["content"] == payload["content"]
    assert created["channel"] == payload["channel"]
    assert created["recipient"] == "test"
    assert created["timezone"] == payload["timezone"]
    assert created["status"] == "PENDING"
    assert "id" in created
    assert "created_at" in created

    expected_utc = convert_to_utc(
        datetime.fromisoformat(payload["scheduled_at"]),
        payload["timezone"],
    )

    assert created["scheduled_at"] == expected_utc.isoformat().replace("+00:00", "Z")

    get_response = client.get("/api/v1/notifications")
    assert get_response.status_code == 200

    notifications = get_response.json()
    assert any(n["id"] == created["id"] for n in notifications)


def test_post_email_notification_creates_record_and_is_visible_on_get(client):
    payload = build_email_notification_payload()

    create_response = client.post("/api/v1/notifications", json=payload)

    assert create_response.status_code == 201
    created = create_response.json()

    assert created["content"] == payload["content"]
    assert created["channel"] == payload["channel"]
    assert created["recipient"] == payload["recipient"]
    assert created["timezone"] == payload["timezone"]
    assert created["status"] == "PENDING"

    get_response = client.get(f"/api/v1/notifications/{created['id']}")
    assert get_response.status_code == 200

    fetched = get_response.json()
    assert fetched["id"] == created["id"]
    assert fetched["content"] == payload["content"]
    assert fetched["channel"] == payload["channel"]
    assert fetched["recipient"] == payload["recipient"]
    assert fetched["status"] == "PENDING"


def test_send_now_push_notification_changes_status_to_sent(client):
    payload = build_push_notification_payload()

    create_response = client.post("/api/v1/notifications", json=payload)
    assert create_response.status_code == 201

    notification_id = create_response.json()["id"]

    send_response = client.post(f"/api/v1/notifications/{notification_id}/send-now")
    assert send_response.status_code == 200

    sent = send_response.json()
    assert sent["id"] == notification_id
    assert sent["channel"] == "PUSH"
    assert sent["recipient"] == "test"
    assert sent["status"] == "SENT"

    get_response = client.get(f"/api/v1/notifications/{notification_id}")
    assert get_response.status_code == 200
    fetched = get_response.json()
    assert fetched["status"] == "SENT"


def test_send_now_email_notification_changes_status_to_sent(client):
    payload = build_email_notification_payload()

    create_response = client.post("/api/v1/notifications", json=payload)
    assert create_response.status_code == 201

    notification_id = create_response.json()["id"]

    send_response = client.post(f"/api/v1/notifications/{notification_id}/send-now")
    assert send_response.status_code == 200

    sent = send_response.json()
    assert sent["id"] == notification_id
    assert sent["channel"] == "EMAIL"
    assert sent["recipient"] == payload["recipient"]
    assert sent["status"] == "SENT"

    get_response = client.get(f"/api/v1/notifications/{notification_id}")
    assert get_response.status_code == 200
    fetched = get_response.json()
    assert fetched["status"] == "SENT"


def test_post_notification_rejects_past_scheduled_at(client):
    payload = {
        "content": "Past notification",
        "channel": "PUSH",
        "recipient": "test",
        "scheduled_at": (datetime.now() - timedelta(minutes=5)).isoformat(timespec="seconds"),
        "timezone": "Europe/Warsaw",
    }

    response = client.post("/api/v1/notifications", json=payload)

    assert response.status_code == 422
    body = response.json()
    assert body["detail"] == "Planowana data wysyłki musi wskazywać przyszły moment."


def test_send_now_for_already_sent_notification_returns_422(client):
    payload = build_push_notification_payload()

    create_response = client.post("/api/v1/notifications", json=payload)
    assert create_response.status_code == 201

    notification_id = create_response.json()["id"]

    first_send_response = client.post(f"/api/v1/notifications/{notification_id}/send-now")
    assert first_send_response.status_code == 200
    assert first_send_response.json()["status"] == "SENT"

    second_send_response = client.post(f"/api/v1/notifications/{notification_id}/send-now")
    assert second_send_response.status_code == 422

    body = second_send_response.json()
    assert body["detail"] == "Wykonać można wyłącznie powiadomienie w statusie PENDING."