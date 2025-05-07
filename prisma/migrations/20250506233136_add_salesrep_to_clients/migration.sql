-- AlterTable
ALTER TABLE `Clients` ADD COLUMN `salesRepId` INTEGER NULL;

-- CreateTable
CREATE TABLE `sales` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `productId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `unitPrice` DOUBLE NOT NULL,
    `total` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `clientId` INTEGER NULL,
    `createdBy` INTEGER NOT NULL,
    `isLocked` BOOLEAN NOT NULL DEFAULT false,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `voidRequest` BOOLEAN NOT NULL DEFAULT false,
    `voidStatus` VARCHAR(191) NULL DEFAULT 'pending',

    INDEX `sales_productId_idx`(`productId`),
    INDEX `sales_clientId_idx`(`clientId`),
    INDEX `sales_createdBy_idx`(`createdBy`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Clients` ADD CONSTRAINT `Clients_salesRepId_fkey` FOREIGN KEY (`salesRepId`) REFERENCES `SalesRep`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `Clients`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `SalesRep`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
