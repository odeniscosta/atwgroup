CREATE TABLE "RaffleImage" (
    "id" TEXT NOT NULL,
    "raffleId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RaffleImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RaffleImage_raffleId_position_key" ON "RaffleImage"("raffleId", "position");
CREATE INDEX "RaffleImage_raffleId_position_idx" ON "RaffleImage"("raffleId", "position");

ALTER TABLE "RaffleImage" ADD CONSTRAINT "RaffleImage_raffleId_fkey" FOREIGN KEY ("raffleId") REFERENCES "Raffle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
