import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import { RaffleDetail } from "@/components/raffles/raffle-detail";
import { getPublicRaffleBySlug } from "@/server/raffles";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const raffle = await getPublicRaffleBySlug(slug);
  return raffle ? { title: raffle.title, description: raffle.description ?? `Participe da rifa ${raffle.title}.` } : { title: "Rifa não encontrada" };
}

export default async function RafflePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const raffle = await getPublicRaffleBySlug(slug);
  if (!raffle) notFound();
  return <MarketplaceShell><RaffleDetail raffle={raffle} /></MarketplaceShell>;
}
