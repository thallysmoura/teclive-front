import { Icon } from "@/components/ui/icon";

export function AwaitingPermission() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pt-16 text-center md:pt-0">
      <Icon name="hourglass_top" className="text-[40px] text-ds-text-secondary" />
      <h1 className="text-xl font-bold text-ds-primary-deep">Aguardando permissão</h1>
      <p className="max-w-sm text-sm text-ds-text-secondary">
        Sua conta ainda não tem acesso liberado a nenhuma área do sistema. Peça a um
        administrador para liberar suas permissões.
      </p>
    </div>
  );
}
