import { MarketplaceShell } from "@/components/marketplace/marketplace-shell";
import { CheckoutPage } from "@/components/checkout/checkout-page";

export default function CheckoutRoute() {
  return <MarketplaceShell><CheckoutPage /></MarketplaceShell>;
}
