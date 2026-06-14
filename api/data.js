// Google Apps Script — Cole em script.google.com
// Implantar: Web App | Executar como: EU MESMO | Acesso: QUALQUER PESSOA

var FILE_ID = "1mg5HlKP4YarOI_6hyyzauNVPfAOv0Hj_";

function doGet(e) {
  try {
    var ss = SpreadsheetApp.openById(FILE_ID);
    var sheet = ss.getSheetByName("BASE");
    if (!sheet) sheet = ss.getSheets()[0];

    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    function col(names) {
      for (var n = 0; n < names.length; n++) {
        for (var i = 0; i < headers.length; i++) {
          if (String(headers[i]).trim() === names[n]) return i;
        }
      }
      return -1;
    }

    var iT  = col(["TSK"]);
    var iM  = col(["MÊS-ESPELHO","MES-ESPELHO"]);
    var iA  = col(["ANO"]);
    var iV  = col(["Validação FMO","Validacao FMO"]);
    var iC  = col(["Causa"]);
    var iCI = col(["Capital-Interior"]);
    var iB  = col(["Bairro da falha"]);
    var iE  = col(["Endereço(Puro)","Endereco(Puro)"]);

    if (iM  < 0) iM  = 1;
    if (iA  < 0) iA  = 2;
    if (iV  < 0) iV  = 3;
    if (iC  < 0) iC  = 4;
    if (iCI < 0) iCI = 5;
    if (iE  < 0) iE  = 7;
    if (iB  < 0) iB  = 8;

    var records = [];
    var CHUNK = 500;

    for (var start = 2; start <= lastRow; start += CHUNK) {
      var end = Math.min(start + CHUNK - 1, lastRow);
      var rows = sheet.getRange(start, 1, end - start + 1, lastCol).getValues();

      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        var tsk = String(row[iT] || "");
        if (tsk.indexOf("TSK") !== 0) continue;

        var ano = Number(row[iA]);
        if (!ano || isNaN(ano)) continue;

        var mes = String(row[iM] || "").toUpperCase().trim();
        if (!mes) continue;

        var addr = String(row[iE] || "").toUpperCase().trim();
        if (/^TSK\d/.test(addr) || /^SP[A-Z]+_/.test(addr)) addr = "";
        addr = addr.replace(/,?\s*\d+[\s\S]*$/, "").trim().replace(/^[-.,]+|[-.,]+$/g, "");
        if (addr.length <= 4) addr = "";

        records.push({
          M:  mes,
          A:  ano,
          V:  String(row[iV]  || "").toUpperCase().trim(),
          C:  String(row[iC]  || "").toUpperCase().trim(),
          CI: String(row[iCI] || "").toUpperCase().trim(),
          B:  String(row[iB]  || "").toUpperCase().trim(),
          E:  addr
        });
      }
    }

    var output = JSON.stringify({ ok: true, total: records.length, data: records });

    return ContentService
      .createTextOutput(output)
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
