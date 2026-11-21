import SwaggerDocs from "../components/SwaggerDocs";

export const metadata = { title: "Cart API" };

export default function CartDocs() {
  return <SwaggerDocs url="/api/docs/cart" />;
}
