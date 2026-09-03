import { RaffleListing } from "@/components/raffles/raffle-listing";
import { listPublicRaffles } from "@/server/raffles";

export const dynamic = "force-dynamic";

export default async function RafflesPage() {
  return <RaffleListing raffles={await listPublicRaffles()} />;
}
