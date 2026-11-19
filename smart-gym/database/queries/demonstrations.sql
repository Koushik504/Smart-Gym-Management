-- Run in the configured project database. Only sg_demo_sandbox is dropped.
CREATE TABLE sg_demo_sandbox (id INT PRIMARY KEY, label VARCHAR(80) NOT NULL);
ALTER TABLE sg_demo_sandbox ADD score INT NOT NULL DEFAULT 0 CHECK(score>=0);
INSERT INTO sg_demo_sandbox VALUES (1,'Disposable demonstration',10),(2,'Delete demonstration',20);
UPDATE sg_demo_sandbox SET score=15 WHERE id=1;
DELETE FROM sg_demo_sandbox WHERE id=2;
SELECT * FROM sg_demo_sandbox ORDER BY score DESC;
DROP TABLE sg_demo_sandbox;

SELECT m.id,m.name,COUNT(a.date) visits FROM sg_members m LEFT JOIN sg_attendance a ON a.memberId=m.id GROUP BY m.id,m.name HAVING COUNT(a.date)>=2 ORDER BY visits DESC;
SELECT DATE_FORMAT(paidAt,'%Y-%m') month,COUNT(*) payments,SUM(amount) revenue,AVG(amount) averagePayment FROM sg_payments WHERE status='PAID' GROUP BY month ORDER BY month;
SELECT id,name FROM sg_members WHERE id NOT IN (SELECT DISTINCT memberId FROM sg_attendance WHERE date >= UTC_DATE()-INTERVAL 14 DAY);
SELECT * FROM sg_active_memberships;
SELECT * FROM sg_trainer_workload;
EXPLAIN SELECT * FROM sg_attendance WHERE date=UTC_DATE();
-- Demonstrate an explicit rollback without modifying persistent records.
START TRANSACTION;
INSERT INTO sg_packages(name,price,durationDays,active) VALUES(CONCAT('Rollback-',UUID()),100,7,1);
ROLLBACK;
