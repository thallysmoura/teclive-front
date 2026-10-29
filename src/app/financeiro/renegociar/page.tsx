"use client";

import { PageShell } from "@/components/layout/page-shell";
import { Rebuild } from "@/components/financeiro/rebuild";
import { FIN_KEYS } from "@/lib/financeiro";

export default function RenegotiatePage() { return <PageShell permissionKey={FIN_KEYS.renegociar}>{() => <Rebuild mode="RENEGOCIACAO" />}</PageShell>; }
