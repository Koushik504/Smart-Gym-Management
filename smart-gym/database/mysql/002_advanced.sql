-- Custom objects applied once by the checksum-based migration runner.
ALTER TABLE sg_packages ADD CONSTRAINT sg_package_price CHECK (price > 0), ADD CONSTRAINT sg_package_days CHECK (durationDays BETWEEN 1 AND 730);
ALTER TABLE sg_subscriptions ADD CONSTRAINT sg_subscription_dates CHECK (endsAt >= startsAt), ADD CONSTRAINT sg_subscription_price CHECK (price > 0);
ALTER TABLE sg_payments ADD CONSTRAINT sg_payment_positive CHECK (amount > 0), ADD CONSTRAINT sg_payment_date CHECK ((status='PAID' AND paidAt IS NOT NULL) OR (status='PENDING' AND paidAt IS NULL)), ADD CONSTRAINT sg_payment_method CHECK (method IN ('CASH','CARD','UPI','BANK'));
ALTER TABLE sg_attendance ADD CONSTRAINT sg_attendance_order CHECK (checkOut IS NULL OR checkOut > checkIn);
ALTER TABLE sg_equipment ADD CONSTRAINT sg_equipment_quantity CHECK (quantity >= 0);
ALTER TABLE sg_maintenance ADD CONSTRAINT sg_maintenance_cost CHECK (cost >= 0);
ALTER TABLE sg_exercises ADD CONSTRAINT sg_exercise_counts CHECK (defaultSets > 0 AND defaultReps > 0);
ALTER TABLE sg_plan_exercises ADD CONSTRAINT sg_plan_counts CHECK (sets > 0 AND reps > 0);
ALTER TABLE sg_workout_plans ADD CONSTRAINT sg_plan_duration CHECK (durationWeeks > 0);
CREATE VIEW sg_active_memberships AS SELECT s.*,m.name AS memberName,p.name AS packageName FROM sg_subscriptions s JOIN sg_members m ON m.id=s.memberId JOIN sg_packages p ON p.id=s.packageId JOIN sg_payments pay ON pay.subscriptionId=s.id WHERE s.status='ACTIVE' AND s.startsAt<=UTC_DATE() AND s.endsAt>=UTC_DATE() AND m.active=1 AND pay.status='PAID';
CREATE VIEW sg_monthly_revenue AS SELECT DATE_FORMAT(paidAt,'%Y-%m') AS month, COUNT(*) AS payments,SUM(amount) AS revenue FROM sg_payments WHERE status='PAID' GROUP BY DATE_FORMAT(paidAt,'%Y-%m');
CREATE VIEW sg_trainer_workload AS SELECT t.id,u.name,t.specialty,COUNT(m.id) AS members FROM sg_trainers t JOIN sg_users u ON u.id=t.userId LEFT JOIN sg_members m ON m.trainerId=t.id AND m.active=1 GROUP BY t.id,u.name,t.specialty;
CREATE VIEW sg_attendance_summary AS SELECT m.id,m.name,COUNT(a.date) AS visits,MAX(a.date) AS lastVisit FROM sg_members m LEFT JOIN sg_attendance a ON a.memberId=m.id GROUP BY m.id,m.name;
DELIMITER $$
CREATE TRIGGER sg_payment_validate BEFORE INSERT ON sg_payments FOR EACH ROW
BEGIN
  DECLARE expected DECIMAL(10,2);
  SELECT price INTO expected FROM sg_subscriptions WHERE id=NEW.subscriptionId;
  IF NEW.amount <> expected THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Amount must equal subscription agreed price'; END IF;
END$$
CREATE TRIGGER sg_payment_validate_update BEFORE UPDATE ON sg_payments FOR EACH ROW
BEGIN
  IF NEW.amount <> OLD.amount OR NEW.subscriptionId <> OLD.subscriptionId THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Payment amount and subscription are immutable'; END IF;
END$$
CREATE TRIGGER sg_payment_audit_insert AFTER INSERT ON sg_payments FOR EACH ROW
BEGIN
  INSERT INTO sg_audit(entity,entityId,action,details,createdAt) VALUES ('payment',NEW.id,'INSERT',JSON_OBJECT('amount',NEW.amount,'status',NEW.status),UTC_TIMESTAMP(3));
END$$
CREATE TRIGGER sg_payment_audit_update AFTER UPDATE ON sg_payments FOR EACH ROW
BEGIN
  INSERT INTO sg_audit(entity,entityId,action,details,createdAt) VALUES ('payment',NEW.id,'UPDATE',JSON_OBJECT('oldStatus',OLD.status,'newStatus',NEW.status),UTC_TIMESTAMP(3));
END$$
CREATE TRIGGER sg_subscription_audit AFTER UPDATE ON sg_subscriptions FOR EACH ROW
BEGIN
  IF OLD.status <> NEW.status THEN INSERT INTO sg_audit(entity,entityId,action,details,createdAt) VALUES('subscription',NEW.id,'STATUS',JSON_OBJECT('old',OLD.status,'new',NEW.status),UTC_TIMESTAMP(3)); END IF;
END$$
-- Serializing on the member row prevents two renewals from overlapping.
-- All mutations including the activity outbox commit or roll back together.
CREATE PROCEDURE sg_renew_membership(IN p_member INT, IN p_package INT, IN p_method VARCHAR(20), IN p_status VARCHAR(10), IN p_key VARCHAR(64))
BEGIN
  DECLARE v_active BOOLEAN DEFAULT NULL;
  DECLARE v_price DECIMAL(10,2) DEFAULT NULL;
  DECLARE v_days INT;
  DECLARE v_start DATE;
  DECLARE v_end DATE;
  DECLARE v_id INT;
  DECLARE v_existing INT DEFAULT NULL;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
  START TRANSACTION;
  SELECT active INTO v_active FROM sg_members WHERE id=p_member FOR UPDATE;
  IF v_active IS NULL OR v_active=0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Active member required'; END IF;
  SELECT id INTO v_existing FROM sg_subscriptions WHERE requestKey=p_key;
  IF v_existing IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM sg_subscriptions s JOIN sg_payments p ON p.subscriptionId=s.id WHERE s.id=v_existing AND s.memberId=p_member AND s.packageId=p_package AND p.method=p_method AND p.status=p_status) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Request key was already used for different values'; END IF;
    COMMIT;
    SELECT v_existing AS subscriptionId;
  ELSE
    SELECT price,durationDays INTO v_price,v_days FROM sg_packages WHERE id=p_package AND active=1 FOR SHARE;
    IF v_price IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Active package required'; END IF;
    IF p_status NOT IN ('PAID','PENDING') OR p_method NOT IN ('CASH','CARD','UPI','BANK') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Invalid payment status or method'; END IF;
    SELECT MAX(endsAt) INTO v_end FROM sg_subscriptions WHERE memberId=p_member AND status='ACTIVE';
    SET v_start=IF(v_end IS NOT NULL AND v_end >= UTC_DATE(),DATE_ADD(v_end,INTERVAL 1 DAY),UTC_DATE());
    INSERT INTO sg_subscriptions(memberId,packageId,startsAt,endsAt,price,status,requestKey,createdAt) VALUES(p_member,p_package,v_start,DATE_ADD(v_start,INTERVAL (v_days-1) DAY),v_price,'ACTIVE',p_key,UTC_TIMESTAMP(3));
    SET v_id=LAST_INSERT_ID();
    INSERT INTO sg_payments(subscriptionId,amount,method,status,paidAt,createdAt) VALUES(v_id,v_price,p_method,p_status,IF(p_status='PAID',UTC_TIMESTAMP(3),NULL),UTC_TIMESTAMP(3));
    INSERT INTO sg_outbox(id,type,memberId,metadata,createdAt,attempts) VALUES(UUID(),'membership.enrolled',p_member,JSON_OBJECT('subscriptionId',v_id,'status',p_status),UTC_TIMESTAMP(3),0);
    COMMIT;
    SELECT v_id AS subscriptionId;
  END IF;
END$$
DELIMITER ;
