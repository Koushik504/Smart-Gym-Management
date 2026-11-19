-- Add regular member logins without changing existing staff accounts or records.
ALTER TABLE sg_users MODIFY role ENUM('ADMIN','TRAINER','USER') NOT NULL;
ALTER TABLE sg_members ADD COLUMN userId INT NULL,
  ADD UNIQUE INDEX sg_members_userId_key(userId),
  ADD CONSTRAINT sg_members_userId_fkey FOREIGN KEY(userId) REFERENCES sg_users(id) ON DELETE SET NULL ON UPDATE CASCADE;
