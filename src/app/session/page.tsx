import type { Metadata } from "next";
import PoseSession from "@/features/session/pose-session";

export const metadata: Metadata = { title: "Session" };

export default function SessionPage() {
  return <PoseSession />;
}
