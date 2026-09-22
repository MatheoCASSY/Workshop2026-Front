import Swagger from "./swagger";

export const dynamic = "force-dynamic";

export default function DocsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Documentation de l&apos;API</h1>
        <p className="mt-1 text-sm text-attenue">
          Description OpenAPI 3.1 brute :{" "}
          <a href="/api/openapi" className="text-accent underline">
            /api/openapi
          </a>
        </p>
      </div>
      <Swagger />
    </div>
  );
}
