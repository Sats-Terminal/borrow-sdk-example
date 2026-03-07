export interface ZerionPositionsResponse {
  data: Array<{
    id: string;
    type: string;
    attributes: {
      quantity: {
        float: number;
        numeric: string;
        int: string;
        decimals: number;
      };
      value?: number | null;
      price?: number;
      fungible_info?: {
        name: string;
        symbol: string;
        implementations?: Array<{
          chain_id: string;
          address?: string | null;
          decimals?: number;
        }>;
      } | null;
    };
    relationships: {
      chain: {
        data: {
          type: string;
          id: string;
        };
      };
    };
  }>;
  links?: {
    self?: string;
  };
}

const ZERION_API_KEY = import.meta.env.VITE_ZERION_API_KEY || "";

export function hasZerionApiKey(): boolean {
  return Boolean(ZERION_API_KEY);
}

export async function fetchZerionPositions(
  address: string,
): Promise<ZerionPositionsResponse> {
  if (!ZERION_API_KEY) {
    throw new Error("Missing VITE_ZERION_API_KEY");
  }

  const url = new URL(`https://api.zerion.io/v1/wallets/${address}/positions`);
  url.searchParams.set("filter[positions]", "only_simple");
  url.searchParams.set("filter[trash]", "only_non_trash");

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${btoa(`${ZERION_API_KEY}:`)}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Zerion request failed with ${response.status}`);
  }

  return response.json() as Promise<ZerionPositionsResponse>;
}
