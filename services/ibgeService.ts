
export interface IBGEUF {
  id: number;
  sigla: string;
  nome: string;
}

export interface IBGECity {
  id: number;
  nome: string;
}

const BASE_URL = 'https://servicodados.ibge.gov.br/api/v1/localidades';

export const ibgeService = {
  getStates: async (): Promise<IBGEUF[]> => {
    try {
      const response = await fetch(`${BASE_URL}/estados?orderBy=nome`);
      if (!response.ok) throw new Error('Falha ao buscar estados');
      return await response.json();
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  getCities: async (uf: string): Promise<IBGECity[]> => {
    if (!uf) return [];
    try {
      const response = await fetch(`${BASE_URL}/estados/${uf}/municipios?orderBy=nome`);
      if (!response.ok) throw new Error('Falha ao buscar cidades');
      return await response.json();
    } catch (error) {
      console.error(error);
      return [];
    }
  }
};
