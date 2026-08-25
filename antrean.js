// =========================================================================
// 👥 MODUL MANAJEMEN ANTREAN PASIEN
// =========================================================================
(function() {

    // --- VARIABEL PRIVAT MODUL ---
    let currentPageAntrean = 1;
    const limitDataPerHalaman = 10; // Anda bisa mengubah angka ini (misal: 10, 20, 50)

    // =====================================================================
    // 1. RENDER TABEL ANTREAN (TAMPILAN UI)
    // =====================================================================
    window.renderTabelAntrean = function(filterStatus = "Semua") {
        const tbody = document.getElementById('tabelAntreanBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        // A. AMBIL DATA HAK AKSES OPERATOR DARI STORAGE
        const sessionData = JSON.parse(localStorage.getItem('anvaya_session'));
        const perms = sessionData ? sessionData.permissions : {};
        
        const bolehInputRME   = perms.aksesInputRME === 1;
        const bolehEditAntrean = perms.aksesEditAntrean === 1;

        const dataGlobal = window.dataAntreanGlobal || [];

        if (!dataGlobal || dataGlobal.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Tidak ada antrean pasien untuk rentang tanggal ini.</td></tr>`;
            return;
        }

        // 🔥 FILTER DROPDOWN DINAMIS 
        let dataTerfilter = dataGlobal;
        if (filterStatus === "Semua") {
            dataTerfilter = dataGlobal.filter(pasien => !pasien.status.includes("Dibatalkan") && !pasien.status.includes("Tidak Datang"));
        } else if (["Belum Diperiksa", "Sedang Diperiksa", "Sudah Diperiksa", "Tidak Datang"].includes(filterStatus)) {
            dataTerfilter = dataGlobal.filter(pasien => pasien.status.includes(filterStatus));
        } else if (filterStatus === "Perlu Input RME") {
            dataTerfilter = dataGlobal.filter(pasien => pasien.status.includes("Sudah Diperiksa") && !pasien.isRmeFilled);
        }

        if (dataTerfilter.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#7f8c8d; padding: 20px;">Tidak ada data pasien untuk kategori <b>${filterStatus}</b>.</td></tr>`;
            return;
        }

        const h = new Date();
        const formatHariIni = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;

        dataTerfilter.forEach(pasien => {
            
            let statusEfektif = pasien.status;
            // PENENTUAN STATUS DINAMIS
            if (pasien.status.includes("Sudah Diperiksa") && !pasien.isRmeFilled) {
                statusEfektif = "Sedang Diperiksa";
            }

            let badgeClass = "badge-belum";
            if(statusEfektif.includes("Sedang Diperiksa")) badgeClass = "badge-sedang";
            if(statusEfektif.includes("Sudah Diperiksa")) badgeClass = "badge-sudah";

            let rmeStatusIndicator = pasien.isRmeFilled ? 
                '<br><span style="color: #2ecc71; font-size: 11px;">✔️ RME Tersimpan</span>' : 
                '<br><span style="color: #e74c3c; font-size: 11px;">❌ RME Kosong</span>';

            let tombolAksi = "";
            
            // LOGIKA TOMBOL DINAMIS & INJEKSI ROW NUMBER
            if (statusEfektif.includes("Belum Diperiksa")) {
                
                let btnMulai = bolehInputRME ? `<button class="btn-action btn-start" onclick="window.gantiStatusPasien(${pasien.rowNumber}, 'Sedang Diperiksa', '${pasien.noRM}', '${pasien.nama}', '${pasien.tanggalDaftar}')">▶️ Mulai</button>` : '';
                let btnEdit  = bolehEditAntrean ? `<button class="btn-action" style="background-color: #f39c12; color: white;" onclick="window.bukaModalEditAntrean(${pasien.rowNumber}, '${pasien.tanggalDaftar}', '${pasien.waktu}', '${pasien.tujuan}', '${pasien.namaDokter || ''}')">📝 Edit</button>` : '';
                let btnBatal = bolehEditAntrean ? `<button class="btn-action" style="background-color: #e74c3c; color: white;" onclick="window.gantiStatusPasien(${pasien.rowNumber}, 'Dibatalkan')">❌ Batal</button>` : '';
                let btnAbsen = bolehEditAntrean ? `<button class="btn-action" style="background-color: #95a5a6; color: white;" onclick="window.gantiStatusPasien(${pasien.rowNumber}, 'Tidak Datang')">🕒 Absen</button>` : '';

                tombolAksi = `<div style="display: flex; gap: 5px; flex-wrap: wrap;">${btnMulai} ${btnEdit} ${btnBatal} ${btnAbsen}</div>`;
                if (!tombolAksi.trim()) tombolAksi = '<span style="color:#7f8c8d; font-size:12px;">Tidak ada akses</span>';

            } else if (statusEfektif.includes("Sedang Diperiksa")) {
                tombolAksi = bolehInputRME ? `<button class="btn-action" style="background-color: #3498db; color: white; font-weight: bold;" onclick="window.bukaModalRiwayatFull('${pasien.noRM}', '${pasien.nama}', 'input', '${pasien.tanggalDaftar}', '${pasien.rowNumber}')">✍️ Lanjut Input RME</button>` : '<span style="color:#7f8c8d; font-size:12px;">Menunggu Dokter</span>';
            
            } else if (statusEfektif.includes("Sudah Diperiksa")) {
                if (pasien.tanggalDaftar === formatHariIni && perms.editRME === 1) {
                    tombolAksi = `<button class="btn-action btn-rme" style="background-color: #3498db;" onclick="window.bukaModalRiwayatFull('${pasien.noRM}', '${pasien.nama}', 'view', '${pasien.tanggalDaftar}', '${pasien.rowNumber}')">👁️ Buka RME</button>`;
                } else {
                    tombolAksi = `<button class="btn-action btn-rme" style="background-color: #7f8c8d;" onclick="window.bukaModalRiwayatFull('${pasien.noRM}', '${pasien.nama}', 'view', '${pasien.tanggalDaftar}', '${pasien.rowNumber}')">👁️ Lihat RME</button>`;
                }
            }
            else if (pasien.status.includes("Tidak Datang")) {
                tombolAksi = bolehEditAntrean ? `<button class="btn-action" style="background-color: #2ecc71; color: white; font-weight: bold;" onclick="window.gantiStatusPasien(${pasien.rowNumber}, 'Belum Diperiksa')">🔄 Kembalikan ke Antrean</button>` : '-';
            }

            tbody.innerHTML += `<tr>
                <td><strong>${pasien.nama}</strong><br><small>RM: ${pasien.noRM}</small></td>
                <td>${pasien.tanggalDaftar}</td> 
                <td>${pasien.waktu}</td>
                <td>${pasien.tujuan}</td>
                <td style="font-weight:bold; color:#2c3e50;">${pasien.namaDokter || '-'}</td>
                <td>
                    <span class="badge ${badgeClass}">${statusEfektif}</span> 
                    ${statusEfektif.includes("Sudah Diperiksa") ? rmeStatusIndicator : ""}
                </td>
                <td>${tombolAksi}</td>
            </tr>`;
        });
    };

    // =====================================================================
    // 2. EXPORT CSV ANTREAN
    // =====================================================================
    window.unduhLaporanAntrean = function() {
        const tglMulai = document.getElementById('filterTanggalMulai').value;
        const tglAkhir = document.getElementById('filterTanggalAkhir').value;

        if (!tglMulai || !tglAkhir) {
            alert("⚠️ Silakan tentukan rentang tanggal terlebih dahulu!");
            return;
        }

        const sesiAktif = localStorage.getItem('anvaya_session');
        let roleUser = "", idUserDokter = "", usernameUser = "";
        if (sesiAktif) {
            const dataSesi = JSON.parse(sesiAktif);
            roleUser = dataSesi.role; idUserDokter = dataSesi.idUser; usernameUser = dataSesi.username;
        }

        if(!confirm(`Apakah Anda ingin mengunduh semua data antrean periode ${tglMulai} s/d ${tglAkhir}?`)) return;

        // 🔥 FIX BROWSER EVENT: Mengambil tombol dengan aman dari IIFE
        let tombolExport = (window.event && window.event.target) ? window.event.target : null;
        if (!tombolExport || tombolExport.tagName !== 'BUTTON') {
            tombolExport = document.querySelector('button[onclick*="unduhLaporanAntrean"]');
        }
        
        const teksAsli = tombolExport ? tombolExport.innerText : "📥 Export ke Excel/CSV";
        if (tombolExport) {
            tombolExport.innerText = "⏳ Memproses Ekspor...";
            tombolExport.disabled = true;
        }

        const payload = {
            action: "exportQueueData",
            startDate: tglMulai,
            endDate: tglAkhir,
            role: roleUser,
            idDokter: idUserDokter,
            username: usernameUser
        };

        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
        .then(response => response.json())
        .then(res => {
            if (tombolExport) {
                tombolExport.innerText = teksAsli;
                tombolExport.disabled = false;
            }

            if (res.result === "success" && res.data.length > 0) {
                const dataArray = res.data;
                const headers = Object.keys(dataArray[0]);
                
                let csvContent = "\uFEFF"; // BOM untuk UTF-8/Karakter khusus
                csvContent += headers.join(",") + "\n";
                
                dataArray.forEach(row => {
                    let baris = headers.map(header => {
                        let isiKolom = row[header] ? row[header].toString().replace(/"/g, '""') : "";
                        if (isiKolom.includes(",") || isiKolom.includes("\n")) {
                            isiKolom = `"${isiKolom}"`;
                        }
                        return isiKolom;
                    });
                    csvContent += baris.join(",") + "\n";
                });

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                
                link.setAttribute("href", url);
                link.setAttribute("download", `Laporan_Antrean_Klinik_Anvaya_${tglMulai}_to_${tglAkhir}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert("📭 Tidak ditemukan data antrean pada rentang tanggal tersebut.");
            }
        })
        .catch(err => {
            console.error(err);
            if (tombolExport) {
                tombolExport.innerText = teksAsli;
                tombolExport.disabled = false;
            }
            alert("❌ Gagal mengekspor data. Terjadi kesalahan pada server.");
        });
    };

    // =====================================================================
    // 3. FITUR EDIT ANTREAN
    // =====================================================================
    window.tutupModalEdit = function() {
        const modal = document.getElementById('modalEditAntrean');
        if (modal) modal.style.display = 'none';
    };

    window.simpanEditAntrean = function() {
        let rowNumber = document.getElementById('editRowNumber').value;
        let tanggalBaru = document.getElementById('editTanggalInput').value;
        let jamBaru = document.getElementById('editJamSelect').value;
        let tujuanBaru = document.getElementById('editTujuanInput').value;
        let namaDokterBaru = document.getElementById('editDokterSelect').value;

        if (!namaDokterBaru || namaDokterBaru.includes("Tidak ada dokter") || namaDokterBaru.includes("Memuat")) {
            alert("⚠️ Silakan pilih dokter yang valid terlebih dahulu!");
            return;
        }

        const hariIniStr = new Date().toLocaleDateString('en-CA'); 
        if (tanggalBaru < hariIniStr) {
            alert("🚫 TANGGAL TIDAK VALID!\n\nAnda mengetikkan tanggal di masa lalu. Secara logika, pasien tidak mungkin didaftarkan untuk kemarin.");
            document.getElementById('editTanggalInput').value = hariIniStr;
            return; 
        }

        let antreanLokal = window.dataAntreanGlobal || [];

        if (antreanLokal && antreanLokal.length > 0) {
            let formTgl = String(tanggalBaru).trim().substring(0, 10);
            let formJam = String(jamBaru).trim().replace('.', ':').substring(0, 5); 
            let formDokterVal = String(namaDokterBaru).trim().toLowerCase(); 
            let selectDokter = document.getElementById('editDokterSelect');
            let formDokterTeks = selectDokter.selectedIndex >= 0 ? String(selectDokter.options[selectDokter.selectedIndex].text).trim().toLowerCase() : "";

            const konflikJadwal = antreanLokal.find(pasien => {
                let tglPasien = String(pasien.tanggalDaftar || pasien.tglKunjungan || pasien.tanggal || "").trim().substring(0, 10);
                let jamPasien = String(pasien.waktu || pasien.jam || pasien.waktuKunjungan || "").trim().replace('.', ':').substring(0, 5);
                let idDokDb = String(pasien.idDokter || "").trim().toLowerCase();
                let namaDokDb = String(pasien.namaDokter || "").trim().toLowerCase();
                let dokterDb = String(pasien.dokter || "").trim().toLowerCase(); 
                let isDokterSama = false;
                
                if (idDokDb && (idDokDb === formDokterVal || formDokterTeks.includes(idDokDb))) isDokterSama = true;
                if (namaDokDb && (namaDokDb === formDokterVal || formDokterTeks.includes(namaDokDb))) isDokterSama = true;
                if (dokterDb && (dokterDb === formDokterVal || formDokterTeks.includes(dokterDb))) isDokterSama = true;
                
                let isBukanDiriSendiri = String(pasien.rowNumber) !== String(rowNumber);

                return (tglPasien === formTgl) && (jamPasien === formJam) && isDokterSama && isBukanDiriSendiri;
            });

            if (konflikJadwal) {
                let namaKonflik = konflikJadwal.namaPasien || konflikJadwal.nama || "Pasien Lain";
                alert(`🚫 TABRAKAN JADWAL!\n\nDokter bersangkutan sudah di-booking oleh pasien lain:\n👤 Nama: ${namaKonflik}\n🗓️ Tgl: ${tanggalBaru}\n🕒 Jam: ${jamBaru}\n\nSecara logika, dokter tidak bisa menangani 2 pasien bersamaan. Silakan pilih jam atau dokter lain!`);
                return; 
            }
        }

        const sessionData = JSON.parse(localStorage.getItem('anvaya_session'));
        const usernameAktif = sessionData ? sessionData.username : "Anonymous";
        const roleAktif     = sessionData ? sessionData.role : "Staff";

        const payload = {
            action: "editAntreanFull",
            rowNumber: rowNumber,
            tanggal: tanggalBaru,
            jam: jamBaru,
            tujuan: tujuanBaru,
            idDokter: namaDokterBaru,
            operatorUsername: usernameAktif, 
            operatorRole: roleAktif         
        };

        const btnSimpan = document.querySelector('#modalEditAntrean button[onclick*="simpanEditAntrean"]');
        if (btnSimpan) {
            btnSimpan.innerText = "Menyimpan...";
            btnSimpan.disabled = true;
        }

        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Menyimpan Perubahan Jadwal...");

        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
        .then(response => response.json())
        .then(res => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            if (btnSimpan) {
                btnSimpan.innerText = "Simpan";
                btnSimpan.disabled = false;
            }

            if(res.result === "success") {
                alert("✅ Data antrean berhasil diperbarui!");
                window.tutupModalEdit();
                if (typeof window.muatAntreanHariIni === "function") window.muatAntreanHariIni(currentPageAntrean); 
            } else {
                alert("❌ Gagal memperbarui antrean: " + (res.message || "Kesalahan Server"));
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            if (btnSimpan) {
                btnSimpan.innerText = "Simpan";
                btnSimpan.disabled = false;
            }
            console.error("Error saat menyimpan:", err);
            alert("⚠️ Terjadi kesalahan koneksi server.");
        });
    };

    window.bukaModalEditAntrean = function(rowNumber, tanggalSekarang, jamSekarang, tujuanSekarang, namaDokterSekarang) {
        document.getElementById('editRowNumber').value = rowNumber;
        
        // GEMBOK WAKTU
        const inputTanggal = document.getElementById('editTanggalInput');
        const hariIni = new Date().toLocaleDateString('en-CA'); 
        if (inputTanggal) {
            inputTanggal.setAttribute('min', hariIni); 
            inputTanggal.value = tanggalSekarang;
        }

        // DROPDOWN CERDAS JAM
        const inputJam = document.getElementById('editJamSelect');
        if (inputJam) {
            let jamExists = Array.from(inputJam.options).some(opt => opt.value === jamSekarang);
            if (!jamExists && jamSekarang && jamSekarang !== "-") {
                let newJamOption = new Option(jamSekarang, jamSekarang);
                inputJam.add(newJamOption);
            }
            inputJam.value = jamSekarang;
        }
        
        // DROPDOWN CERDAS TUJUAN
        const inputTujuan = document.getElementById('editTujuanInput');
        if (inputTujuan) {
            let optionExists = Array.from(inputTujuan.options).some(opt => opt.value === tujuanSekarang);
            if (!optionExists && tujuanSekarang && tujuanSekarang !== "-") {
                let newOption = new Option(tujuanSekarang, tujuanSekarang);
                inputTujuan.add(newOption);
            }
            inputTujuan.value = tujuanSekarang;
        }
        
        if (typeof window.muatDokterTersedia === "function") {
            window.muatDokterTersedia(tanggalSekarang, jamSekarang, namaDokterSekarang);
        }
        
        const modalEdit = document.getElementById('modalEditAntrean');
        if (modalEdit) modalEdit.style.display = 'flex';
    };

    // =====================================================================
    // 4. MANAJEMEN STATUS PASIEN (MULAI, BATAL, ABSEN)
    // =====================================================================
    window.gantiStatusPasien = function(rowNum, statusBaru, noRM = "", namaPasien = "", tanggalDaftar = "") {
        if(!confirm(`Ubah status pasien menjadi "${statusBaru}"?`)) return;

        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading(`⏳ Memproses status "${statusBaru}"...`);

        const sessionData = JSON.parse(localStorage.getItem('anvaya_session'));
        const usernameAktif = sessionData ? sessionData.username : "Anonymous";
        const roleAktif     = sessionData ? sessionData.role : "Staff";

        const payload = { 
            action: "updateStatus", 
            rowNumber: rowNum, 
            status: statusBaru,
            operatorUsername: usernameAktif, 
            operatorRole: roleAktif         
        };

        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
        .then(response => response.json())
        .then(data => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();

            if (data.result === "success") {
                
                if (window.dataAntreanGlobal && noRM !== "") {
                    const pasienLokal = window.dataAntreanGlobal.find(p => p.rowNumber === rowNum); 
                    if (pasienLokal) {
                        pasienLokal.status = statusBaru;
                        if (statusBaru === "Sedang Diperiksa") pasienLokal.isRmeFilled = false;
                    }
                    let filterDropdown = document.getElementById("filterStatusAntrean");
                    let statusSaatIni = filterDropdown ? filterDropdown.value : "Semua";
                    window.renderTabelAntrean(statusSaatIni); 
                }
                
                if (statusBaru === "Sedang Diperiksa" && noRM !== "" && namaPasien !== "") {
                    if (typeof window.bukaModalRiwayatFull === "function") {
                        window.bukaModalRiwayatFull(noRM, namaPasien, 'input', tanggalDaftar, rowNum);
                    }
                } else if (statusBaru === "Belum Diperiksa") {
                    const sectionRME = document.getElementById('sectionRME');
                    if (sectionRME) sectionRME.style.display = 'none';
                }

                // Refresh Latar Belakang
                setTimeout(() => { 
                    if (typeof window.muatAntreanHariIni === "function") window.muatAntreanHariIni(currentPageAntrean); 
                }, 600);

            } else { 
                alert("❌ Gagal memperbarui status."); 
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            console.error("Error ganti status:", err);
            alert("⚠️ Terjadi kesalahan koneksi saat memperbarui status. Silakan coba lagi.");
        });
    };

    // =====================================================================
    // 5. PENARIKAN DATA UTAMA DARI SERVER
    // =====================================================================
    window.muatAntreanHariIni = function(targetPage = 1) {
        currentPageAntrean = targetPage; 
        
        const inputMulai = document.getElementById('filterTanggalMulai');
        const inputAkhir = document.getElementById('filterTanggalAkhir');
        
        let tglMulai = inputMulai ? inputMulai.value : "";
        let tglAkhir = inputAkhir ? inputAkhir.value : "";

        const hariIni = new Date();
        const formatHariIni = `${hariIni.getFullYear()}-${String(hariIni.getMonth() + 1).padStart(2, '0')}-${String(hariIni.getDate()).padStart(2, '0')}`;
        
        if (!tglMulai) { tglMulai = formatHariIni; if(inputMulai) inputMulai.value = tglMulai; }
        if (!tglAkhir) { tglAkhir = formatHariIni; if(inputAkhir) inputAkhir.value = tglAkhir; }

        let tglAkhirKhususTabel = tglAkhir;
        const start = new Date(tglMulai);
        const end = new Date(tglAkhir);
        const selisihHari = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);

        if (selisihHari > 31) {
            const maxEnd = new Date(start);
            maxEnd.setDate(start.getDate() + 31);
            tglAkhirKhususTabel = `${maxEnd.getFullYear()}-${String(maxEnd.getMonth() + 1).padStart(2, '0')}-${String(maxEnd.getDate()).padStart(2, '0')}`;
        }

        const sesiAktif = localStorage.getItem('anvaya_session');
        let roleUser = "", idUserDokter = "", usernameUser = "";
        if (sesiAktif) {
            const dataSesi = JSON.parse(sesiAktif);
            roleUser = dataSesi.role; idUserDokter = dataSesi.idUser; usernameUser = dataSesi.username;
        }

        let filterDropdown = document.getElementById("filterStatusAntrean");
        let statusSaatIni = filterDropdown ? filterDropdown.value : "Semua";

        const payload = {
            action: "getTodayQueue",
            startDate: tglMulai, 
            endDate: tglAkhirKhususTabel, 
            realToday: formatHariIni,
            role: roleUser,
            idDokter: idUserDokter,
            username: usernameUser,
            statusFilter: statusSaatIni, 
            page: currentPageAntrean,     
            limit: limitDataPerHalaman    
        };

        let teksLoading = tglMulai === tglAkhirKhususTabel ? `tanggal ${tglMulai}` : `periode ${tglMulai} s/d ${tglAkhirKhususTabel}`;
        if (selisihHari > 31) {
            teksLoading += ` <i>(Dibatasi 31 hari di layar)</i>`;
        }
        
        const tbody = document.getElementById('tabelAntreanBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Memuat data halaman ${currentPageAntrean} untuk ${teksLoading}...</td></tr>`;

        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Menarik Data Antrean dari Server...");

        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
        .then(response => response.json())
        .then(data => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();

            if (data.result === "success") {
                const setStat = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
                
                // Stat Antrean
                setStat('statTotal', data.stats.total);
                setStat('statBelum', data.stats.belum);
                setStat('statSedang', data.stats.sedang);
                setStat('statSudah', data.stats.sudah);

                // Stat Beranda
                setStat('homeStatTotal', data.stats.total);
                setStat('homeStatBelum', data.stats.belum);
                setStat('homeStatSedang', data.stats.sedang);
                setStat('homeStatSudah', data.stats.sudah);

                window.dataAntreanGlobal = data.queue;
                window.renderTabelAntrean(statusSaatIni); 
                buatKomponenPagination(data.pagination);
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            console.error(err);
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Gagal mengambil data antrean.</td></tr>`;
        });
    };

    // =====================================================================
    // 6. LOGIKA FILTER LOKAL & VALIDASI TANGGAL (TANPA LOAD SERVER)
    // =====================================================================
    window.filterAntreanLokal = function() {
        let filterDropdown = document.getElementById("filterStatusAntrean");
        let statusPilihan = filterDropdown ? filterDropdown.value : "Semua";

        // Reset selalu ke Halaman 1 jika mengganti filter
        currentPageAntrean = 1;

        if (typeof window.dataAntreanGlobal !== 'undefined' && window.dataAntreanGlobal.length > 0) {
            if (typeof window.renderTabelAntrean === "function") {
                window.renderTabelAntrean(statusPilihan);
            }
        } else {
            if (typeof window.muatAntreanHariIni === "function") {
                window.muatAntreanHariIni(1);
            }
        }
    };

    window.validasiRentangTanggal = function() {
        const inputMulai = document.getElementById('filterTanggalMulai');
        const inputAkhir = document.getElementById('filterTanggalAkhir');
        if (!inputMulai || !inputAkhir) return;
        
        const tglMulai = inputMulai.value;
        const tglAkhir = inputAkhir.value;

        if (tglMulai && tglAkhir) {
            const start = new Date(tglMulai);
            const end = new Date(tglAkhir);
            
            const selisihWaktu = end.getTime() - start.getTime();
            const selisihHari = selisihWaktu / (1000 * 3600 * 24);

            if (selisihHari < 0) {
                alert("⚠️ Tanggal akhir tidak boleh lebih kecil dari tanggal mulai!");
                inputAkhir.value = tglMulai;
            } 
            else if (selisihHari > 31) { 
                alert("ℹ️ Tampilan tabel di layar akan dibatasi maksimal 31 hari pertama untuk menjaga performa sistem.\n\nNamun, Anda tetap bisa menggunakan tombol '📥 Export ke Excel/CSV' untuk mengunduh seluruh data (misal 3 bulan) sesuai tanggal yang Anda pilih.");
            }
        }
        
        window.muatAntreanHariIni(1); 
    };

    // =====================================================================
    // 7. PEMBUAT KOMPONEN PAGINATION (FUNGSI PRIVAT)
    // =====================================================================
    function buatKomponenPagination(infoPaging) {
        const containerUtama = document.getElementById('komponenPagination');
        if (!containerUtama) return; 
        
        if (!infoPaging || infoPaging.totalItems === 0) {
            containerUtama.innerHTML = `<span style="font-size: 13px; color: #7f8c8d;">Menampilkan 0 antrean</span>`;
            return;
        }

        let hitungAwal = (infoPaging.currentPage - 1) * limitDataPerHalaman + 1;
        let hitungAkhir = Math.min(infoPaging.currentPage * limitDataPerHalaman, infoPaging.totalItems);
        
        let htmlInfo = `<div style="font-size: 13px; color: #7f8c8d; font-weight: 500; margin-bottom: 5px;">
                            Menampilkan ${hitungAwal}-${hitungAkhir} dari ${infoPaging.totalItems} antrean
                        </div>`;

        let htmlTombol = `<div style="display: flex; gap: 5px;">`;

        if (infoPaging.currentPage > 1) {
            htmlTombol += `<button onclick="window.muatAntreanHariIni(${infoPaging.currentPage - 1})" class="btn-action" style="padding: 6px 12px; cursor: pointer; border: 1px solid #ddd; background: white; color: #2c3e50; border-radius: 4px; font-weight: bold;">Sebelumnya</button>`;
        } else {
            htmlTombol += `<button disabled style="padding: 6px 12px; color: #a0a0a0; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; cursor: not-allowed;">Sebelumnya</button>`;
        }

        for (let hal = 1; hal <= infoPaging.totalPages; hal++) {
            if (hal === infoPaging.currentPage) {
                htmlTombol += `<button style="padding: 6px 12px; background: #3498db; color: white; border: none; font-weight: bold; border-radius: 4px; min-width: 35px;">${hal}</button>`;
            } else {
                htmlTombol += `<button onclick="window.muatAntreanHariIni(${hal})" class="btn-action" style="padding: 6px 12px; cursor: pointer; border: 1px solid #ddd; background: white; color: #2c3e50; border-radius: 4px; min-width: 35px;">${hal}</button>`;
            }
        }

        if (infoPaging.currentPage < infoPaging.totalPages) {
            htmlTombol += `<button onclick="window.muatAntreanHariIni(${infoPaging.currentPage + 1})" class="btn-action" style="padding: 6px 12px; cursor: pointer; border: 1px solid #ddd; background: white; color: #2c3e50; border-radius: 4px; font-weight: bold;">Berikutnya</button>`;
        } else {
            htmlTombol += `<button disabled style="padding: 6px 12px; color: #a0a0a0; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; cursor: not-allowed;">Berikutnya</button>`;
        }

        htmlTombol += `</div>`;

        containerUtama.style.flexDirection = "column";
        containerUtama.style.alignItems = "center";
        containerUtama.innerHTML = htmlInfo + htmlTombol;
    }

})();