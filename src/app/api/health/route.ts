import { NextResponse } from "next/server";

/**
 * Liveness probe for the load balancer. Deliberately says nothing about the
 * database or the build - it answers "is this process serving?" and no more.
 *
 * Reachable without a session: `/api` is outside the proxy matcher.
 */
export function GET() {
  return NextResponse.json({ status: "ok" });
}
