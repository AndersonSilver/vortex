export interface CepLookupResult {
  state: string;
  city: string;
  neighborhood: string;
  street: string;
}

export async function fetchAddressByCep(cep: string, signal?: AbortSignal): Promise<CepLookupResult | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, { signal });
  if (!response.ok) return null;

  const data = await response.json();
  if (data.erro) return null;

  return {
    state: data.uf,
    city: data.localidade,
    neighborhood: data.bairro,
    street: data.logradouro,
  };
}
