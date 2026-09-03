import assert from "node:assert/strict";
import { test } from "node:test";
import { RaffleStatus } from "../src/generated/prisma/enums";
import { MAX_RAFFLE_IMAGES } from "../src/server/admin/raffle-images";
import { calculateRaffleTotal, canTransitionRaffle, normalizeRaffleNumbers, raffleInputSchema } from "../src/server/raffles";

test("raffle numbers are normalized, sorted and deduplicated", () => {
  assert.deepEqual(normalizeRaffleNumbers([12, 2, 12, 1, 10]), [1, 2, 10, 12]);
});

test("raffle total uses the ticket price and number count with two decimals", () => {
  assert.equal(calculateRaffleTotal(2.35, 4), 9.4);
});

test("raffle lifecycle only allows safe operational transitions", () => {
  assert.equal(canTransitionRaffle(RaffleStatus.DRAFT, RaffleStatus.OPEN), true);
  assert.equal(canTransitionRaffle(RaffleStatus.OPEN, RaffleStatus.PAUSED), true);
  assert.equal(canTransitionRaffle(RaffleStatus.OPEN, RaffleStatus.DRAWN), false);
  assert.equal(canTransitionRaffle(RaffleStatus.DRAWN, RaffleStatus.OPEN), false);
});

test("raffle input rejects an invalid customer limit and past draw date", () => {
  assert.throws(() => raffleInputSchema.parse({
    title: "Rifa de teste",
    slug: "rifa-de-teste",
    ticketPrice: 5,
    totalNumbers: 10,
    maxPerCustomer: 11,
    drawAt: new Date(Date.now() - 60_000).toISOString(),
  }));
});

test("raffle image gallery is limited to five files", () => {
  assert.equal(MAX_RAFFLE_IMAGES, 5);
});
