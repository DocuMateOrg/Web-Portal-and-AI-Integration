-- Default group + permissions so requirePerm() works for every new user
INSERT INTO groups(id, name, description) VALUES (1,'Default','Everyone starts here') ON CONFLICT DO NOTHING;
INSERT INTO permissions(name, description) VALUES
  ('upload','Upload documents'),('process','Save OCR/summary results'),('share','Share documents')
ON CONFLICT DO NOTHING;
INSERT INTO group_permissions(group_id, permission_id)
  SELECT 1, id FROM permissions ON CONFLICT DO NOTHING;
-- dev user 1 (used when Firebase is not configured)
INSERT INTO users(id, firebase_uid, email) VALUES (1,'dev-user','dev@local') ON CONFLICT DO NOTHING;
INSERT INTO user_groups(user_id, group_id) VALUES (1,1) ON CONFLICT DO NOTHING;
SELECT setval('groups_id_seq', GREATEST((SELECT max(id) FROM groups),1));
SELECT setval('users_id_seq',  GREATEST((SELECT max(id) FROM users),1));
