/**
 * Peregrinas App - Backend Google Apps Script
 * Versão: 1.0.0
 * 
 * Funcionalidades:
 * - doGet: Retorna os dados de uma aba em formato JSON.
 * - doPost: Adiciona ou atualiza linhas baseando-se no ID e nomes das colunas.
 */

const HEADERS_ROW = 1;

/**
 * Endpoint para leitura de dados (GET)
 * Exemplo: .../exec?sheet=Peregrinas
 */
function doGet(e) {
  try {
    const sheetName = e.parameter.sheet;
    if (!sheetName) {
      return responseJSON({ status: 'error', message: 'Parâmetro "sheet" é obrigatório.' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return responseJSON({ status: 'error', message: 'Aba "' + sheetName + '" não encontrada.' });
    }

    const data = getSheetData(sheet);
    return responseJSON({ status: 'success', data: data });

  } catch (error) {
    return responseJSON({ status: 'error', message: error.toString() });
  }
}

/**
 * Endpoint para escrita de dados (POST)
 * Payload esperado: { "sheet": "NomeDaAba", "action": "append"|"update", "data": { "id": "...", "nome": "...", ... } }
 */
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheetName = payload.sheet;
    const action = payload.action; // 'append' ou 'update'
    const itemData = payload.data;

    if (!sheetName || !itemData) {
      return responseJSON({ status: 'error', message: 'Dados incompletos no payload (sheet e data são obrigatórios).' });
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    // Se a aba não existir, cria uma nova e define cabeçalhos baseados nas chaves do data
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      const headers = Object.keys(itemData);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const normalizedHeaders = headers.map(h => normalizeString(h));

    // Mapear os dados para as colunas corretas
    const rowValues = new Array(headers.length).fill("");
    Object.keys(itemData).forEach(key => {
      const normalizedKey = normalizeString(key);
      const colIndex = normalizedHeaders.indexOf(normalizedKey);
      if (colIndex !== -1) {
        rowValues[colIndex] = itemData[key];
      }
    });

    // Identificar ID (Geralmente na primeira coluna ou coluna com nome "id")
    const idKey = normalizeString("id");
    const idColIndex = normalizedHeaders.indexOf(idKey) !== -1 ? normalizedHeaders.indexOf(idKey) : 0;
    const targetId = String(itemData.id || itemData[headers[idColIndex]] || "");

    let rowToUpdate = -1;
    
    // Se a ação for update ou se tivermos um ID, tentamos localizar a linha
    if (targetId) {
      const allIds = sheet.getRange(2, idColIndex + 1, sheet.getLastRow(), 1).getValues();
      for (let i = 0; i < allIds.length; i++) {
        if (String(allIds[i][0]) === targetId) {
          rowToUpdate = i + 2; // +1 do array, +1 do cabeçalho
          break;
        }
      }
    }

    if (action === 'update' && rowToUpdate !== -1) {
      // Atualiza linha existente
      sheet.getRange(rowToUpdate, 1, 1, rowValues.length).setValues([rowValues]);
      return responseJSON({ status: 'success', message: 'Linha atualizada com sucesso.', id: targetId });
    } else {
      // Append (nova linha)
      sheet.appendRow(rowValues);
      return responseJSON({ status: 'success', message: 'Nova linha adicionada.', id: targetId });
    }

  } catch (error) {
    return responseJSON({ status: 'error', message: error.toString() });
  }
}

/**
 * Converte dados da aba em array de objetos
 */
function getSheetData(sheet) {
  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  
  const headers = rows[0];
  const data = [];
  
  for (let i = 1; i < rows.length; i++) {
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = rows[i][j];
    }
    data.push(obj);
  }
  return data;
}

/**
 * Normalização de strings para comparação de cabeçalhos
 */
function normalizeString(str) {
  if (!str) return "";
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/**
 * Helper para resposta JSON
 */
function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
