import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (request.headers.get("host") !== "127.0.0.1:5200") {
    return new NextResponse(
      "MotionUX Studio is available on its loopback origin.",
      { status: 403 },
    );
  }
  return NextResponse.next();
}
