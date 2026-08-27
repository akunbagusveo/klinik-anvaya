// =========================================================================
// 💰 MODUL KASIR & BILLING (DENGAN RADAR PING & KUITANSI PDF)
// =========================================================================
(function() {

    // Variabel Global khusus Kasir (Didaftarkan ke window agar aman terbaca lintas fungsi)
    window.totalTindakanAktifKasir = 0;
    window.currentKasirQueueData = [];

    // =====================================================================
    // 1. PEMUAT ANTREAN KASIR (DENGAN SMART RADAR CETAK CONSENT)
    // =====================================================================
    window.muatAntreanKasir = function() {
        const tbody = document.getElementById('tbodyAntreanKasir');
        if (!tbody) return;

        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #7f8c8d; font-weight: bold;">Mengambil data antrean kasir... ⏳</td></tr>`;

        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Menarik Data Antrean Kasir dari Server...");

        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getAntreanKasir" })
        })
        .then(res => res.json())
        .then(res => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();

            tbody.innerHTML = ""; 
            
            if (res.result !== "success") {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #e74c3c; font-weight: bold;">❌ Gagal memuat data: ${res.message}</td></tr>`;
                return;
            }

            if (!res.data || res.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: #27ae60; font-weight: bold;">🎉 Semua antrean pembayaran hari ini telah lunas dibayar!</td></tr>`;
                return;
            }

            window.currentKasirQueueData = res.data;

            res.data.forEach(p => {
                let htmlTindakanRingkas = "-";
                let butuhConsent = false;
                
                const savedPdf = localStorage.getItem('pdf_url_consent_' + p.noRM);
                const savedTtd = localStorage.getItem('ttd_consent_' + p.noRM);
                if ((savedPdf && savedPdf !== "-" && savedPdf !== "undefined") || 
                    (savedTtd && savedTtd !== "-" && savedTtd !== "undefined")) {
                    butuhConsent = true;
                }

                try {
                    let arrTindakan = JSON.parse(p.tindakanRaw);
                    if (Array.isArray(arrTindakan) && arrTindakan.length > 0) {
                        if (arrTindakan.length > 1) {
                            htmlTindakanRingkas = `<strong style="color: #2c3e50;">${arrTindakan[0].namaTindakan}</strong> <span style="color: #ebd3c7; background: #fdf2e9; padding: 2px 5px; border-radius: 3px; font-size: 11px; font-weight: bold; margin-left: 4px;">+${arrTindakan.length - 1} lainnya</span>`;
                        } else {
                            htmlTindakanRingkas = `<span style="color: #2c3e50; font-weight: 500;">${arrTindakan[0].namaTindakan}</span>`;
                        }

                        if (!butuhConsent) {
                            arrTindakan.forEach(t => {
                                let teks = String(t.namaTindakan || "").trim().toLowerCase();
                                let isBerisiko = false;
                                
                                const masterArray = window.masterTindakanGlobal || [];
                                const foundItem = masterArray.find(item => String(item.nama || "").trim().toLowerCase() === teks);
                                if (foundItem) {
                                    const valConsent = foundItem.Butuh_Consent || foundItem.butuhConsent || 0;
                                    if (String(valConsent) === "1" || valConsent === 1 || String(valConsent).toLowerCase() === "true") isBerisiko = true;
                                }
                                
                                if (!isBerisiko) {
                                    if (teks.includes("odontektomi") || teks.includes("exo") || teks.includes("cabut") || 
                                        teks.includes("implan") || teks.includes("bedah") || teks.includes("insisi") || 
                                        teks.includes("gingiv") || teks.includes("frenektomi") || teks.includes("alveol") || 
                                        teks.includes("operkul") || teks.includes("kista") || teks.includes("graft") || 
                                        teks.includes("sinus") || teks.includes("valplas") || teks.includes("crown")) {
                                        isBerisiko = true;
                                    }
                                }
                                
                                if (isBerisiko) butuhConsent = true; 
                            });
                        }
                    }
                } catch (e) {
                    htmlTindakanRingkas = p.tindakanRaw || "-";
                }

                let btnCetakConsentHtml = "";
                const serverPdf = p.pdfConsentUrl || ""; 
                
                if (butuhConsent || serverPdf !== "") {
                    btnCetakConsentHtml = `
                        <button onclick="window.cetakConsentKasir('${p.noRM}', '${serverPdf}')" 
                                style="background-color: #3498db; color: white; border: none; padding: 6px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; margin-right: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" title="Cetak Dokumen Informed Consent Pasien">
                            🖨️ Cetak Consent
                        </button>
                    `;
                }

                const tr = document.createElement('tr');
                tr.style.borderBottom = "1px solid #dee2e6";

                // 🔥 FITUR BARU: Mencegah cetak "Dr. dr. Aldila"
                let namaDokterTampil = String(p.namaDokter || "").trim();
                if (!namaDokterTampil.toLowerCase().includes("dr.") && !namaDokterTampil.toLowerCase().includes("dr ")) {
                    namaDokterTampil = "dr. " + namaDokterTampil;
                }

                tr.innerHTML = `
                    <td style="padding: 12px 10px; font-weight: bold; color: #2980b9; vertical-align: middle;">${p.noRM}</td>
                    <td style="padding: 12px 10px; font-weight: 600; vertical-align: middle; line-height: 1.4;">
                        ${p.namaPasien}
                    </td>
                    <td style="padding: 12px 10px; color: #7f8c8d; vertical-align: middle;">${p.tanggalDaftar}</td>
                    <td style="padding: 12px 10px; vertical-align: middle;">🩺 ${namaDokterTampil}</td>
                    <td style="padding: 12px 10px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle;" title="Klik Proses Bayar untuk detail lengkap">
                        ${htmlTindakanRingkas}
                    </td>
                    <td style="padding: 12px 10px; vertical-align: middle;">
                        <span style="background-color: #fce4d6; color: #c65911; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">
                            ${p.statusBayar}
                        </span>
                    </td>
                    <td style="padding: 12px 10px; text-align: center; vertical-align: middle;">
                        <div style="display: flex; gap: 6px; justify-content: center; align-items: stretch; flex-wrap: wrap;">
                            ${btnCetakConsentHtml}
                            <button onclick="window.kirimPingAsisten('${p.namaPasien}')" 
                                    style="background-color: #f39c12; color: white; border: none; padding: 6px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; white-space: nowrap;" title="Ingatkan dokter/asisten untuk input RME">
                                🔔 Ping
                            </button>
                            <button onclick="window.bukaModalProsesBilling('${p.noRM}', '${JSON.stringify(p.barisPendaftaran).replace(/"/g, '&quot;')}')" 
                                    style="background-color: #2ecc71; color: white; border: none; padding: 6px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; white-space: nowrap;">
                                💰 Proses Bayar
                            </button>
                        </div>
                    </td>
                `;

                tbody.appendChild(tr);
            });
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #e74c3c; font-weight: bold;">⚠️ Gangguan koneksi jaringan antrean kasir.</td></tr>`;
        });
    };

    // =====================================================================
    // 2. AKSI TOMBOL CETAK CONSENT
    // =====================================================================
    window.cetakConsentKasir = function(noRM, serverPdfUrl = "") {
        const cleanNoRM = String(noRM).trim();
        
        if (serverPdfUrl && serverPdfUrl.startsWith('http')) {
            window.open(serverPdfUrl, '_blank');
            return;
        }

        const savedPdf = localStorage.getItem('pdf_url_consent_' + cleanNoRM);
        const savedTtd = localStorage.getItem('ttd_consent_' + cleanNoRM);
        
        if (savedPdf && savedPdf.startsWith('http')) {
            window.open(savedPdf, '_blank');
        } else if (savedTtd && savedTtd.startsWith('http')) {
            window.open(savedTtd, '_blank');
        } else {
            alert("⚠️ Dokumen PDF masih dalam proses pembuatan di server, atau dokter belum menekan tombol 'Simpan Persetujuan'.\n\nSilakan klik tombol '🔄 Segarkan Antrean' dalam beberapa detik, lalu coba cetak kembali.");
        }
    };

    // =====================================================================
    // 3. FUNGSI PEMBUKA & PENUTUP MODAL BILLING
    // =====================================================================
    window.bukaModalProsesBilling = function(noRM, barisPendaftaranStr) {
        if (!window.currentKasirQueueData) return;
        const pasien = window.currentKasirQueueData.find(p => p.noRM === noRM && JSON.stringify(p.barisPendaftaran) === barisPendaftaranStr);
        if (!pasien) {
            alert("⚠️ Data antrean pasien gagal dibaca dari memori.");
            return;
        }

        document.getElementById('billNoRM').innerText = pasien.noRM;
        document.getElementById('billNama').innerText = pasien.namaPasien;
        document.getElementById('billDokter').innerText = pasien.namaDokter;
        document.getElementById('billTanggal').innerText = pasien.tanggalDaftar;
        document.getElementById('billBarisPendaftaran').value = JSON.stringify(pasien.barisPendaftaran);
        
        const inpDiskon = document.getElementById('inpBillDiskon');
        if (inpDiskon) inpDiskon.value = "";

        const tbody = document.getElementById('tbodyItemBilling');
        if (tbody) tbody.innerHTML = "";
        
        window.totalTindakanAktifKasir = 0;

        try {
            let arrTindakan = JSON.parse(pasien.tindakanRaw);
            if (Array.isArray(arrTindakan) && arrTindakan.length > 0) {
                arrTindakan.forEach(t => {
                    const hargaMurniItem = Number(t.hargaDiinput || t.hargaBersihPerItem) || 0;
                    window.totalTindakanAktifKasir += hargaMurniItem;
                    
                    // 🔥 FITUR BARU: Mencegah cetak "Dr. dr. Aldila" di rincian tindakan
                    let namaDokterTindakan = String(t.dokterPelaksana || 'Umum').trim();
                    if (namaDokterTindakan !== 'Umum' && !namaDokterTindakan.toLowerCase().includes("dr.") && !namaDokterTindakan.toLowerCase().includes("dr ")) {
                        namaDokterTindakan = "dr. " + namaDokterTindakan;
                    }

                    let tr = document.createElement('tr');
                    tr.style.borderBottom = "1px solid #f2f4f4";
                    tr.innerHTML = `
                        <td style="padding: 8px; font-weight: 600; color: #34495e;">
                            ${t.namaTindakan} <br>
                            <span style="font-size:10px; color:#16a085; font-weight: bold;">👨‍⚕️ ${namaDokterTindakan}</span>
                        </td>
                        <td style="padding: 8px; color: #7f8c8d; font-style: italic;">${t.catatanKlinis || '-'}</td>
                        <td style="padding: 8px; text-align: right; font-weight: bold;">Rp ${hargaMurniItem.toLocaleString('id-ID')}</td>
                    `;
                    if (tbody) tbody.appendChild(tr);
                });
            } else {
                if (tbody) tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:15px; color:gray;">⚠️ Tidak ada rincian tindakan medis.</td></tr>`;
            }
        } catch (e) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:15px; color:red;">⚠️ Error membaca data tindakan.</td></tr>`;
        }

        const lblTotal = document.getElementById('lblBillTotalTindakan');
        if (lblTotal) lblTotal.innerText = "Rp " + window.totalTindakanAktifKasir.toLocaleString('id-ID');
        
        window.hitungGrandTotalBillingRealtime();
        
        const modal = document.getElementById('modalBillingKasir');
        if (modal) modal.style.display = 'flex';
    };

    window.tutupModalBilling = function() {
        const modal = document.getElementById('modalBillingKasir');
        if (modal) modal.style.display = 'none';
    };

    window.hitungGrandTotalBillingRealtime = function() {
        const inpDiskon = document.getElementById('inpBillDiskon');
        if (!inpDiskon) return;

        let nominalDiskon = Number(inpDiskon.value.replace(/[^0-9]/g, '')) || 0;

        if (nominalDiskon > window.totalTindakanAktifKasir) nominalDiskon = window.totalTindakanAktifKasir;
        inpDiskon.value = nominalDiskon ? nominalDiskon.toLocaleString('id-ID') : '';

        let grandTotalHariIni = window.totalTindakanAktifKasir - nominalDiskon;
        
        const lblGrandTotal = document.getElementById('lblBillGrandTotal');
        if (lblGrandTotal) lblGrandTotal.innerText = "Rp " + grandTotalHariIni.toLocaleString('id-ID');
    };

    // =====================================================================
    // 4. LOGIKA PEMBAYARAN & CETAK PDF
    // =====================================================================
    window.eksekusiFinalBilling = function(noRM) {
        const barisPendaftaran = document.getElementById('billBarisPendaftaran').value;
        const namaPasien = document.getElementById('billNama').innerText;
        const metodeBayar = document.getElementById('selBillMetode').value;
        const btnKunciCetak = document.getElementById('btnKunciCetak');
        
        const diskonMurni = Number(document.getElementById('inpBillDiskon').value.replace(/[^0-9]/g, '')) || 0;
        const grandTotalMurni = window.totalTindakanAktifKasir - diskonMurni;
        
        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        
        // 🔥 FITUR BARU: Menggunakan Nama Lengkap untuk Nama Kasir yang bertugas mencetak Kuitansi
        const usernameAktif = sessionData.namaLengkap || sessionData.username || "Staf Kasir";

        if (!barisPendaftaran) {
            alert("⚠️ Gagal memproses, indeks baris antrean terputus. Silakan muat ulang halaman.");
            return;
        }

        const pasien = window.currentKasirQueueData.find(p => p.noRM === noRM && JSON.stringify(p.barisPendaftaran) === barisPendaftaran);
        const tindakanRawStr = pasien ? pasien.tindakanRaw : "[]";

        let pesanKonfirmasi = `Konfirmasi Pembayaran & Cetak Kuitansi:\nPasien: ${namaPasien}\n`;
        pesanKonfirmasi += `Tindakan Medis (Nett): Rp ${grandTotalMurni.toLocaleString('id-ID')}\n`;
        pesanKonfirmasi += `\nTOTAL DIBAYAR HARI INI: Rp ${grandTotalMurni.toLocaleString('id-ID')}\nMetode: ${metodeBayar}\n\nLanjutkan & Buat PDF?`;

        if (!confirm(pesanKonfirmasi)) return;

        if (btnKunciCetak) {
            btnKunciCetak.disabled = true;
            btnKunciCetak.innerText = "⏳ Sedang Mengukir Kuitansi...";
        }

        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Memproses Pembayaran & Membuat Kuitansi PDF...");

        if (!window.tokenKasirUnik) {
            window.tokenKasirUnik = "KASIR-" + new Date().getTime() + "-" + Math.floor(Math.random() * 10000);
        }

        const payload = {
            action: "prosesFinalBilling",
            tokenId: window.tokenKasirUnik, 
            barisPendaftaran: barisPendaftaran,
            noRM: noRM,
            namaPasien: namaPasien,
            tindakanRaw: tindakanRawStr,
            totalTindakan: window.totalTindakanAktifKasir,
            diskon: diskonMurni,
            biayaLab: 0,        
            dpLab: 0,           
            labelCetakLab: "",  
            sisaPiutang: 0,     
            grandTotal: grandTotalMurni,
            metodePembayaran: metodeBayar,
            kasirOperator: usernameAktif // 🔥 Terkirim ke PDF sebagai Nama Lengkap
        };

        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(res => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();

            if (btnKunciCetak) {
                btnKunciCetak.disabled = false;
                btnKunciCetak.innerText = "🖨️ Kunci & Cetak Kuitansi PDF";
            }
            
            if (res.result === "success") {
                alert(`🎉 PEMBAYARAN & KUITANSI PDF BERHASIL DIBUAT!`);
                window.tokenKasirUnik = null; 
                
                if (res.pdfUrl) window.open(res.pdfUrl, '_blank');
                
                window.tutupModalBilling();
                if (typeof window.muatAntreanKasir === "function") window.muatAntreanKasir();
            } else {
                alert("❌ Gagal membuat kuitansi PDF: " + res.message);
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            console.error(err);
            
            if (btnKunciCetak) btnKunciCetak.innerText = "Koneksi Terputus...";
            
            alert("⚠️ KONEKSI TERPUTUS SAAT MEMPROSES PEMBAYARAN!\n\nJangan panik. Transaksi Anda kemungkinan besar sudah berhasil dicatat dan PDF sedang dibuat oleh sistem.\n\nSistem akan memuat ulang antrean kasir. Jika nama pasien sudah hilang dari antrean, berarti pembayaran SUKSES masuk ke laporan keuangan.");
            
            window.tutupModalBilling();
            if (typeof window.muatAntreanKasir === "function") window.muatAntreanKasir();
            
            setTimeout(() => {
                if (btnKunciCetak) {
                    btnKunciCetak.disabled = false;
                    btnKunciCetak.innerText = "🖨️ Kunci & Cetak Kuitansi PDF";
                }
            }, 5000);
        });
    };

    window.eksekusiKunciPembayaranResmi = function() {
        const barisPendaftaran = document.getElementById('billBarisPendaftaran').value;
        const noRM = document.getElementById('billNoRM').innerText;
        const namaPasien = document.getElementById('billNama').innerText;
        const metodeBayar = document.getElementById('selBillMetode').value;
        const btnKunci = document.getElementById('btnKunciKuitansi');
        
        const diskonMurni = Number(document.getElementById('inpBillDiskon').value.replace(/[^0-9]/g, '')) || 0;
        const grandTotalMurni = window.totalTindakanAktifKasir - diskonMurni;
        
        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        const usernameAktif = sessionData.namaLengkap || sessionData.username || "Staf Kasir";

        if (!barisPendaftaran) {
            alert("⚠️ Gagal memproses, indeks baris antrean terputus. Silakan muat ulang halaman.");
            return;
        }

        let pesanKonfirmasi = `Konfirmasi Pembayaran:\nPasien: ${namaPasien}\n`;
        pesanKonfirmasi += `Tindakan Medis (Nett): Rp ${grandTotalMurni.toLocaleString('id-ID')}\n`;
        pesanKonfirmasi += `\nTOTAL DIBAYAR HARI INI: Rp ${grandTotalMurni.toLocaleString('id-ID')}\nMetode: ${metodeBayar}\n\nLanjutkan?`;

        if (!confirm(pesanKonfirmasi)) return;

        if (btnKunci) {
            btnKunci.disabled = true;
            btnKunci.innerText = "⏳ Mengunci Nota & Pembukuan...";
        }

        const payload = {
            action: "kunciPembayaran",
            barisPendaftaran: barisPendaftaran,
            noRM: noRM,
            namaPasien: namaPasien,
            totalTindakan: window.totalTindakanAktifKasir,
            diskon: diskonMurni,
            biayaLab: 0,    
            dpLab: 0,       
            sisaPiutang: 0, 
            grandTotal: grandTotalMurni,
            metodePembayaran: metodeBayar,
            operator: usernameAktif
        };

        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(res => {
            if (btnKunci) {
                btnKunci.disabled = false;
                btnKunci.innerText = "💾 Kunci Pembukuan Saja";
            }
            
            if (res.result === "success") {
                alert(`🎉 PEMBAYARAN SUKSES DIKUNCI!\n\nNomor Kuitansi Resmi:\n👉 ${res.noKuitansi}`);
                window.tutupModalBilling();
                if (typeof window.muatAntreanKasir === "function") window.muatAntreanKasir();
            } else {
                alert("❌ Gagal menyimpan data transaksi: " + res.message);
            }
        })
        .catch(err => {
            console.error(err);
            if (btnKunci) {
                btnKunci.disabled = false;
                btnKunci.innerText = "💾 Kunci Pembukuan Saja";
            }
            alert("⚠️ Terjadi gangguan jaringan internet. Silakan coba beberapa saat lagi.");
        });
    };

    // =====================================================================
    // 5. RADAR PING (SISTEM NOTIFIKASI LATAR BELAKANG)
    // =====================================================================
    window.jalankanRadarPing = function() {
        console.log("🚀 RADAR PING AKTIF: Berjalan senyap di latar belakang...");

        function periksaNotifikasiMasuk() {
            fetch(window.WEB_APP_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'cekPing' })
            })
            .then(res => res.json())
            .then(res => {
                if (res.result === 'success' && res.data && res.data.length > 0) {
                    res.data.forEach(ping => {
                        window.tampilkanNotifikasiPing(ping.namaPasien, ping.pesan);
                    });
                }
            })
            .catch(err => console.error("❌ Gagal melakukan polling notifikasi:", err));
        }

        periksaNotifikasiMasuk();
        setInterval(periksaNotifikasiMasuk, 30000); 
    };

    window.tampilkanNotifikasiPing = function(namaPasien, pesan) {
        const toast = document.createElement('div');
        
        toast.style.cssText = `
            position: fixed !important; 
            top: 20px !important; 
            right: 20px !important; 
            background-color: #e74c3c !important; 
            color: white !important; 
            padding: 15px 20px !important; 
            border-radius: 8px !important; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.3) !important; 
            z-index: 9999999 !important; 
            display: flex !important; 
            align-items: center !important; 
            gap: 15px !important; 
            font-family: sans-serif !important; 
            min-width: 320px !important; 
            max-width: 420px !important; 
            box-sizing: border-box !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;
        
        toast.innerHTML = `
            <div style="font-size: 24px;">🔔</div>
            <div style="flex: 1;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 3px;">PING DARI KASIR</div>
                <div style="font-size: 12px; opacity: 0.95;"><strong>${namaPasien}</strong>: ${pesan}</div>
            </div>
            <button style="background:none; border:none; color:white; font-size:16px; cursor:pointer; margin-left:10px; font-weight:bold;" onclick="this.parentElement.remove()">✖</button>
        `;

        const targetContainer = document.getElementById('mainPage') || document.body;
        targetContainer.appendChild(toast);

        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); 

            oscillator.start();
            
            setTimeout(() => {
                oscillator.stop();
                audioCtx.close();
            }, 200);
        } catch(e) {
            console.log("Audio autoplay diblokir browser.");
        }

        setTimeout(() => {
            if(targetContainer.contains(toast)) toast.remove();
        }, 10000);
    };

    window.kirimPingAsisten = function(namaPasien) {
        if(!confirm(`Kirim notifikasi ke Ruang Dokter untuk segera menginput RME pasien ${namaPasien}?`)) return;

        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ 
                action: "kirimPing", 
                namaPasien: namaPasien,
                pesan: "Pasien menunggu di Kasir. Mohon lengkapi tindakan RME."
            })
        })
        .then(res => res.json())
        .then(res => {
            if(res.result === "success") {
                alert("🔔 Pesan Ping berhasil dikirim ke Ruang Dokter!");
            } else {
                alert("Gagal mengirim Ping.");
            }
        });
    };

})();