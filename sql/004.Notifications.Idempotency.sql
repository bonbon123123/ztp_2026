-- Etap 2.3: identyfikator operacji (idempotency_key) generowany przez serwer
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR;

-- istniejące wiersze dostają klucz techniczny, żeby można było dodać NOT NULL
UPDATE notifications SET idempotency_key = 'notif_legacy_' || id WHERE idempotency_key IS NULL;

ALTER TABLE notifications ALTER COLUMN idempotency_key SET NOT NULL;
ALTER TABLE notifications ADD CONSTRAINT notifications_idempotency_key_unique UNIQUE (idempotency_key);
