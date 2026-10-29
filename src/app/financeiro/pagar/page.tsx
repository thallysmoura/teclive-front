"use client";

import { PageShell } from "@/components/layout/page-shell";
import { Accounts } from "@/components/financeiro/accounts";
import { FIN_KEYS } from "@/lib/financeiro";

export default function PayablePage() { return <PageShell permissionKey={FIN_KEYS.pagar}>{() => <Accounts kind="P" />}</PageShell>; }
