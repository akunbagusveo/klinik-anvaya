// =========================================================================
// 📅 MODUL MESIN KALENDER PRAKTIK DOKTER (FRONTEND CACHING - ZERO LAG)
// =========================================================================
(function() {

    // 1. Variabel Privat Penampung Status Bulan & Tahun Kalender
    let kalenderBulanAktif = new Date().getMonth(); // 0 = Januari, 6 = Juli, dst.
    let kalenderTahunAktif = new Date().getFullYear();
    let cacheDataKalender = []; // Memori RAM untuk menyimpan antrean 1 bulan penuh

    const namaBulanIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    // =====================================================================
    // 2. FUNGSI PENARIKAN DATA KALENDER
    // =====================================================================
    window.muatKalenderDokter = function() {
        const gridBody = document.getElementById('gridKalenderBody');
        const labelBulan = document.getElementById('labelBulanTahunKalender');
        if (!gridBody) return;

        if (labelBulan) {
            labelBulan.innerText = `${namaBulanIndo[kalenderBulanAktif]} ${kalenderTahunAktif}`;
        }

        gridBody.innerHTML = `
            <div style="grid-column: span 7; background: #e0f2fe; color: #0369a1; padding: 40px; text-align: center; font-weight: bold; border-radius: 6px; border: 1px dashed #0284c7;">
                ⏳ Mengsinkronkan jadwal bulan ${namaBulanIndo[kalenderBulanAktif]} ${kalenderTahunAktif} dari server...
            </div>
        `;

        if (typeof window.tampilkanLoading === "function") {
            window.tampilkanLoading(`⏳ Mengunduh Kalender ${namaBulanIndo[kalenderBulanAktif]} ${kalenderTahunAktif}...`);
        }

        const tglMulai = `${kalenderTahunAktif}-${String(kalenderBulanAktif + 1).padStart(2, '0')}-01`;
        const hariTerakhir = new Date(kalenderTahunAktif, kalenderBulanAktif + 1, 0).getDate();
        const tglSelesai = `${kalenderTahunAktif}-${String(kalenderBulanAktif + 1).padStart(2, '0')}-${String(hariTerakhir).padStart(2, '0')}`;

        const sesiAktif = JSON.parse(localStorage.getItem('anvaya_session') || '{}');

        const payload = {
            action: "getTodayQueue", 
            startDate: tglMulai,
            endDate: tglSelesai,
            realToday: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
            role: sesiAktif.role || "",
            idDokter: sesiAktif.idUser || "",
            username: sesiAktif.username || "",
            statusFilter: "Semua", 
            page: 1,
            limit: 500 
        };

        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
        .then(response => response.json())
        .then(data => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();

            if (data && (data.result === "success" || data.status === "success")) {
                cacheDataKalender = data.queue || data.data || [];
                window.renderKalenderInstan();
            } else {
                gridBody.innerHTML = `<div style="grid-column: span 7; background: #fee2e2; color: #991b1b; padding: 30px; text-align: center; font-weight: bold;">❌ Gagal dari server: ${data.message || "Format respon tidak dikenali."}</div>`;
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            console.error("Gagal koneksi kalender:", err);
            gridBody.innerHTML = `<div style="grid-column: span 7; background: #fee2e2; color: #991b1b; padding: 30px; text-align: center; font-weight: bold;">⚠️ Terjadi gangguan jaringan saat memuat jadwal kalender.</div>`;
        });
    };

    // =====================================================================
    // 3. MESIN RENDER KALENDER (GAYA GOOGLE SHEET - PRESISI TINGGI)
    // =====================================================================
    window.renderKalenderInstan = function() {
        const gridBody = document.getElementById('gridKalenderBody');
        if (!gridBody) return;

        const tabPembungkus = gridBody.closest('.tab-content');
        if (tabPembungkus) {
            document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
            tabPembungkus.style.display = 'block';
            tabPembungkus.classList.add('active');
        }

        gridBody.innerHTML = ""; 

        const namaHari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
        namaHari.forEach((hari, idx) => {
            const selHeader = document.createElement('div');
            selHeader.style.cssText = `
                background: #1e3c72; 
                color: white; 
                font-weight: bold; 
                padding: 12px 5px; 
                text-align: center; 
                font-size: 14px; 
                ${idx === 5 ? 'color: #fcd34d;' : ''} 
                ${idx === 6 ? 'color: #fca5a5;' : ''} 
            `;
            selHeader.innerText = hari;
            gridBody.appendChild(selHeader);
        });

        const hariIni = new Date();
        const formatHariIni = `${hariIni.getFullYear()}-${String(hariIni.getMonth() + 1).padStart(2, '0')}-${String(hariIni.getDate()).padStart(2, '0')}`;

        let hariPertama = new Date(kalenderTahunAktif, kalenderBulanAktif, 1).getDay();
        let indexKolomMulai = (hariPertama === 0) ? 6 : hariPertama - 1;
        const totalHariBulanIni = new Date(kalenderTahunAktif, kalenderBulanAktif + 1, 0).getDate();

        for (let i = 0; i < indexKolomMulai; i++) {
            const selKosong = document.createElement('div');
            selKosong.style.cssText = "background: #f8fafc; min-height: 110px; opacity: 0.6;";
            gridBody.appendChild(selKosong);
        }

        for (let tgl = 1; tgl <= totalHariBulanIni; tgl++) {
            const strTgl = `${kalenderTahunAktif}-${String(kalenderBulanAktif + 1).padStart(2, '0')}-${String(tgl).padStart(2, '0')}`;
            const tglIndo1 = `${String(tgl).padStart(2, '0')}/${String(kalenderBulanAktif + 1).padStart(2, '0')}/${kalenderTahunAktif}`;
            const tglIndo2 = `${String(tgl).padStart(2, '0')}-${String(kalenderBulanAktif + 1).padStart(2, '0')}-${kalenderTahunAktif}`;
            
            const apakahHariIni = (strTgl === formatHariIni);

            const kotakHari = document.createElement('div');
            kotakHari.style.cssText = `
                background: ${apakahHariIni ? '#fefce8' : '#ffffff'}; 
                min-height: 115px; 
                padding: 6px; 
                display: flex; 
                flex-direction: column;
                ${apakahHariIni ? 'outline: 2px solid #f59e0b; z-index: 2;' : ''}
            `;

            let htmlKartu = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                    <span style="font-weight: bold; font-size: 13px; color: ${apakahHariIni ? '#d97706' : '#334155'};">
                        ${apakahHariIni ? '📍 ' : ''}${tgl}
                    </span>
                </div>
            `;

            const pasienHariIni = cacheDataKalender.filter(p => {
                const teksPasien = JSON.stringify(p);
                return teksPasien.includes(strTgl) || teksPasien.includes(tglIndo1) || teksPasien.includes(tglIndo2);
            });

            if (pasienHariIni.length > 0) {
                pasienHariIni.forEach(p => {
                    const namaPasien = p.nama || p.namaPasien || p[1] || "Pasien";
                    const noRM       = p.noRM || p[0] || "";
                    const idAntrean  = p.idAntrean || p.rowNumber || "";
                    const jam        = p.waktu || p.jam || p[3] || "";
                    const tujuan     = p.tujuan || p.keluhan || p[4] || "Konsultasi";
                    const statusBersih = (p.status || p[6] || "").toString().toLowerCase().trim();
                    
                    let bgKartu = "#e0f2fe"; let teksKartu = "#075985"; let borderKartu = "#0ea5e9"; let ikon = "🔵"; let dicoret = "";

                    if (statusBersih.includes("sudah") || statusBersih.includes("selesai")) {
                        bgKartu = "#d1fae5"; teksKartu = "#065f46"; borderKartu = "#10b981"; ikon = "🟢"; 
                    } else if (statusBersih.includes("batal") || statusBersih.includes("absen") || statusBersih.includes("tidak datang")) {
                        bgKartu = "#f1f5f9"; teksKartu = "#64748b"; borderKartu = "#cbd5e1"; ikon = "🔘"; dicoret = "text-decoration: line-through;"; 
                    } else if (apakahHariIni) {
                        bgKartu = "#fef3c7"; teksKartu = "#92400e"; borderKartu = "#f59e0b"; ikon = "🟠"; 
                    }

                    // 🔥 UPGRADE PROTEKSI: namaPasien di-escape (replace) agar kutip tunggal tidak merusak onClick
                    htmlKartu += `
                        <div class="kartu-pasien-kalender" 
                            onclick="window.klikKartuPasienKalender('${noRM}', '${namaPasien.replace(/'/g, "\\'")}', '${idAntrean}')"
                            style="background: ${bgKartu}; color: ${teksKartu}; border-left: 3px solid ${borderKartu}; ${dicoret}"
                            title="Klik untuk lihat detail ${namaPasien}">
                            <strong>${ikon} ${jam}</strong><br>
                            <span style="font-size:11px; font-weight:bold;">${namaPasien}</span><br>
                            <small style="opacity: 0.85; font-size:9px;">${tujuan}</small>
                        </div>
                    `;
                });
            }

            kotakHari.innerHTML = htmlKartu;
            gridBody.appendChild(kotakHari);
        }
    };

    // =====================================================================
    // 4. KONTROL NAVIGASI BULAN KALENDER
    // =====================================================================
    window.navigasiBulanKalender = function(step) {
        kalenderBulanAktif += step;
        if (kalenderBulanAktif < 0) {
            kalenderBulanAktif = 11;
            kalenderTahunAktif--;
        } else if (kalenderBulanAktif > 11) {
            kalenderBulanAktif = 0;
            kalenderTahunAktif++;
        }
        window.muatKalenderDokter(); 
    };

    window.resetKeBulanIni = function() {
        const hariIni = new Date();
        kalenderBulanAktif = hariIni.getMonth();
        kalenderTahunAktif = hariIni.getFullYear();
        window.muatKalenderDokter();
    };

    // =====================================================================
    // 5. MESIN POP-UP MODAL KALENDER & SMART ROUTING KE RME
    // =====================================================================
    window.klikKartuPasienKalender = function(noRM, namaPasien, idAntrean) {
        const dataPasien = cacheDataKalender.find(p => (p.noRM || p[0]) === noRM && (p.idAntrean || p.rowNumber || "") == idAntrean) || {};
        
        const keluhan    = dataPasien.tujuan || dataPasien.keluhan || dataPasien[4] || "Konsultasi Umum";
        const jam        = dataPasien.waktu || dataPasien.jam || dataPasien[3] || "-";
        const status     = (dataPasien.status || dataPasien[6] || "Belum Diperiksa").toString().trim();
        const namaDokter = dataPasien.dokter || dataPasien.namaDokter || dataPasien[5] || "Dokter Praktik";

        document.getElementById('modKalNamaPasien').innerText = namaPasien;
        document.getElementById('modKalNoRM').innerText = `NO. RM: ${noRM}`;
        document.getElementById('modKalDokter').innerText = namaDokter;
        document.getElementById('modKalJam').innerText = jam;
        document.getElementById('modKalKeluhan').innerText = keluhan;

        const elStatus = document.getElementById('modKalStatus');
        if (elStatus) {
            elStatus.innerText = status;
            if (status.toLowerCase().includes("sudah") || status.toLowerCase().includes("selesai")) {
                elStatus.style.cssText = "background: #d1fae5; color: #065f46; padding: 3px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; display: inline-block;";
            } else if (status.toLowerCase().includes("batal") || status.toLowerCase().includes("absen")) {
                elStatus.style.cssText = "background: #f1f5f9; color: #64748b; padding: 3px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; display: inline-block;";
            } else {
                elStatus.style.cssText = "background: #fef3c7; color: #92400e; padding: 3px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; display: inline-block;";
            }
        }

        const btnLihatRME = document.getElementById('btnModKalLihatRME');
        if (btnLihatRME) {
            btnLihatRME.onclick = function() {
                window.bukaRMEOtomatisDariKalender(noRM, namaPasien);
            };
        }

        const modal = document.getElementById('modalSummaryKalender');
        if (modal) modal.style.display = 'flex';
    };

    window.tutupModalKalender = function() {
        const modal = document.getElementById('modalSummaryKalender');
        if (modal) modal.style.display = 'none';
    };

    // =====================================================================
    // 6. MESIN JALAN TOL KE RME (SMART ROUTING)
    // =====================================================================
    window.bukaRMEOtomatisDariKalender = function(noRM, namaPasien) {
        window.tutupModalKalender();

        if (typeof window.switchTab === "function") {
            window.switchTab('riwayatMedis');
        }

        setTimeout(() => {
            const rmBersih = (noRM || "").toString().trim().toUpperCase();
            const namaBersih = (namaPasien || "").toString().trim();
            
            const inputGlobal = document.getElementById('txtCariRiwayatGlobal');
            
            if (inputGlobal) {
                const kataKunci = (rmBersih && rmBersih !== "-" && rmBersih !== "UNDEFINED") ? rmBersih : namaBersih;
                
                inputGlobal.value = kataKunci;
                
                inputGlobal.dispatchEvent(new Event('input', { bubbles: true }));
                inputGlobal.dispatchEvent(new Event('change', { bubbles: true }));

                console.log(`🚀 [SMART ROUTING] Mengirim keyword "${kataKunci}" ke cariPasienGlobal()...`);

                // 🔥 AMAN DARI ERROR IIFE
                if (typeof window.cariPasienGlobal === "function") {
                    window.cariPasienGlobal();
                } else {
                    const btnCari = document.querySelector('#riwayatMedis button[onclick*="cariPasienGlobal"]') || 
                                    document.querySelector('button[onclick*="cariPasienGlobal"]');
                    if (btnCari) btnCari.click();
                }
            } else {
                alert("❌ ERROR: Input dengan ID 'txtCariRiwayatGlobal' tidak ditemukan di layar ini.");
            }
        }, 350); 
    };

})();