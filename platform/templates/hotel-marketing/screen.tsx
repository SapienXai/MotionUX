"use client";
import type { ReactNode } from "react";
import type { BuildPage, Document } from "./model";
import { MarketingPage } from "./marketing";

export function AppScreen({
  document,
  page,
  status,
}: {
  document: Document;
  page: BuildPage;
  id: string;
  revision: number;
  documentNavigation?: boolean;
  status?: ReactNode;
}) {
  return <MarketingPage document={document} page={page} status={status} />;
}
