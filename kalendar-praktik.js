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

        fetch(window.WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
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
    // 3. MESIN RENDER KALENDER (HYBRID: PC GRID & MOBILE AGENDA)
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

        // 🔥 INJEKSI OTOMATIS: Membuat Kontainer Agenda Khusus Mobile di Bawah Kalender
        let agendaContainer = document.getElementById('agendaMobileContainer');
        if (!agendaContainer) {
            agendaContainer = document.createElement('div');
            agendaContainer.id = 'agendaMobileContainer';
            const scrollContainer = document.querySelector('.kalender-container-scroll');
            if (scrollContainer) scrollContainer.parentNode.insertBefore(agendaContainer, scrollContainer.nextSibling);
        }
        agendaContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #64748b;">Pilih tanggal untuk melihat jadwal.</div>';

        // Header Hari (Senin - Minggu)
        const namaHariLengkap = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
        const namaHariSingkat = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
        
        namaHariLengkap.forEach((hari, idx) => {
            const selHeader = document.createElement('div');
            selHeader.className = 'header-hari-hybrid';
            selHeader.style.cssText = `
                background: #1e3c72; color: white; font-weight: bold; padding: 12px 5px; 
                text-align: center; font-size: 14px; 
                ${idx === 5 ? 'color: #fcd34d;' : ''} ${idx === 6 ? 'color: #fca5a5;' : ''} 
            `;
            // Trik Hybrid: Menyimpan 2 teks, CSS yang akan menentukan mana yang tampil
            selHeader.innerHTML = `<span class="hari-pc">${hari}</span><span class="hari-hp">${namaHariSingkat[idx]}</span>`;
            gridBody.appendChild(selHeader);
        });

        const hariIni = new Date();
        const formatHariIni = `${hariIni.getFullYear()}-${String(hariIni.getMonth() + 1).padStart(2, '0')}-${String(hariIni.getDate()).padStart(2, '0')}`;

        let hariPertama = new Date(kalenderTahunAktif, kalenderBulanAktif, 1).getDay();
        let indexKolomMulai = (hariPertama === 0) ? 6 : hariPertama - 1;
        const totalHariBulanIni = new Date(kalenderTahunAktif, kalenderBulanAktif + 1, 0).getDate();

        // Mengisi kotak kosong sebelum tanggal 1
        for (let i = 0; i < indexKolomMulai; i++) {
            const selKosong = document.createElement('div');
            selKosong.className = 'sel-kosong-hybrid';
            selKosong.style.cssText = "background: #f8fafc; min-height: 110px; opacity: 0.6;";
            gridBody.appendChild(selKosong);
        }

        let elemenHariIni = null; // Disimpan untuk trigger klik otomatis di HP

        for (let tgl = 1; tgl <= totalHariBulanIni; tgl++) {
            const strTgl = `${kalenderTahunAktif}-${String(kalenderBulanAktif + 1).padStart(2, '0')}-${String(tgl).padStart(2, '0')}`;
            const tglIndo1 = `${String(tgl).padStart(2, '0')}/${String(kalenderBulanAktif + 1).padStart(2, '0')}/${kalenderTahunAktif}`;
            const tglIndo2 = `${String(tgl).padStart(2, '0')}-${String(kalenderBulanAktif + 1).padStart(2, '0')}-${kalenderTahunAktif}`;
            
            const apakahHariIni = (strTgl === formatHariIni);

            const pasienHariIni = cacheDataKalender.filter(p => {
                const teksPasien = JSON.stringify(p);
                return teksPasien.includes(strTgl) || teksPasien.includes(tglIndo1) || teksPasien.includes(tglIndo2);
            });
            const adaPasien = pasienHariIni.length > 0;

            const kotakHari = document.createElement('div');
            kotakHari.className = `sel-kalender-hybrid ${apakahHariIni ? 'is-today' : ''}`;
            
            // 🔥 Sensor Sentuh Khusus HP
            kotakHari.setAttribute('onclick', `if(window.innerWidth <= 768) window.pilihTanggalMobile('${strTgl}', this)`);
            kotakHari.style.cssText = `
                background: ${apakahHariIni ? '#fefce8' : '#ffffff'}; 
                min-height: 115px; padding: 6px; display: flex; flex-direction: column; cursor: pointer;
                ${apakahHariIni ? 'outline: 2px solid #f59e0b; z-index: 2;' : ''}
            `;

            if (apakahHariIni) elemenHariIni = kotakHari;

            let htmlKartu = `
                <div class="header-tgl-hybrid" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                    <span class="angka-tgl-hybrid" style="font-weight: bold; font-size: 13px; color: ${apakahHariIni ? '#d97706' : '#334155'};">
                        <span class="pin-today-pc">${apakahHariIni ? '📍 ' : ''}</span>${tgl}
                    </span>
                    <span class="titik-indikator-mobile" style="${adaPasien ? 'display:block;' : 'display:none;'} width:5px; height:5px; background:#10b981; border-radius:50%; margin-top:2px;"></span>
                </div>
                <div class="wadah-event-desktop">
            `;

            if (adaPasien) {
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

                    // Trik event.stopPropagation() agar klik di PC tidak memicu seleksi Mobile
                    htmlKartu += `
                        <div class="kartu-pasien-kalender" 
                            onclick="window.klikKartuPasienKalender('${noRM}', '${namaPasien.replace(/'/g, "\\'")}', '${idAntrean}'); event.stopPropagation();"
                            style="background: ${bgKartu}; color: ${teksKartu}; border-left: 3px solid ${borderKartu}; ${dicoret}"
                            title="Klik untuk lihat detail ${namaPasien}">
                            <strong>${ikon} ${jam}</strong><br>
                            <span style="font-size:11px; font-weight:bold;">${namaPasien}</span><br>
                            <small style="opacity: 0.85; font-size:9px;">${tujuan}</small>
                        </div>
                    `;
                });
            }

            htmlKartu += `</div>`; 
            kotakHari.innerHTML = htmlKartu;
            gridBody.appendChild(kotakHari);
        }

        // Auto-select untuk Mobile (Pilih hari ini, atau tgl 1 jika sedang memantau bulan lain)
        if (window.innerWidth <= 768) {
            if (elemenHariIni) {
                elemenHariIni.click();
            } else {
                const kotakPertama = gridBody.querySelectorAll('.sel-kalender-hybrid:not(.sel-kosong-hybrid)')[0];
                if(kotakPertama) kotakPertama.click();
            }
        }
    };

    // =====================================================================
    // 🔥 FUNGSI BARU: MESIN PEMBUAT AGENDA MOBILE
    // =====================================================================
    window.pilihTanggalMobile = function(strTgl, elemenKotak) {
        // Hapus penanda dari kotak lain, lalu beri penanda bulat di kotak yang diklik
        document.querySelectorAll('.sel-kalender-hybrid').forEach(el => el.classList.remove('selected-mobile'));
        elemenKotak.classList.add('selected-mobile');

        const agendaContainer = document.getElementById('agendaMobileContainer');
        if (!agendaContainer) return;

        // Ambil data pasien di tanggal yang diklik
        const formatIndo = strTgl.split('-');
        const tglIndo1 = `${formatIndo[2]}/${formatIndo[1]}/${formatIndo[0]}`;
        const tglIndo2 = `${formatIndo[2]}-${formatIndo[1]}-${formatIndo[0]}`;
        const pasienHariIni = cacheDataKalender.filter(p => JSON.stringify(p).includes(strTgl) || JSON.stringify(p).includes(tglIndo1) || JSON.stringify(p).includes(tglIndo2));

        // Format Judul (Contoh: Senin, 31 Agustus 2026)
        const tglObj = new Date(strTgl);
        const namaHariStr = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][tglObj.getDay()];
        const namaBulanStr = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"][tglObj.getMonth()];
        const headerTgl = `${namaHariStr}, ${tglObj.getDate()} ${namaBulanStr} ${tglObj.getFullYear()}`;

        let htmlAgenda = `
            <div style="padding: 15px 10px; background: #f8fafc; border-top: 1px solid #e2e8f0; margin-top: 10px;">
                <h3 style="margin: 0 0 15px 5px; color: #1e3c72; font-size: 15px;">🗓️ ${headerTgl}</h3>
        `;

        if (pasienHariIni.length === 0) {
            htmlAgenda += `<div style="text-align: center; color: #94a3b8; padding: 30px 0; font-style: italic;">Tidak ada janji temu hari ini.</div>`;
        } else {
            htmlAgenda += `<div style="display:flex; flex-direction:column; gap:12px;">`;
            pasienHariIni.forEach(p => {
                const namaPasien = p.nama || p.namaPasien || p[1] || "Pasien";
                const noRM       = p.noRM || p[0] || "";
                const idAntrean  = p.idAntrean || p.rowNumber || "";
                const jam        = p.waktu || p.jam || p[3] || "";
                const tujuan     = p.tujuan || p.keluhan || p[4] || "Konsultasi";
                const statusBersih = (p.status || p[6] || "").toString().toLowerCase().trim();
                
                let bgKartu = "#ffffff"; let ikon = "🔵"; let dicoret = "";
                if (statusBersih.includes("sudah") || statusBersih.includes("selesai")) ikon = "🟢";
                else if (statusBersih.includes("batal") || statusBersih.includes("absen")) { ikon = "🔘"; dicoret = "text-decoration: line-through; opacity: 0.7;"; }
                else if (strTgl === new Date().toISOString().split('T')[0]) ikon = "🟠"; 

                // Kartu Pasien Mode Mobile
                htmlAgenda += `
                    <div onclick="window.klikKartuPasienKalender('${noRM}', '${namaPasien.replace(/'/g, "\\'")}', '${idAntrean}')"
                        style="background: ${bgKartu}; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px rgba(0,0,0,0.03); cursor: pointer; display: flex; align-items:flex-start; gap: 12px; transition: 0.2s; ${dicoret}">
                        
                        <div style="font-size: 14px; font-weight: bold; color: #334155; min-width: 50px; text-align: center; border-right: 1px dashed #cbd5e1; padding-right: 12px;">
                            ${jam}<br><span style="font-size:10px;">${ikon}</span>
                        </div>
                        <div style="flex: 1;">
                            <strong style="font-size:15px; color:#0f172a; display:block; margin-bottom:2px;">${namaPasien}</strong>
                            <small style="color: #64748b; font-size:12px; display:flex; flex-direction:column; gap:3px;">
                                <span>🩺 ${tujuan}</span>
                                <span>🆔 ${noRM}</span>
                            </small>
                        </div>
                    </div>
                `;
            });
            htmlAgenda += `</div>`;
        }
        htmlAgenda += `</div>`;
        agendaContainer.innerHTML = htmlAgenda;
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