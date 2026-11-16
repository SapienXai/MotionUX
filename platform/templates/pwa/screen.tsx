"use client";

import type { ComponentProps } from "react";
import { AppScreen as BaseScreen } from "./screen";
import { PwaStatus } from "./pwa-status";

export function AppScreen(props: ComponentProps<typeof BaseScreen>) {
  return <BaseScreen {...props} documentNavigation status={<PwaStatus />} />;
}
