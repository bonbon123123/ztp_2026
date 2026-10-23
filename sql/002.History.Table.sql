CREATE TABLE IF NOT EXISTS product_history (id SERIAL PRIMARY KEY,
                                                      product_id INTEGER NOT NULL,
                                                                         action VARCHAR(10) NOT NULL CHECK (action IN ('CREATE',
                                                                                                                       'UPDATE',
                                                                                                                       'DELETE')), old_data JSONB,
                                                                                                                                            new_data JSONB,
                                                                                                                                                     changed_at TIMESTAMPTZ NOT NULL DEFAULT now());


CREATE INDEX IF NOT EXISTS product_history_product_idx ON product_history (product_id);

-- wpisy CREATE dla produktów, które już są w bazie

INSERT INTO product_history (product_id, action, old_data, new_data)
SELECT id,
       'CREATE',
       NULL,
       to_jsonb(p)
FROM products p;


CREATE OR REPLACE FUNCTION log_product_change() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO product_history (product_id, action, old_data, new_data)
    VALUES (NEW.id, 'CREATE', NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO product_history (product_id, action, old_data, new_data)
    VALUES (NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSE
    INSERT INTO product_history (product_id, action, old_data, new_data)
    VALUES (OLD.id, 'DELETE', to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER products_history AFTER
INSERT
OR
UPDATE
OR
DELETE ON products
FOR EACH ROW EXECUTE FUNCTION log_product_change();