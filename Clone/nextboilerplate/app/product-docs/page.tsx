import SwaggerDocs from "../components/SwaggerDocs";

export const metadata = { title: "Products API" };

export default function ProductDocs() {
  return <SwaggerDocs url="/api/docs/products" />;
}
