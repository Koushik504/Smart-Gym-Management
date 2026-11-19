-- Read-only routines for the authenticated administrator API.
-- Existing renewal transactions and business rules remain in 002_advanced.sql.
DELIMITER $$
CREATE FUNCTION sg_membership_end(p_member INT) RETURNS DATE
READS SQL DATA
BEGIN
  DECLARE v_end DATE;
  SELECT MAX(s.endsAt) INTO v_end FROM sg_subscriptions s
    JOIN sg_payments p ON p.subscriptionId=s.id
    WHERE s.memberId=p_member AND s.status='ACTIVE' AND p.status='PAID';
  RETURN v_end;
END$$
CREATE FUNCTION sg_is_member_active(p_member INT) RETURNS TINYINT
READS SQL DATA
BEGIN
  RETURN EXISTS(SELECT 1 FROM sg_active_memberships WHERE memberId=p_member);
END$$
CREATE FUNCTION sg_attendance_rate(p_member INT, p_days INT) RETURNS DECIMAL(5,2)
READS SQL DATA
BEGIN
  DECLARE v_visits INT;
  IF p_days IS NULL OR p_days < 1 OR p_days > 365 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Days must be between 1 and 365';
  END IF;
  SELECT COUNT(*) INTO v_visits FROM sg_attendance
    WHERE memberId=p_member AND date BETWEEN DATE_SUB(UTC_DATE(),INTERVAL (p_days-1) DAY) AND UTC_DATE();
  RETURN ROUND(100.0*v_visits/p_days,2);
END$$
CREATE PROCEDURE sg_member_summary(IN p_member INT)
READS SQL DATA
BEGIN
  SELECT m.id,m.name,m.email,m.active,m.goal,u.name AS trainerName,
    sg_membership_end(m.id) AS membershipEnd,
    sg_is_member_active(m.id) AS hasActiveMembership,
    sg_attendance_rate(m.id,30) AS attendanceRate30Days
  FROM sg_members m LEFT JOIN sg_trainers t ON t.id=m.trainerId
    LEFT JOIN sg_users u ON u.id=t.userId WHERE m.id=p_member;
END$$
CREATE PROCEDURE sg_trainer_members(IN p_trainer INT)
READS SQL DATA
BEGIN
  SELECT m.id,m.name,m.email,m.active,m.goal,
    sg_membership_end(m.id) AS membershipEnd,
    sg_is_member_active(m.id) AS hasActiveMembership
  FROM sg_members m WHERE m.trainerId=p_trainer ORDER BY m.name LIMIT 200;
END$$
CREATE PROCEDURE sg_top_attendance(IN p_limit INT)
READS SQL DATA
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Limit must be between 1 and 100';
  END IF;
  SELECT m.id,m.name,COUNT(*) AS visits,MAX(a.date) AS lastVisit
  FROM sg_members m JOIN sg_attendance a ON a.memberId=m.id
  WHERE a.date BETWEEN UTC_DATE()-INTERVAL 29 DAY AND UTC_DATE()
  GROUP BY m.id,m.name ORDER BY visits DESC,m.id LIMIT p_limit;
END$$
DELIMITER ;
