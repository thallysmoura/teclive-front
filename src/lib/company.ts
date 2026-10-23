import cep from "cep-promise";

export type CompanyForm = {
  cnpj: string; legalName: string; tradeName: string; email: string; phone: string;
  postalCode: string; street: string; number: string; district: string; complement: string; city: string; state: string;
  municipalRegistration: string; stateRegistration: string; substituteRegistration: string; taxRegime: string; cnae: string;
  accountantEnabled: boolean; accountantName: string; accountantEmail: string; accountantPhone: string; accountantCrc: string;
  logoDataUrl: string; boletoLogoDataUrl: string;
};
export type CompanyProfile = Omit<CompanyForm, "logoDataUrl" | "boletoLogoDataUrl"> & { logoDataUrl: string | null; boletoLogoDataUrl: string | null; id: string; createdAt: string; updatedAt: string };
export const EMPTY_COMPANY: CompanyForm = {
  cnpj: "", legalName: "", tradeName: "", email: "", phone: "", postalCode: "", street: "", number: "", district: "", complement: "", city: "", state: "",
  municipalRegistration: "", stateRegistration: "", substituteRegistration: "", taxRegime: "", cnae: "", accountantEnabled: false, accountantName: "", accountantEmail: "", accountantPhone: "", accountantCrc: "", logoDataUrl: "", boletoLogoDataUrl: "",
};
export function formatCnpj(value: string): string {
  const raw = value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 14);
  return raw.slice(0, 2)
    + (raw.length > 2 ? `.${raw.slice(2, 5)}` : "")
    + (raw.length > 5 ? `.${raw.slice(5, 8)}` : "")
    + (raw.length > 8 ? `/${raw.slice(8, 12)}` : "")
    + (raw.length > 12 ? `-${raw.slice(12, 14)}` : "");
}

export function companyToForm(profile: CompanyProfile | null): CompanyForm {
  if (!profile) return { ...EMPTY_COMPANY };
  return Object.fromEntries(Object.entries(EMPTY_COMPANY).map(([key, fallback]) => [key, profile[key as keyof CompanyProfile] ?? fallback])) as CompanyForm;
}

async function publicLookup(url: string): Promise<Record<string, unknown>> {
  const response = await fetch(url, { credentials: "omit", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Consulta indisponível. Confira o número ou preencha os dados manualmente.");
  return response.json();
}
const text = (value: unknown) => typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "";
export async function lookupCompany(cnpj: string): Promise<Partial<CompanyForm>> {
  const value = cnpj.replace(/[.\s/-]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{12}\d{2}$/.test(value)) throw new Error("Informe um CNPJ válido para consultar.");
  const data = await publicLookup(`https://brasilapi.com.br/api/cnpj/v1/${value}`);
  const street = [text(data.descricao_tipo_de_logradouro), text(data.logradouro)].filter(Boolean).join(" ");
  const cnae = text(data.cnae_fiscal);
  const result: Partial<CompanyForm> = { legalName: text(data.razao_social), tradeName: text(data.nome_fantasia), email: text(data.email), phone: text(data.ddd_telefone_1).replace(/\D/g, ""), postalCode: text(data.cep).replace(/\D/g, ""), street, number: text(data.numero), district: text(data.bairro), complement: text(data.complemento), city: text(data.municipio), state: text(data.uf), cnae: /^\d{1,7}$/.test(cnae) ? cnae.padStart(7, "0") : "" };
  return Object.fromEntries(Object.entries(result).filter(([, value]) => value !== ""));
}
export async function lookupPostalCode(postalCode: string, resolve: typeof cep = cep): Promise<Partial<CompanyForm>> {
  const value = postalCode.replace(/\D/g, "");
  if (!/^\d{8}$/.test(value)) throw new Error("Informe um CEP com 8 dígitos.");
  let data;
  try {
    data = await resolve(value, { timeout: 8000, providers: ["brasilapi", "viacep"] });
  } catch {
    throw new Error("CEP não encontrado ou consulta indisponível. Confira o número ou preencha os dados manualmente.");
  }
  return Object.fromEntries(Object.entries({ street: text(data.street), district: text(data.neighborhood), city: text(data.city), state: text(data.state) }).filter(([, value]) => value !== ""));
}

export async function prepareCompanyLogo(file: File): Promise<string> {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("Selecione uma imagem PNG, JPG ou WebP de até 5 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Não foi possível abrir a imagem.")); image.src = url; });
    const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a imagem.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    if (!blob || blob.size > 200 * 1024) throw new Error("A imagem deve ter até 200 KB após o ajuste. Use uma imagem menor.");
    return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error("Não foi possível ler a imagem.")); reader.readAsDataURL(blob); });
  } finally { URL.revokeObjectURL(url); }
}
