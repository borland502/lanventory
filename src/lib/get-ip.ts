import { headers } from "next/headers";

export async function getIp() {
  const currentHeaders = await headers();
  const forwardedFor = currentHeaders.get("x-forwarded-for");
  const realIp = currentHeaders.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  if (realIp) {
    return realIp.trim();
  }

  return null;
}
