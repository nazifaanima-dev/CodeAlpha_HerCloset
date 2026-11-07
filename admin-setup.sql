USE hercloset;

-- Safe to run once or again: add users.role only when it is missing.
SET @role_column_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
);
SET @role_sql = IF(
  @role_column_exists = 0,
  'ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT ''customer''',
  'SELECT ''users.role already exists'' AS message'
);
PREPARE role_stmt FROM @role_sql;
EXECUTE role_stmt;
DEALLOCATE PREPARE role_stmt;

-- Optional manual promotion if you prefer not to use ADMIN_EMAIL in .env:
-- UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
