function myFunction() {
    // 🛠️ FIX: Buka Spreadsheet menggunakan ID secara eksplisit agar aman di mode Web App
      var ss = SpreadsheetApp.openById("1qHrHYULoTmYM3SlkkgGUx4mhhDg4XgGTfEuYV2-UkiA");
      var tz = ss.getSpreadsheetTimeZone(); // Menyesuaikan timezone klinik
  
      // 1. Request: submitRekamMedis (Dinamis: Logged, Time-Window & Addendum System)
      // FUNGSI MENYIMPAN DATA RME KE TABEL RekamMedis
      // =========================================================================
        // 🔥 UPGRADE SUBMIT RME: 100% DYNAMIC MAPPING + AUTOMATED DUPLICATION GUARD
        // =========================================================================
      if (sheetData.action === "submitRekamMedis") {
          
          // =========================================================================
          // 🔥 LAPIS 1: SATPAM IDEMPOTENSI REKAM MEDIS (CEK TOKEN DARI CACHE SERVER)
          // =========================================================================
          var cache = CacheService.getScriptCache();
          var tokenInput = sheetData.tokenId;
          
          if (tokenInput && cache.get(tokenInput)) {
              // Jika token terdeteksi, ini adalah double klik akibat lag internet.
              // Tolak diam-diam agar tidak ada duplikasi data/addendum beruntun.
              return ContentService.createTextOutput(JSON.stringify({ 
                  "result": "success", 
                  "note": "idempotent_catch" 
              })).setMimeType(ContentService.MimeType.JSON);
          }
          // =========================================================================
  
            const sheetRM = ss.getSheetByName("RekamMedis");
            const sheetPend = ss.getSheetByName("Pendaftaran"); 
            
            if (!sheetRM || !sheetPend) {
                return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "Sheet RekamMedis atau Pendaftaran tidak ditemukan." })).setMimeType(ContentService.MimeType.JSON);
            }
            
            var tanggalSimpan = new Date(); 
            var tautanFotoFinal = sheetData.linkFoto || "-";
  
            if (sheetData.fileBaru) {
                try {
                    var idFolderDrive = "1akHof472o0P7c8_6HvmgIIbf1vQjNmfu"; 
                    var folder = DriveApp.getFolderById(idFolderDrive);
                    var decodedBlob = Utilities.newBlob(Utilities.base64Decode(sheetData.fileBaru.base64), sheetData.fileBaru.mimeType, "RME_" + sheetData.noRM + "_" + sheetData.fileBaru.namaFile);
                    var fileBaruDrive = folder.createFile(decodedBlob);
                    try { fileBaruDrive.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (eS) { }
                    tautanFotoFinal = fileBaruDrive.getUrl();
                } catch (err) {
                    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": "Gagal upload Drive: " + err.toString() })).setMimeType(ContentService.MimeType.JSON);
                }
            }
  
            var logUser   = sheetData.operatorUsername || "Unknown";
            var logRole   = sheetData.operatorRole || "Unknown";
            var logDetail = "";
            
            var inputIdDokter = (sheetData.idDokter || sheetData.idDokder || "").toString().trim().toLowerCase();
  
            // 🔥 MESIN PENCUCI TEKS (MENCEGAH REPETISI & MEMISAHKAN DATA)
            var catatanAsli = (sheetData.proKontrol || "").toString();
            // Cuci bersih sisa-sisa format dari edit masa lalu
            catatanAsli = catatanAsli.replace(/🗓️ Tgl Kontrol:.*?\n📝 Catatan:\s*/g, "");
            catatanAsli = catatanAsli.replace(/🗓️ Tgl Kontrol:.*?\n/g, ""); 
            
            // Rakit ulang khusus untuk Tampilan di Sheet Rekam Medis
            var proKontrolRME = catatanAsli;
            if (sheetData.tanggalKontrolTarget && sheetData.tanggalKontrolTarget.trim() !== "") {
                var formatTgl = "🗓️ Tgl Kontrol: " + sheetData.tanggalKontrolTarget;
                proKontrolRME = catatanAsli ? (formatTgl + "\n📝 Catatan: " + catatanAsli) : formatTgl;
            }
  
            // 🔥 FORMAT AWALAN TANGGAL TELAH DIHAPUS (CLEAN DATA)
            // Data proKontrol sekarang murni hanya berisi pesan/catatan tindakan saja (misal: "angkat jahitan")
            // Tanggal sudah memiliki kolom independen di JadwalKontrol.
  
            var headerRM = sheetRM.getDataRange().getValues()[0].map(function(h) { return h.toString().toLowerCase().trim(); });
            
            var cTimestamp = headerRM.indexOf("timestamp") !== -1 ? headerRM.indexOf("timestamp") + 1 : (headerRM.indexOf("waktu") !== -1 ? headerRM.indexOf("waktu") + 1 : 1);
            var cNoRM = headerRM.indexOf("no rm") !== -1 ? headerRM.indexOf("no rm") + 1 : 2;
            var cNamaPasien = headerRM.indexOf("nama pasien") !== -1 ? headerRM.indexOf("nama pasien") + 1 : 3;
            var cAnamnesa = headerRM.indexOf("anamnesa") !== -1 ? headerRM.indexOf("anamnesa") + 1 : 4;
            var cObjektif = headerRM.indexOf("pemeriksaan fisik") !== -1 ? headerRM.indexOf("pemeriksaan fisik") + 1 : (headerRM.indexOf("objektif") !== -1 ? headerRM.indexOf("objektif") + 1 : 5);
            var cDiagnosa = headerRM.indexOf("diagnosa") !== -1 ? headerRM.indexOf("diagnosa") + 1 : 6;
            var cPerawatan = headerRM.indexOf("tindakan") !== -1 ? headerRM.indexOf("tindakan") + 1 : (headerRM.indexOf("perawatan") !== -1 ? headerRM.indexOf("perawatan") + 1 : 7);
            var cProPerawatan = headerRM.indexOf("pro perawatan") !== -1 ? headerRM.indexOf("pro perawatan") + 1 : 8;
            var cProKontrol = headerRM.indexOf("pro kontrol") !== -1 ? headerRM.indexOf("pro kontrol") + 1 : 9;
            var cIdDokter = headerRM.indexOf("id dokter") !== -1 ? headerRM.indexOf("id dokter") + 1 : 10;
            var cFoto = headerRM.indexOf("foto") !== -1 ? headerRM.indexOf("foto") + 1 : (headerRM.indexOf("dokumen") !== -1 ? headerRM.indexOf("dokumen") + 1 : 11);
            var cResep = headerRM.indexOf("resep obat") !== -1 ? headerRM.indexOf("resep obat") + 1 : 12;
            var cTanggalKunjungan = headerRM.indexOf("tanggal kunjungan") !== -1 ? headerRM.indexOf("tanggal kunjungan") + 1 : 13;
  
            var targetTanggalKunjungan = sheetData.tanggalKunjungan || Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
            targetTanggalKunjungan = targetTanggalKunjungan.split(" ")[0].trim();
  
            // 2. UPDATE STATUS ANTREAN 
            var rowPendaftaran = 0;
            if (sheetData.rowUpdate && String(sheetData.rowUpdate) !== "undefined" && String(sheetData.rowUpdate) !== "") {
                rowPendaftaran = parseInt(sheetData.rowUpdate);
            }
  
            var headersPend = sheetPend.getRange(1, 1, 1, sheetPend.getLastColumn()).getValues()[0].map(function(h) { 
                return h.toString().toLowerCase().trim(); 
            });
            var colStatus = headersPend.indexOf("status periksa") !== -1 ? headersPend.indexOf("status periksa") + 1 : 9;
  
            if (rowPendaftaran > 0) {
                sheetPend.getRange(rowPendaftaran, colStatus).setValue("Sudah Diperiksa");
            } else {
                var dataPend = sheetPend.getDataRange().getValues();
                var idxRmPend = headersPend.indexOf("no rm");
                var idxTglPend = headersPend.indexOf("tanggal kunjungan") !== -1 ? headersPend.indexOf("tanggal kunjungan") : 2;
                var idxDokterPend = headersPend.indexOf("id dokter") !== -1 ? headersPend.indexOf("id dokter") : 6;
                
                for (var p = 1; p < dataPend.length; p++) {
                    var checkRmPend = dataPend[p][idxRmPend] ? dataPend[p][idxRmPend].toString().trim().toLowerCase() : "";
                    var checkDokterPend = dataPend[p][idxDokterPend] ? dataPend[p][idxDokterPend].toString().trim().toLowerCase() : "";
                    var cellTgl = dataPend[p][idxTglPend];
                    var tglPendStr = (cellTgl instanceof Date) ? Utilities.formatDate(cellTgl, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd") : cellTgl.toString().split(" ")[0].trim();
                    
                    if (checkRmPend === sheetData.noRM.toString().trim().toLowerCase() && tglPendStr === targetTanggalKunjungan) {
                        if (checkDokterPend === inputIdDokter || checkDokterPend === sheetData.namaDokter.toString().trim().toLowerCase()) {
                            sheetPend.getRange(p + 1, colStatus).setValue("Sudah Diperiksa");
                            break;
                        }
                    }
                }
            }
  
            // 3. DETERMINASI BARIS REKAM MEDIS
            var rowRekamMedis = 0;
            var dataRM = sheetRM.getDataRange().getValues();
            
            for (var r = 1; r < dataRM.length; r++) {
                var rglRM = "";
                if (dataRM[r][cTanggalKunjungan - 1] instanceof Date) {
                    rglRM = Utilities.formatDate(dataRM[r][cTanggalKunjungan - 1], ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
                } else {
                    rglRM = dataRM[r][cTanggalKunjungan - 1].toString().split(" ")[0].trim();
                }
                
                var checkRM = dataRM[r][cNoRM - 1] ? dataRM[r][cNoRM - 1].toString().trim() : "";
                var checkDokter = dataRM[r][cIdDokter - 1] ? dataRM[r][cIdDokter - 1].toString().trim().toLowerCase() : "";
                
                if (checkRM === sheetData.noRM.toString().trim() && rglRM === targetTanggalKunjungan && checkDokter === inputIdDokter) {
                    rowRekamMedis = r + 1; 
                    break;
                }
            }
  
            // 4. EKSEKUSI PENYIMPANAN DATA REKAM MEDIS
            if (rowRekamMedis > 0) {
                var tglValue = sheetRM.getRange(rowRekamMedis, cTanggalKunjungan).getValue(); 
                var tanggalAsliStr = tglValue ? Utilities.formatDate(new Date(tglValue), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd") : targetTanggalKunjungan;
                var hariIniStr = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
  
                if (tanggalAsliStr === hariIniStr) {
                    sheetRM.getRange(rowRekamMedis, cAnamnesa).setValue(sheetData.anamnesa);     
                    sheetRM.getRange(rowRekamMedis, cObjektif).setValue(sheetData.objektif);     
                    sheetRM.getRange(rowRekamMedis, cDiagnosa).setValue(sheetData.diagnosa);     
                    sheetRM.getRange(rowRekamMedis, cPerawatan).setValue(sheetData.perawatan);    
                    sheetRM.getRange(rowRekamMedis, cProPerawatan).setValue(sheetData.proPerawatan); 
                    sheetRM.getRange(rowRekamMedis, cProKontrol).setValue(proKontrolRME);    
                    sheetRM.getRange(rowRekamMedis, cFoto).setValue(tautanFotoFinal);       
                    sheetRM.getRange(rowRekamMedis, cResep).setValue(sheetData.resep);
                    sheetRM.getRange(rowRekamMedis, cTanggalKunjungan).setValue(targetTanggalKunjungan); 
                    sheetRM.getRange(rowRekamMedis, cIdDokter).setValue(sheetData.idDokter || sheetData.idDokder); 
                    logDetail = "Edit RME Hari Ini RM: " + sheetData.noRM;
                } else {
                  // 🔥 LOGIKA KOREKSI (AUDIT TRAIL): BUAT BARIS BARU SEBAGAI REKAM JEJAK
                  // Permintaan Owner: Data asli jangan ditimpa agar bisa diaudit.
                  // Sistem akan membuat BARIS BARU dengan Tanggal Kunjungan masa lalu, 
                  // tapi dengan Timestamp (Waktu Edit) hari ini.
                  
                  var maxKolom = Math.max(13, headerRM.length);
                  var barisBaru = new Array(maxKolom).fill("");
                  
                  barisBaru[cTimestamp - 1] = tanggalSimpan;         // ⏱️ Waktu Edit (Hari Ini)
                  barisBaru[cNoRM - 1] = sheetData.noRM;         
                  barisBaru[cNamaPasien - 1] = sheetData.namaPasien;   
                  barisBaru[cAnamnesa - 1] = sheetData.anamnesa;
                  barisBaru[cObjektif - 1] = sheetData.objektif;
                  barisBaru[cDiagnosa - 1] = sheetData.diagnosa;
                  barisBaru[cPerawatan - 1] = sheetData.perawatan;
                  barisBaru[cProPerawatan - 1] = sheetData.proPerawatan;
                  barisBaru[cProKontrol - 1] = proKontrolRME;
                  barisBaru[cIdDokter - 1] = sheetData.idDokter || sheetData.idDokder;     
                  barisBaru[cFoto - 1] = tautanFotoFinal;
                  barisBaru[cResep - 1] = sheetData.resep;
                  barisBaru[cTanggalKunjungan - 1] = targetTanggalKunjungan; // 🗓️ Tanggal Kunjungan Asli (Masa Lalu)
                  
                  sheetRM.appendRow(barisBaru); // 🎯 KUNCI: Tambah baris baru, bukan menimpa!
                  logDetail = "Input KOREKSI BARU RME RM: " + sheetData.noRM;
                }
            } else {
                var maxKolom = Math.max(13, headerRM.length);
                var barisBaru = new Array(maxKolom).fill("");
                
                barisBaru[cTimestamp - 1] = tanggalSimpan;         
                barisBaru[cNoRM - 1] = sheetData.noRM;         
                barisBaru[cNamaPasien - 1] = sheetData.namaPasien;   
                barisBaru[cAnamnesa - 1] = sheetData.anamnesa;
                barisBaru[cObjektif - 1] = sheetData.objektif;
                barisBaru[cDiagnosa - 1] = sheetData.diagnosa;
                barisBaru[cPerawatan - 1] = sheetData.perawatan;
                barisBaru[cProPerawatan - 1] = sheetData.proPerawatan;
                barisBaru[cProKontrol - 1] = sheetData.proKontrol;
                barisBaru[cIdDokter - 1] = sheetData.idDokter;     
                barisBaru[cFoto - 1] = tautanFotoFinal;
                barisBaru[cResep - 1] = sheetData.resep;
                barisBaru[cTanggalKunjungan - 1] = targetTanggalKunjungan; 
                
                sheetRM.appendRow(barisBaru);
                logDetail = "Input RME BARU RM: " + sheetData.noRM;
            }
            
            if (typeof catatLogAktivitas === "function") {
                catatLogAktivitas(logUser, logRole, "Rekam Medis", (rowRekamMedis > 0 ? "UPDATE" : "CREATE"), logDetail);
            }
  
            // 5. AUTO-SINKRONISASI KE JADWAL KONTROL
            // 5. AUTO-SINKRONISASI KE JADWAL KONTROL (LOGIKA UPSERT ANTI-GANDA)
            if (sheetData.tanggalKontrolTarget && sheetData.tanggalKontrolTarget.trim() !== "") {
                var sheetKontrol = ss.getSheetByName("JadwalKontrol");
                if (sheetKontrol) {
                    var noWaPasien = "-";
                    var sheetMaster = ss.getSheetByName("MasterPasien");
                    if (sheetMaster) {
                        var dataMaster = sheetMaster.getDataRange().getValues();
                        var headMaster = dataMaster[0].map(function(h) { return h.toString().toLowerCase().trim(); });
                        var colRmMaster = headMaster.indexOf("no rm");
                        var colWaMaster = headMaster.indexOf("whatsapp") !== -1 ? headMaster.indexOf("whatsapp") : (headMaster.indexOf("no hp") !== -1 ? headMaster.indexOf("no hp") : (headMaster.indexOf("phone") !== -1 ? headMaster.indexOf("phone") : -1));
                        
                        if (colRmMaster !== -1 && colWaMaster !== -1) {
                            for (var m = 1; m < dataMaster.length; m++) {
                                if (dataMaster[m][colRmMaster] && dataMaster[m][colRmMaster].toString().trim() === sheetData.noRM.toString().trim()) {
                                    noWaPasien = dataMaster[m][colWaMaster] || "-";
                                    break;
                                }
                            }
                        }
                    }
  
                    var dataKontrol = sheetKontrol.getDataRange().getValues();
                    var headKontrol = dataKontrol[0].map(function(h) { return h.toString().toLowerCase().trim(); });
                    
                    var colTglTarget = headKontrol.indexOf("tanggal target") !== -1 ? headKontrol.indexOf("tanggal target") + 1 : 1;
                    var colRmKontrol = headKontrol.indexOf("no rm") !== -1 ? headKontrol.indexOf("no rm") + 1 : 2;
                    var colNamaKontrol = headKontrol.indexOf("nama pasien") !== -1 ? headKontrol.indexOf("nama pasien") + 1 : 3;
                    var colWaKontrol = headKontrol.indexOf("no wa") !== -1 ? headKontrol.indexOf("no wa") + 1 : 4;
                    var colPesanKontrol = headKontrol.indexOf("pesan dokter") !== -1 ? headKontrol.indexOf("pesan dokter") + 1 : 5;
                    var colStatusKontrol = headKontrol.indexOf("status") !== -1 ? headKontrol.indexOf("status") + 1 : 6;
  
                    var isUpdated = false;
                    
                    // 🔥 LOGIKA BARU: Cari berdasarkan No RM dan Status "Menunggu"
                    if (dataKontrol.length > 1) {
                        for (var k = 1; k < dataKontrol.length; k++) {
                            var rmEksis = dataKontrol[k][colRmKontrol - 1] ? dataKontrol[k][colRmKontrol - 1].toString().trim() : "";
                            var statusEksis = dataKontrol[k][colStatusKontrol - 1] ? dataKontrol[k][colStatusKontrol - 1].toString().trim().toLowerCase() : "";
                            
                            // Jika pasiennya sama DAN jadwal sebelumnya masih "Menunggu", kita TIMPA (Update) baris ini!
                            if (rmEksis === sheetData.noRM.toString().trim() && statusEksis === "menunggu") {
                                isUpdated = true;
                                sheetKontrol.getRange(k + 1, colTglTarget).setValue(sheetData.tanggalKontrolTarget); // Timpa Tanggal
                                sheetKontrol.getRange(k + 1, colPesanKontrol).setValue(catatanAsli);        // Timpa Pesan
                                sheetKontrol.getRange(k + 1, colStatusKontrol).setValue("Menunggu");
                                break;
                            }
                        }
                    }
  
                    // Jika tidak ada jadwal "Menunggu" sebelumnya, buat baris baru
                    if (!isUpdated) {
                        var maxKolom = Math.max(6, headKontrol.length);
                        var barisBaruKontrol = new Array(maxKolom).fill("");
                        barisBaruKontrol[colTglTarget - 1] = sheetData.tanggalKontrolTarget;
                        barisBaruKontrol[colRmKontrol - 1] = sheetData.noRM;
                        barisBaruKontrol[colNamaKontrol - 1] = sheetData.namaPasien;
                        barisBaruKontrol[colWaKontrol - 1] = noWaPasien;
                        barisBaruKontrol[colPesanKontrol - 1] = catatanAsli;
                        barisBaruKontrol[colStatusKontrol - 1] = "Menunggu";
                        
                        sheetKontrol.appendRow(barisBaruKontrol);
                    }
                }
            }
  
          // =========================================================================
          // 🔥 LAPIS 1: CATAT TOKEN KE CACHE SERVER (KADALUARSA 6 JAM / 21600 DETIK)
          // =========================================================================
          if (tokenInput) {
              cache.put(tokenInput, "SUDAH_DIPROSES", 21600);
          }
          // =========================================================================
            
            return ContentService.createTextOutput(JSON.stringify({ "result": "success" })).setMimeType(ContentService.MimeType.JSON);
      }
  
      // 1.5 Request BARU: getRekamMedisPasien (Menarik Riwayat & Data Hari Ini)
      if (sheetData.action === "getRekamMedisPasien") {
        try {
          const sheetRM = ss.getSheetByName("RekamMedis");
          const dataRM = sheetRM.getDataRange().getDisplayValues();
          const targetRM = (sheetData.noRM || "").toString().trim().toLowerCase();
      
          // 🔥 UPGRADE: Deteksi Header Otomatis (100% Dinamis & Tahan Banting)
          var hRM = dataRM[0].map(function(h) { return h.toString().toLowerCase().trim(); });
          var cTgl = hRM.indexOf("tanggal") !== -1 ? hRM.indexOf("tanggal") : 0;
          var cRM = hRM.indexOf("no rm") !== -1 ? hRM.indexOf("no rm") : 1;
          var cAnamnesa = hRM.indexOf("anamnesa") !== -1 ? hRM.indexOf("anamnesa") : 3;
          var cObjektif = hRM.findIndex(function(h) { return h.includes("objektif") || h.includes("fisik"); }) !== -1 ? hRM.findIndex(function(h) { return h.includes("objektif") || h.includes("fisik"); }) : 4;
          var cDiag = hRM.indexOf("diagnosa") !== -1 ? hRM.indexOf("diagnosa") : 5;
          var cPerawatan = hRM.findIndex(function(h) { return h.includes("tindakan") || h.includes("perawatan"); }) !== -1 ? hRM.findIndex(function(h) { return h.includes("tindakan") || h.includes("perawatan"); }) : 6;
          var cProPer = hRM.indexOf("pro perawatan") !== -1 ? hRM.indexOf("pro perawatan") : 7;
          var cProKon = hRM.indexOf("pro kontrol") !== -1 ? hRM.indexOf("pro kontrol") : 8;
          var cIdDokter = hRM.indexOf("id dokter") !== -1 ? hRM.indexOf("id dokter") : 9;
          var cFoto = hRM.findIndex(function(h) { return h.includes("foto") || h.includes("dokumen"); }) !== -1 ? hRM.findIndex(function(h) { return h.includes("foto") || h.includes("dokumen"); }) : 10;
          var cResep = hRM.indexOf("resep obat") !== -1 ? hRM.indexOf("resep obat") : (hRM.indexOf("resep") !== -1 ? hRM.indexOf("resep") : 11);
          var cTglKunjungan = hRM.indexOf("tanggal kunjungan") !== -1 ? hRM.indexOf("tanggal kunjungan") : 12;
      
          var normalisasiTanggal = function(str) {
            if (!str) return "";
            var s = str.toString().trim().split(" ")[0]; 
            if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(s)) return s.replace(/\//g, '-');
            var parts = s.split(/[-/]/);
            if (parts.length === 3 && parts[2].length === 4) {
              if (parseInt(parts[1]) > 12) return parts[2] + "-" + parts[0].padStart(2, '0') + "-" + parts[1].padStart(2, '0');
              return parts[2] + "-" + parts[1].padStart(2, '0') + "-" + parts[0].padStart(2, '0');
            }
            return s;
          };
      
          const targetDate = normalisasiTanggal(sheetData.tanggal);
          
          let riwayat = [];
          let hariIni = null;
          let rowHariIni = null;
      
          for (let i = 1; i < dataRM.length; i++) {
            let rowRM = dataRM[i][cRM] ? dataRM[i][cRM].toString().trim().toLowerCase() : ""; 
            
            // Ambil Tanggal Kunjungan yang Valid
            let rawTglKunjungan = dataRM[i][cTglKunjungan] || dataRM[i][cTgl];
            let rowDate = normalisasiTanggal(rawTglKunjungan); 
      
            if (rowRM === targetRM) {
              
              // 🔥 MESIN PEMISAH TANGGAL KONTROL & CATATAN
              var rawProKontrol = dataRM[i][cProKon] || "";
              var extractedDate = "";
              var cleanProKontrol = rawProKontrol;
      
              var regexTgl = /Tgl Kontrol:\s*([0-9]{2,4}-[0-9]{2}-[0-9]{2,4})/i;
              var matchTgl = rawProKontrol.match(regexTgl);
              
              if (matchTgl && matchTgl[1]) {
                  extractedDate = matchTgl[1].trim();
                  if (extractedDate.match(/^[0-9]{2}-[0-9]{2}-[0-9]{4}$/)) {
                      var p = extractedDate.split('-');
                      extractedDate = p[2] + "-" + p[1] + "-" + p[0];
                  }
                  cleanProKontrol = rawProKontrol.replace(/🗓️ Tgl Kontrol:.*?\n📝 Catatan:\s*/g, "").trim();
                  cleanProKontrol = cleanProKontrol.replace(/🗓️ Tgl Kontrol:.*?\n/g, "").trim(); 
              }
      
              var record = {
                tanggal: dataRM[i][cTgl],
                anamnesa: dataRM[i][cAnamnesa] || "",       
                objektif: dataRM[i][cObjektif] || "",       
                diagnosa: dataRM[i][cDiag] || "",       
                perawatan: dataRM[i][cPerawatan] || "",      
                proPerawatan: dataRM[i][cProPer] || "",   
                proKontrol: cleanProKontrol, // 🔥 Teks Murni Tanpa Tanggal
                tanggalKontrol: extractedDate, // 🔥 Tanggal Murni Terpisah
                idDokter: dataRM[i][cIdDokter] || "",       
                linkFoto: dataRM[i][cFoto] || "",      
                resep: dataRM[i][cResep] || ""        
              };
      
              if (rowDate === targetDate) {
                hariIni = record;
                rowHariIni = i + 1; 
              } else {
                riwayat.push(record); 
              }
            }
          }
      
          return ContentService.createTextOutput(JSON.stringify({
            "result": "success",
            "riwayat": riwayat,
            "hariIni": hariIni,
            "rowHariIni": rowHariIni
          })).setMimeType(ContentService.MimeType.JSON);
      
        } catch (error) {
          return ContentService.createTextOutput(JSON.stringify({
            "result": "error",
            "message": error.toString()
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
  
      
  
      // 9. Request BARU: getAllRiwayatMedis (Untuk Pop-up Detail RME)
      if (sheetData.action === "getAllRiwayatMedis") {
          try {
            var sheetRM = ss.getSheetByName("RekamMedis");
            var dataRM = sheetRM.getDataRange().getDisplayValues();
            var dataRMRaw = sheetRM.getDataRange().getValues(); 
            
            var sheetUsers = ss.getSheetByName("Users");
            var dataUsers = sheetUsers.getDataRange().getDisplayValues();
            var mapDokter = {}; 
            
            for (var u = 1; u < dataUsers.length; u++) {
              var idUser = dataUsers[u][0] ? dataUsers[u][0].toString().trim().toLowerCase() : "";
              if (idUser !== "") mapDokter[idUser] = dataUsers[u][1] ? dataUsers[u][1].toString().trim() : "";
            }
  
            var hRM = dataRM[0].map(function(h) { return h.toString().toLowerCase().trim(); });
            var cTgl = hRM.indexOf("tanggal") !== -1 ? hRM.indexOf("tanggal") : 0;
            var cRM = hRM.indexOf("no rm") !== -1 ? hRM.indexOf("no rm") : 1;
            var cNama = hRM.indexOf("nama pasien") !== -1 ? hRM.indexOf("nama pasien") : 2;
            var cAnamnesa = hRM.indexOf("anamnesa") !== -1 ? hRM.indexOf("anamnesa") : 3;
            var cObjektif = hRM.findIndex(function(h) { return h.includes("objektif") || h.includes("fisik"); }) !== -1 ? hRM.findIndex(function(h) { return h.includes("objektif") || h.includes("fisik"); }) : 4;
            var cDiag = hRM.indexOf("diagnosa") !== -1 ? hRM.indexOf("diagnosa") : 5;
            var cPerawatan = hRM.findIndex(function(h) { return h.includes("tindakan") || h.includes("perawatan"); }) !== -1 ? hRM.findIndex(function(h) { return h.includes("tindakan") || h.includes("perawatan"); }) : 6;
            var cProPer = hRM.indexOf("pro perawatan") !== -1 ? hRM.indexOf("pro perawatan") : 7;
            var cProKon = hRM.indexOf("pro kontrol") !== -1 ? hRM.indexOf("pro kontrol") : 8;
            var cIdDokter = hRM.indexOf("id dokter") !== -1 ? hRM.indexOf("id dokter") : 9;
            var cFoto = hRM.findIndex(function(h) { return h.includes("foto") || h.includes("dokumen"); }) !== -1 ? hRM.findIndex(function(h) { return h.includes("foto") || h.includes("dokumen"); }) : 10;
            var cResep = hRM.indexOf("resep obat") !== -1 ? hRM.indexOf("resep obat") : (hRM.indexOf("resep") !== -1 ? hRM.indexOf("resep") : 11);
            
            // 🔥 SUNTIKAN BARU 1: Pelacak dinamis untuk kolom "Tanggal Kunjungan"
            // Jika tidak ditemukan di header, otomatis membaca index 12 (Kolom ke-13)
            var cTglKunjungan = hRM.indexOf("tanggal kunjungan") !== -1 ? hRM.indexOf("tanggal kunjungan") : 12;
  
            var targetRM = (sheetData.noRM || "").toString().trim().toLowerCase();
            var riwayat = [];
            
            var hariIniStr = Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
  
            for (var i = 1; i < dataRM.length; i++) {
              var rowRM = dataRM[i][cRM] ? dataRM[i][cRM].toString().trim().toLowerCase() : "";
              if (rowRM === targetRM) {
                var idDokterAsli = dataRM[i][cIdDokter] || "";
                var idDokterKey = idDokterAsli.toString().trim().toLowerCase();
                var namaDokterFix = mapDokter[idDokterKey] ? mapDokter[idDokterKey] : idDokterAsli;
  
                var isHariIni = false;
                var tglRaw = dataRMRaw[i][cTgl];
                if (tglRaw instanceof Date) {
                  var tglRowStr = Utilities.formatDate(tglRaw, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
                  isHariIni = (tglRowStr === hariIniStr);
                }
  
                riwayat.push({
                  barisSheet: i + 1,
                  isHariIni: isHariIni, 
                  tanggal: dataRM[i][cTgl] || "",
                  noRM: dataRM[i][cRM] || "",
                  namaPasien: dataRM[i][cNama] || "",
                  anamnesa: dataRM[i][cAnamnesa] || "",
                  objektif: dataRM[i][cObjektif] || "",       
                  diagnosa: dataRM[i][cDiag] || "",       
                  perawatan: dataRM[i][cPerawatan] || "",      
                  proPerawatan: dataRM[i][cProPer] || "",   
                  proKontrol: dataRM[i][cProKon] || "",     
                  namaDokter: namaDokterFix,          
                  linkFoto: dataRM[i][cFoto] || "",      
                  resep: dataRM[i][cResep] || "",
                  // 🔥 SUNTIKAN BARU 2: Membaca dan mengirimkan isi "Tanggal Kunjungan" ke frontend
                  tanggalKunjungan: dataRM[i][cTglKunjungan] || ""
                });
              }
            }
            
            return ContentService.createTextOutput(JSON.stringify({ result: "success", data: riwayat })).setMimeType(ContentService.MimeType.JSON);
          } catch (error) {
            return ContentService.createTextOutput(JSON.stringify({ result: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
          }
      }
  
      // =========================================================================
      // 💾 1. BACKEND SIMPAN CONSENT & DIRECT IMAGE LINK (100% BUG-FREE)
      // =========================================================================
      if (sheetData.action === "simpanConsent") {
          try {
              var sheetLog = ss.getSheetByName("LogConsent");
              if (!sheetLog) throw new Error("Sheet LogConsent tidak ditemukan!");
  
              var now = new Date();
              var timestamp = Utilities.formatDate(now, "Asia/Jakarta", "yyyy-MM-dd HH:mm:ss");
              var tanggalKode = Utilities.formatDate(now, "Asia/Jakarta", "yyyyMMdd");
              var idConsent = "CNS-" + tanggalKode + "-" + Math.floor(1000 + Math.random() * 9000);
  
              var noRM = sheetData.noRM || "-";
              var namaPasien = sheetData.namaPasien || "-";
              var tindakan = sheetData.tindakan || "-";
              var risikoTerpilih = Array.isArray(sheetData.risikoTerpilih) ? sheetData.risikoTerpilih.join(", ") : (sheetData.risikoTerpilih || "-");
              var statusTTD = sheetData.statusTTD || "Digital";
              
              var urlBuktiTTD = "-";
              var urlFotoDirect = "-"; // 🔥 Link streaming langsung untuk tag <img> HTML & PDF
  
              if (statusTTD.toLowerCase() === "digital" && sheetData.ttdBase64) {
                  try {
                      var parentName = "Arsip_Consent_Anvaya";
                      var parents = DriveApp.getFoldersByName(parentName);
                      var parentFolder = parents.hasNext() ? parents.next() : DriveApp.createFolder(parentName);
  
                      var subName = "Foto_TTD_Consent";
                      var subs = parentFolder.getFoldersByName(subName);
                      var subFolder = subs.hasNext() ? subs.next() : parentFolder.createFolder(subName);
  
                      var base64Data = sheetData.ttdBase64.replace(/^data:image\/[a-z]+;base64,/, "");
                      var blob = Utilities.newBlob(Utilities.base64Decode(base64Data), "image/png", idConsent + "_" + noRM + ".png");
                      
                      var file = subFolder.createFile(blob);
                      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
                      
                      urlBuktiTTD = file.getUrl(); // Link halaman Google Drive (untuk audit log)
                      urlFotoDirect = "https://lh3.googleusercontent.com/d/" + file.getId(); // 🔥 Direct Image Link!
                  } catch (errDrive) {
                      console.warn("Gagal upload TTD ke Drive:", errDrive);
                      urlBuktiTTD = "Error Upload: " + errDrive.toString();
                  }
              } else if (statusTTD.toLowerCase() === "basah") {
                  urlBuktiTTD = "Arsip Fisik (TTD Basah)";
                  urlFotoDirect = "-";
              }
  
              sheetLog.appendRow([idConsent, timestamp, noRM, namaPasien, tindakan, risikoTerpilih, statusTTD, urlBuktiTTD]);
  
              // 🔥 KEMBALIKAN DIRECT IMAGE LINK KE BROWSER AGAR PREVIEW HTML & PDF BERHASIL:
              return ContentService.createTextOutput(JSON.stringify({
                  result: "success",
                  message: "Informed Consent berhasil disimpan!",
                  idConsent: idConsent,
                  urlBukti: urlBuktiTTD,
                  timestamp: timestamp,
                  "urlFoto": urlFotoDirect,
                  "linkFoto": urlFotoDirect
              })).setMimeType(ContentService.MimeType.JSON);
  
          } catch (errConsent) {
              return ContentService.createTextOutput(JSON.stringify({
                  result: "error",
                  message: "Gagal menyimpan consent: " + errConsent.toString()
              })).setMimeType(ContentService.MimeType.JSON);
          }
      }
  
      // =========================================================================
      // 🖨️ 2. MESIN GENERATOR PDF (WITH POSITIVE OFFSET & RENDERING SLEEP)
      // =========================================================================
      if (sheetData.action === "cetakConsentPDF") {
          try {
              var ss = SpreadsheetApp.getActiveSpreadsheet();
              var sheet = ss.getSheetByName("FormConsent");
              if (!sheet) throw new Error("Sheet 'FormConsent' tidak ditemukan di database.");
  
              var payload = sheetData.data || sheetData;
              var noRM = payload.noRM || "-";
              var jenisKelamin = payload.jenisKelamin || "-";
              var alamat = payload.alamat || "-";
              var umur = payload.umur || "-";
  
              if (noRM !== "-" && (jenisKelamin === "-" || jenisKelamin === "" || jenisKelamin === "undefined")) {
                  try {
                      var sheetMaster = ss.getSheetByName("MasterPasien");
                      if (sheetMaster) {
                          var dataMaster = sheetMaster.getDataRange().getValues();
                          for (var i = 1; i < dataMaster.length; i++) {
                              if (String(dataMaster[i][0]).trim() === String(noRM).trim()) {
                                  jenisKelamin = dataMaster[i][4] || "-"; 
                                  if (alamat === "-" || alamat === "") alamat = dataMaster[i][8] || "-"; 
                                  break;
                              }
                          }
                      }
                  } catch (eMaster) {
                      console.log("Gagal VLOOKUP MasterPasien: " + eMaster.toString());
                  }
              }
              
              sheet.getRange("D7").setValue(payload.namaPasien || "-");
              sheet.getRange("D8").setValue(noRM);
              sheet.getRange("D9").setValue(umur);
              sheet.getRange("D10").setValue(jenisKelamin);
              sheet.getRange("D11").setValue(alamat);
              
              sheet.getRange("H7").setValue(payload.namaDokter || "-");
              sheet.getRange("H8").setValue(payload.tanggalWaktu || Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm"));
  
              sheet.getRange("D15").setValue(payload.diagnosa || "-");
              sheet.getRange("D16").setValue(payload.tindakan || "-");
              sheet.getRange("D17").setValue(payload.tujuan || "Penyembuhan & perbaikan fungsi klinis kedokteran gigi");
  
              sheet.getRange("B20:B24").setValue(false);
              sheet.getRange("D24").clearContent();
  
              var risiko = payload.risiko || [];
              if (Array.isArray(risiko)) {
                  risiko.forEach(function(item) {
                      var teks = item.toString().toLowerCase();
                      if (teks.indexOf("nyeri") !== -1 || teks.indexOf("bengkak") !== -1) sheet.getRange("B20").setValue(true);
                      if (teks.indexOf("darah") !== -1 || teks.indexOf("pendarahan") !== -1) sheet.getRange("B21").setValue(true);
                      if (teks.indexOf("infeksi") !== -1) sheet.getRange("B22").setValue(true);
                      if (teks.indexOf("alergi") !== -1) sheet.getRange("B23").setValue(true);
                      if (teks.indexOf("lain") !== -1) {
                          sheet.getRange("B24").setValue(true);
                          sheet.getRange("D24").setValue(item.replace(/lain-lain:?/i, "").trim());
                      }
                  });
              }
  
              sheet.getRange("B39").setValue(payload.namaDokter || "-");
              sheet.getRange("F39").setValue(payload.namaPenandatangan || payload.namaPasien || "-");
  
              // 🔥 5. INJEKSI GAMBAR TTD (ANGKA POSITIF SAH: Kolom 6=F, Baris 36, OffsetX=25, OffsetY=5)
              var imgInserted = null;
              if (payload.linkFoto && payload.linkFoto !== "-" && payload.linkFoto !== "") {
                  try {
                      var fileId = "";
                      // Ekstrak ID dari format link apa pun (Drive View, UC Export, atau Google Content Direct)
                      var match = payload.linkFoto.match(/id=([a-zA-Z0-9_-]+)/) || payload.linkFoto.match(/d\/([a-zA-Z0-9_-]+)/);
                      if (match && match[1]) fileId = match[1];
                      else if (payload.linkFoto.length > 20 && payload.linkFoto.indexOf("http") === -1) fileId = payload.linkFoto;
  
                      if (fileId !== "") {
                          var imgBlob = DriveApp.getFileById(fileId).getBlob();
                          
                          // Gunakan offsetY = 5 (bilangan positif agar TIDAK ERROR di Apps Script)
                          // Menggunakan Kolom 6 (Kolom F), Baris 36, Dorong Kanan 80px, Geser Bawah 5px
                          imgInserted = sheet.insertImage(imgBlob, 6, 36, 120, 5);
                          imgInserted.setWidth(150);
                          imgInserted.setHeight(55);
                      }
                  } catch (eImg) {
                      console.log("Gagal menyisipkan gambar TTD: " + eImg.toString());
                  }
              }
  
              // 🔥 6. JEDA WAKTU RENDER (1.5 DETIK): Wajib agar gambar sempat menempel di cloud sebelum dijepret PDF!
              SpreadsheetApp.flush();
              Utilities.sleep(1500);
  
              var sheetId = sheet.getSheetId();
              var urlExport = ss.getUrl().replace(/edit$/, '') + 'export?' +
                  'exportFormat=pdf&format=pdf' +
                  '&size=A4&portrait=true&fitw=true&gridlines=false' +
                  '&printtitle=false&sheetnames=false&fzr=false&gid=' + sheetId;
  
              var options = {
                  headers: { 'Authorization': 'Bearer ' + ScriptApp.getOAuthToken() },
                  muteHttpExceptions: true
              };
              var pdfResponse = UrlFetchApp.fetch(urlExport, options);
              var pdfBlob = pdfResponse.getBlob().setName("Informed_Consent_" + (payload.noRM || "Pasien") + "_" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmm") + ".pdf");
  
              // SUBFOLDER: Arsip_Consent_Anvaya -> PDF_Consent
              var parentFolder = DriveApp.getRootFolder();
              try {
                  var parents = DriveApp.getFoldersByName("Arsip_Consent_Anvaya");
                  if (parents.hasNext()) parentFolder = parents.next();
                  else parentFolder = DriveApp.createFolder("Arsip_Consent_Anvaya");
              } catch(eF) {}
              
              var subFolderPdf = parentFolder;
              try {
                  var subsPdf = parentFolder.getFoldersByName("PDF_Consent");
                  subFolderPdf = subsPdf.hasNext() ? subsPdf.next() : parentFolder.createFolder("PDF_Consent");
              } catch(eSub) {}
  
              var pdfFile = subFolderPdf.createFile(pdfBlob);
              pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
              var pdfUrl = pdfFile.getUrl();
  
              // 🔥 JEMBATAN KE KASIR: Simpan URL PDF ke Sheet LogConsent (Kolom 9 / I)
              try {
                  var sheetLog = ss.getSheetByName("LogConsent");
                  if (sheetLog) {
                      var dataLog = sheetLog.getDataRange().getValues();
                      // Cari dari bawah ke atas untuk menemukan consent TERBARU milik noRM ini
                      for (var r = dataLog.length - 1; r >= 1; r--) {
                          if (String(dataLog[r][2]).trim() === String(payload.noRM).trim()) {
                              sheetLog.getRange(r + 1, 9).setValue(pdfUrl); // Simpan ke Kolom I
                              break;
                          }
                      }
                  }
              } catch (eLog) {
                  console.log("Gagal update URL PDF ke LogConsent: " + eLog.toString());
              }
  
              // 🧹 TEMPLATE HYGIENE: BERSIHKAN KEMBALI SHEET FORM CONSENT
              if (imgInserted) {
                  try { imgInserted.remove(); } catch(eRm) {}
              }
              sheet.getRange("D7:D11").clearContent();
              sheet.getRange("H7:H8").clearContent();
              sheet.getRange("D15:D17").clearContent();
              sheet.getRange("B20:B24").setValue(false);
              sheet.getRange("D24").clearContent();
              sheet.getRange("B39").clearContent();
              sheet.getRange("F39").clearContent();
              SpreadsheetApp.flush();
  
              return ContentService.createTextOutput(JSON.stringify({
                  "result": "success",
                  "pdfUrl": pdfUrl,
                  "message": "Dokumen PDF resmi berhasil dicetak!"
              })).setMimeType(ContentService.MimeType.JSON);
  
          } catch (error) {
              return ContentService.createTextOutput(JSON.stringify({
                  "result": "error",
                  "message": "Gagal mencetak PDF: " + error.toString()
              })).setMimeType(ContentService.MimeType.JSON);
          }
      }
  
        
  
  
  }
  