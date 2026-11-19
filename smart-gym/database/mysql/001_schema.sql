-- CreateTable
CREATE TABLE `sg_users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` ENUM('ADMIN', 'TRAINER') NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sg_users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sg_sessions` (
    `tokenHash` CHAR(64) NOT NULL,
    `userId` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,

    INDEX `sg_sessions_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`tokenHash`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sg_login_attempts` (
    `key` CHAR(64) NOT NULL,
    `count` INTEGER NOT NULL DEFAULT 0,
    `windowStart` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sg_trainers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `specialty` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(20) NULL,

    UNIQUE INDEX `sg_trainers_userId_key`(`userId`),
    UNIQUE INDEX `sg_trainers_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sg_members` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `goal` VARCHAR(200) NOT NULL DEFAULT 'General fitness',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `joinedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `trainerId` INTEGER NULL,

    UNIQUE INDEX `sg_members_email_key`(`email`),
    UNIQUE INDEX `sg_members_phone_key`(`phone`),
    INDEX `sg_members_trainerId_active_idx`(`trainerId`, `active`),
    INDEX `sg_members_joinedAt_idx`(`joinedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sg_packages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `durationDays` INTEGER NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `sg_packages_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sg_subscriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `memberId` INTEGER NOT NULL,
    `packageId` INTEGER NOT NULL,
    `startsAt` DATE NOT NULL,
    `endsAt` DATE NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('ACTIVE', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `requestKey` VARCHAR(64) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sg_subscriptions_requestKey_key`(`requestKey`),
    INDEX `sg_subscriptions_memberId_status_endsAt_idx`(`memberId`, `status`, `endsAt`),
    INDEX `sg_subscriptions_endsAt_status_idx`(`endsAt`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sg_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `subscriptionId` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `method` VARCHAR(20) NOT NULL,
    `status` ENUM('PENDING', 'PAID') NOT NULL DEFAULT 'PAID',
    `paidAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sg_payments_subscriptionId_key`(`subscriptionId`),
    INDEX `sg_payments_status_paidAt_idx`(`status`, `paidAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sg_attendance` (
    `memberId` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `checkIn` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `checkOut` DATETIME(3) NULL,

    INDEX `sg_attendance_date_idx`(`date`),
    PRIMARY KEY (`memberId`, `date`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sg_equipment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('AVAILABLE', 'MAINTENANCE', 'RETIRED') NOT NULL DEFAULT 'AVAILABLE',
    `nextService` DATE NULL,

    UNIQUE INDEX `sg_equipment_name_key`(`name`),
    INDEX `sg_equipment_status_nextService_idx`(`status`, `nextService`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sg_maintenance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `equipmentId` INTEGER NOT NULL,
    `performedAt` DATE NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `cost` DECIMAL(10, 2) NOT NULL,

    INDEX `sg_maintenance_equipmentId_performedAt_idx`(`equipmentId`, `performedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sg_exercises` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `muscleGroup` VARCHAR(80) NOT NULL,
    `equipmentId` INTEGER NULL,
    `defaultSets` INTEGER NOT NULL DEFAULT 3,
    `defaultReps` INTEGER NOT NULL DEFAULT 12,

    UNIQUE INDEX `sg_exercises_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sg_workout_plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `goal` VARCHAR(200) NOT NULL,
    `durationWeeks` INTEGER NOT NULL,
    `trainerId` INTEGER NOT NULL,

    UNIQUE INDEX `sg_workout_plans_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sg_plan_exercises` (
    `planId` INTEGER NOT NULL,
    `exerciseId` INTEGER NOT NULL,
    `sets` INTEGER NOT NULL,
    `reps` INTEGER NOT NULL,

    PRIMARY KEY (`planId`, `exerciseId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sg_assignments` (
    `memberId` INTEGER NOT NULL,
    `planId` INTEGER NOT NULL,
    `assignedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`memberId`, `planId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sg_audit` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `entity` VARCHAR(30) NOT NULL,
    `entityId` INTEGER NOT NULL,
    `action` VARCHAR(20) NOT NULL,
    `details` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sg_audit_entity_entityId_createdAt_idx`(`entity`, `entityId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sg_outbox` (
    `id` VARCHAR(36) NOT NULL,
    `type` VARCHAR(80) NOT NULL,
    `memberId` INTEGER NULL,
    `metadata` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `processedAt` DATETIME(3) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `lastError` VARCHAR(200) NULL,

    INDEX `sg_outbox_processedAt_createdAt_idx`(`processedAt`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sg_sessions` ADD CONSTRAINT `sg_sessions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `sg_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sg_trainers` ADD CONSTRAINT `sg_trainers_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `sg_users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sg_members` ADD CONSTRAINT `sg_members_trainerId_fkey` FOREIGN KEY (`trainerId`) REFERENCES `sg_trainers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sg_subscriptions` ADD CONSTRAINT `sg_subscriptions_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `sg_members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sg_subscriptions` ADD CONSTRAINT `sg_subscriptions_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `sg_packages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sg_payments` ADD CONSTRAINT `sg_payments_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `sg_subscriptions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sg_attendance` ADD CONSTRAINT `sg_attendance_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `sg_members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sg_maintenance` ADD CONSTRAINT `sg_maintenance_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `sg_equipment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sg_exercises` ADD CONSTRAINT `sg_exercises_equipmentId_fkey` FOREIGN KEY (`equipmentId`) REFERENCES `sg_equipment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sg_workout_plans` ADD CONSTRAINT `sg_workout_plans_trainerId_fkey` FOREIGN KEY (`trainerId`) REFERENCES `sg_trainers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sg_plan_exercises` ADD CONSTRAINT `sg_plan_exercises_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `sg_workout_plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sg_plan_exercises` ADD CONSTRAINT `sg_plan_exercises_exerciseId_fkey` FOREIGN KEY (`exerciseId`) REFERENCES `sg_exercises`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sg_assignments` ADD CONSTRAINT `sg_assignments_memberId_fkey` FOREIGN KEY (`memberId`) REFERENCES `sg_members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sg_assignments` ADD CONSTRAINT `sg_assignments_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `sg_workout_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
