
/**
 * Serviço de Integração com Google Sheets via exportação CSV
 * Permite leitura de dados sem chaves de API complexas.
 * Requisito: Planilha deve estar como "Qualquer pessoa com o link pode ler".
 */

export const fetchSheetCSV = async (spreadsheetId: string, gid: string) => {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Erro ao acessar a planilha. Verifique o ID e as permissões.");
    const text = await response.text();
    return text;
  } catch (error) {
    console.error("Erro na busca do Sheets:", error);
    throw error;
  }
};

export const parseCSV = (csvText: string) => {
  const rows = csvText.split(/\r?\n/);
  if (rows.length < 2) return [];

  const headers = rows[0].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(h => h.trim().replace(/"/g, '').toLowerCase());

  return rows.slice(1).map(row => {
    const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/"/g, ''));
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = cols[index];
    });
    return obj;
  });
};

export const sendDataToSheet = async (scriptUrl: string, sheetName: string, action: 'append' | 'update', data: any) => {
  if (!scriptUrl) throw new Error("URL do Script não configurada.");

  try {
    const payload = JSON.stringify({
      sheet: sheetName,
      action,
      data
    });

    // Tenta envio padrão (espera ler resposta JSON)
    try {
      const response = await fetch(scriptUrl, {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: payload
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);
      const text = await response.text();
      const json = JSON.parse(text);

      if (json.status === 'error') {
        throw new Error(json.message || "Erro desconhecido no Script");
      }

      return json;

    } catch (corsError) {
      console.warn("Retrying with no-cors due to:", corsError);

      // Fallback: Modo 'no-cors' (Opaque)
      // Não permite let status nem resposta, mas envia os dados.
      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: payload
      });

      return { success: true, warning: "Enviado em modo opaco (sem confirmação de leitura)." };
    }
  } catch (error) {
    console.error("Erro fatal no envio:", error);
    throw error;
  }
};
