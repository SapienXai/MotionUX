import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (
    process.env.MOTIONUX_GENERATED_PREVIEW === "1" &&
    (request.headers.get("host") !== "127.0.0.1:5202" ||
      !["GET", "HEAD"].includes(request.method))
  ) {
    return new NextResponse("Loopback preview only.", { status: 403 });
  }
  return NextResponse.next();
}
