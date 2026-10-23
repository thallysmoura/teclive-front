import { UserAvatar } from "@/components/ui/user-avatar";

export function AwaitingPermission({ user }: { user: { name: string; avatarUrl?: string | null } }) {
  const firstName = user.name.trim().split(/\s+/)[0];
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-6 pb-10 pt-24 text-center md:py-12">
      <div className="mb-5 rounded-full border-4 border-white shadow-sm">
        <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size={88} />
      </div>
      <h1 className="max-w-lg break-words text-2xl font-extrabold tracking-tight text-ds-primary-deep sm:text-3xl">Boas-vindas{firstName ? `, ${firstName}` : ""}!</h1>
      <div role="status" className="mt-4 inline-flex items-center gap-2 rounded-full border border-ds-warning/25 bg-ds-warning/10 px-4 py-2 text-sm font-semibold text-[#b85e00]">
        Aguardando permissão...
      </div>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-ds-text-secondary">
        Peça a um administrador para liberar suas permissões e começar a usar esta área.
      </p>
    </div>
  );
}
