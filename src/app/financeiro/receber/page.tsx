"use client";

import { PageShell } from "@/components/layout/page-shell";
import { Accounts } from "@/components/financeiro/accounts";
import { FIN_KEYS } from "@/lib/financeiro";

export default function ReceivablePage() { return <PageShell permissionKey={FIN_KEYS.receber}>{() => <Accounts kind="R" />}</PageShell>; }
