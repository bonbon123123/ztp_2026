import SwaggerDocs from "../components/SwaggerDocs";

export const metadata = { title: "Identity API" };

export default function IdentityDocs() {
  return <SwaggerDocs url="/api/docs/identity" />;
}
