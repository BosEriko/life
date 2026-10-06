import { join } from "node:path";
import { listAppPages } from "@/lib/app-pages";

export const dynamic = "force-static";

export function GET() {
  return Response.json(listAppPages(join(process.cwd(), "src", "app")));
}
