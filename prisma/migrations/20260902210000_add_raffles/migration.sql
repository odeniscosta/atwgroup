-- Raffles are a separate commerce domain from products and regular orders.
CREATE TYPE "RaffleStatus" AS ENUM ('DRAFT', 'OPEN', 'PAUSED', 'DRAWN', 'CANCELLED');
CREATE TYPE "RaffleOrderStatus" AS ENUM ('PAYMENT_PENDING', 'PAID', 'CANCELLED', 'EXPIRED', 'REFUNDED');
CREATE TYPE "RaffleTicketStatus" AS ENUM ('RESERVED', 'PAID', 'CANCELLED');

INSERT INTO "Category" ("id", "name", "slug", "description", "createdAt", "updatedAt")
VALUES ('category-rifas', 'Rifas', 'rifas', 'Produtos e campanhas de rifas da ATW Group.', NOW(), NOW())
ON CONFLICT ("slug") DO UPDATE SET "name" = EXCLUDED."name", "description" = EXCLUDED."description", "updatedAt" = NOW();

CREATE TABLE "Raffle" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "ticketPrice" DECIMAL(12,2) NOT NULL,
    "totalNumbers" INTEGER NOT NULL,
    "maxPerCustomer" INTEGER NOT NULL DEFAULT 10,
    "drawAt" TIMESTAMP(3),
    "status" "RaffleStatus" NOT NULL DEFAULT 'DRAFT',
    "winningNumber" INTEGER,
    "drawnAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Raffle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RaffleOrder" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "raffleId" TEXT NOT NULL,
    "customerId" TEXT,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerPhone" TEXT NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "status" "RaffleOrderStatus" NOT NULL DEFAULT 'PAYMENT_PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RaffleOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RaffleTicket" (
    "id" TEXT NOT NULL,
    "raffleId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "status" "RaffleTicketStatus" NOT NULL DEFAULT 'RESERVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaffleTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RafflePayment" (
    "id" TEXT NOT NULL,
    "raffleOrderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerId" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" TEXT NOT NULL DEFAULT 'pix',
    "amount" DECIMAL(12,2) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RafflePayment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RafflePaymentTransaction" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "rawEvent" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RafflePaymentTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RaffleOrderEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "RaffleOrderStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaffleOrderEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Raffle_slug_key" ON "Raffle"("slug");
CREATE INDEX "Raffle_status_createdAt_idx" ON "Raffle"("status", "createdAt");
CREATE UNIQUE INDEX "RaffleOrder_number_key" ON "RaffleOrder"("number");
CREATE INDEX "RaffleOrder_raffleId_status_idx" ON "RaffleOrder"("raffleId", "status");
CREATE INDEX "RaffleOrder_buyerEmail_createdAt_idx" ON "RaffleOrder"("buyerEmail", "createdAt");
CREATE INDEX "RaffleOrder_expiresAt_status_idx" ON "RaffleOrder"("expiresAt", "status");
CREATE UNIQUE INDEX "RaffleTicket_raffleId_number_key" ON "RaffleTicket"("raffleId", "number");
CREATE INDEX "RaffleTicket_orderId_status_idx" ON "RaffleTicket"("orderId", "status");
CREATE INDEX "RaffleTicket_raffleId_status_idx" ON "RaffleTicket"("raffleId", "status");
CREATE UNIQUE INDEX "RafflePayment_raffleOrderId_key" ON "RafflePayment"("raffleOrderId");
CREATE INDEX "RafflePayment_provider_providerId_idx" ON "RafflePayment"("provider", "providerId");
CREATE INDEX "RafflePayment_status_createdAt_idx" ON "RafflePayment"("status", "createdAt");
CREATE UNIQUE INDEX "RafflePaymentTransaction_paymentId_externalId_key" ON "RafflePaymentTransaction"("paymentId", "externalId");
CREATE INDEX "RaffleOrderEvent_orderId_createdAt_idx" ON "RaffleOrderEvent"("orderId", "createdAt");

ALTER TABLE "Raffle" ADD CONSTRAINT "Raffle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RaffleOrder" ADD CONSTRAINT "RaffleOrder_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RaffleOrder" ADD CONSTRAINT "RaffleOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RaffleTicket" ADD CONSTRAINT "RaffleTicket_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RaffleTicket" ADD CONSTRAINT "RaffleTicket_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RaffleOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RafflePayment" ADD CONSTRAINT "RafflePayment_raffleOrderId_fkey" FOREIGN KEY ("raffleOrderId") REFERENCES "RaffleOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RafflePaymentTransaction" ADD CONSTRAINT "RafflePaymentTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "RafflePayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RaffleOrderEvent" ADD CONSTRAINT "RaffleOrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "RaffleOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
