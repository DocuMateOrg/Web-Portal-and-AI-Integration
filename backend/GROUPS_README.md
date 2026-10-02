Group-based Access Control (RBAC)

Endpoints added:
- POST /api/groups           -> create group (body: { name, description })
- POST /api/groups/permissions -> create permission (body: { name, description })
- POST /api/groups/:groupId/users/:userId -> assign user to group
- POST /api/groups/:groupId/permissions/:permId -> assign permission to group

Usage notes:
- Simple auth middleware expects `X-User-Id` header containing a numeric user id.
- Use the permissions middleware helper by name, e.g. `requirePerm('upload')`.

Bootstrap example (psql):
INSERT INTO permissions(name,description) VALUES('upload','Upload documents'),('process','Process documents');
INSERT INTO groups(name) VALUES('admins');
-- assign permission id 1 to group id 1
INSERT INTO group_permissions(group_id,permission_id) VALUES(1,1);
