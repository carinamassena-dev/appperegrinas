# ATUALIZAÇÃO NECESSÁRIA

Detectamos que o script anterior tinha problemas com nomes de colunas que continham espaços ou acentos. 

**Por favor, atualize o script na sua Planilha Google:**

1.  Vá em **Extensões** > **Apps Script**.
2.  Apague **TODO** o código antigo.
3.  Cole este **NOVO CÓDIGO MAIS ROBUSTO**:

```javascript
/*
 * Script de Ponte para Peregrinas App (Versão Robusta 2.0)
 * Permite receber dados via POST e salvar nas abas corretas.
 */

function doPost(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Busy'})).setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    const contents = JSON.parse(e.postData.contents);
    const sheetName = contents.sheet; 
    const action = contents.action;   
    const data = contents.data;       

    let sheet = doc.getSheetByName(sheetName);
    
    // Tenta encontrar aba ignorando case e acentos
    if (!sheet) {
      const sheets = doc.getSheets();
      const normalize = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const target = normalize(sheetName);
      const found = sheets.find(s => normalize(s.getName()) === target || normalize(s.getName()).includes(target));
      if (found) sheet = found;
      else {
        // Fallback: Tenta achar "Página1" ou a primeira aba se for um teste
        sheet = sheets[0];
      }
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    if (action === 'append') {
      const newRow = mapDataToRow(headers, data);
      sheet.appendRow(newRow);
      return responseJSON({ status: 'success', message: 'Adicionado com sucesso.' });
    } 
    else if (action === 'update') {
      const dataRange = sheet.getDataRange().getValues();
      const idIndex = findHeaderIndex(headers, ['id', 'codigo', 'identifier']);
      
      if (idIndex === -1) {
         // Se não achar ID, adiciona linha nova
         const newRow = mapDataToRow(headers, data);
         sheet.appendRow(newRow);
         return responseJSON({ status: 'success', message: 'Coluna ID não encontrada, registrado como novo.' });
      }

      let rowIndex = -1;
      for (let i = 1; i < dataRange.length; i++) {
        if (String(dataRange[i][idIndex]) === String(data.id)) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex !== -1) {
        const newRow = mapDataToRow(headers, data);
        sheet.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
        return responseJSON({ status: 'success', message: 'Atualizado.' });
      } else {
        const newRow = mapDataToRow(headers, data);
        sheet.appendRow(newRow);
        return responseJSON({ status: 'success', message: 'ID não encontrado, novo registro criado.' });
      }
    }
    
    return responseJSON({ status: 'success', message: 'Ação não processada' });
    
  } catch (err) {
    return responseJSON({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function mapDataToRow(headers, data) {
  return headers.map(header => {
    // Normaliza o cabeçalho removendo espaços e acentos para comparação
    // Ex: "Data de Nascimento" -> "datadenascimento"
    const headerClean = header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, "");
    
    return findValueInObject(data, headerClean) || '';
  });
}

function findValueInObject(obj, cleanHeader) {
  // Percorre as chaves do objeto enviado
  for (let key in obj) {
    const cleanKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s/g, "");
    
    // Comparação exata
    if (cleanKey === cleanHeader) return obj[key];
    
    // Comparação parcial: "data abordagem" vs "data"
    // Synonyms hardcoded handling
    if (cleanHeader.includes('data') && cleanKey.includes('data')) return obj[key];
    if (cleanHeader.includes('nome') && cleanKey.includes('nome')) return obj[key];
    if (cleanHeader.includes('contato') && cleanKey.includes('contato')) return obj[key];
    if (cleanHeader.includes('valor') && cleanKey.includes('valor')) return obj[key];
    if (cleanHeader.includes('obs') && cleanKey.includes('observacao')) return obj[key];
    
    // Fallback: Se o header contém a chave (ex: "Telefone Celular" contém "telefone")
    if (cleanHeader.includes(cleanKey)) return obj[key];
  }
  return '';
}

function findHeaderIndex(headers, possibleNames) {
  return headers.findIndex(h => {
    const clean = h.toLowerCase();
    return possibleNames.some(name => clean.includes(name));
  });
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  // CORS Response
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.TEXT);
}
```

4.  Clique no botão azul **Implantar** > **Gerenciar implantações**.
5.  Clique no ícone de lápis (Editar) na versão ativa.
6.  Em "Versão", escolha **"Nova versão"**.
7.  Clique em **Implantar**.

> **IMPORTANTE**: Certifique-se que "Quem pode acessar" esteja como **"Qualquer pessoa"**. Se não estiver, a sincronização FALHARÁ.
