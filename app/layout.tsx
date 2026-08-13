import type { Metadata } from "next";
import { CartProvider } from "@/components/cart/cart-provider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://atwgroup.com.br"),
  title: {
    default: "ATW Group | Seu shopping, onde você estiver",
    template: "%s | ATW Group",
  },
  description:
    "Encontre ofertas, produtos e lojas independentes em um só lugar. Compre rápido, seguro e pelo celular na ATW Group.",
  keywords: ["marketplace", "compras online", "ofertas", "shopping online", "ATW Group"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "ATW Group",
    title: "ATW Group | Seu shopping, onde você estiver",
    description: "Um shopping completo, com variedade, bons preços e compra segura.",
    url: "https://atwgroup.com.br",
  },
  twitter: {
    card: "summary_large_image",
    title: "ATW Group | Seu shopping, onde você estiver",
    description: "Variedade, bons preços e compra segura em um só lugar.",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
