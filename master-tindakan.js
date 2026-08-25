// =========================================================================
// 🛠️ MODUL CRUD MASTER TINDAKAN (DENGAN OPTIMISTIC UI)
// =========================================================================
(function() {

    // 1. Variabel Global & Privat
    window.dataMasterTindakanGlobal = window.dataMasterTindakanGlobal || [];
    window.masterTindakanGlobal = window.masterTindakanGlobal || []; // Digunakan oleh modul RME
    
    let currentPageTindakan = 1;
    const rowsPerPageTindakan = 50; 

    // =====================================================================
    // 2. FUNGSI UNDUH & RENDER TABEL MASTER
    // =====================================================================
    window.initMasterTindakan = function(forceRefresh = false) {
        let tbody = document.getElementById('tabelMasterTindakanBody');

        // 🔥 THE SMART CACHE: Jika data sudah ada di memori dan tidak dipaksa refresh, pakai memori!
        if (!forceRefresh && window.dataMasterTindakanGlobal && window.dataMasterTindakanGlobal.length > 0) {
            console.log("⚡ Memuat Master Tindakan dari Cache Memory (Instan!)");
            currentPageTindakan = 1;
            window.renderTabelMasterTindakan();
            return; 
        }

        if(tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:#7f8c8d; font-weight:bold;">Mengunduh Master Data Tindakan dari server... ⏳</td></tr>`;
        
        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Menyinkronkan ratusan data Master Tindakan...");

        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify({ action: "getAllMasterTindakan" }) })
        .then(res => res.json())
        .then(res => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            
            if (res.result === "success") {
                window.dataMasterTindakanGlobal = res.data;
                currentPageTindakan = 1; 
                window.renderTabelMasterTindakan();
            } else {
                alert("Gagal: " + res.message);
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            console.error(err);
            if(tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:#e74c3c; font-weight:bold;">⚠️ Gagal koneksi ke server. Silakan klik tombol Segarkan.</td></tr>`;
        });
    };

    // Fungsi khusus untuk memasok data RME
    window.muatMasterTindakan = function() {
        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getMasterTindakan" })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success" && Array.isArray(res.data)) {
                window.masterTindakanGlobal = res.data.map(item => {
                    return {
                        ...item,
                        kategori: String(item.kategori || "").trim(),
                        nama: String(item.nama || "").trim(),
                        harga: Number(item.hargaDasar || 0), 
                        hargaMaksimal: Number(item.hargaMaksimal || 0), 
                        keterangan: String(item.keterangan || "").trim(),
                        Butuh_Consent: (item.butuhConsent === 1 || String(item.butuhConsent) === "1") ? 1 : 0,
                        Butuh_Lab: (item.butuhLab === 1 || String(item.butuhLab) === "1") ? 1 : 0
                    };
                });
                console.log("🚀 Master Tindakan Berhasil Dimuat:", window.masterTindakanGlobal.length, "item.");
            } else {
                console.error("❌ Gagal memuat master tindakan:", res.message);
            }
        })
        .catch(err => console.error("⚠️ Gangguan jaringan:", err));
    };

    window.renderTabelMasterTindakan = function(resetHalaman = false) {
        if (resetHalaman) currentPageTindakan = 1;

        let elCari = document.getElementById('cariTindakan');
        let cari = elCari ? elCari.value.toLowerCase() : "";
        
        let elStatus = document.getElementById('filterStatusTindakan');
        let statusFilter = elStatus ? elStatus.value : "Semua";
        
        let tbody = document.getElementById('tabelMasterTindakanBody');
        let paginationDiv = document.getElementById('paginationControlsTindakan');
        
        if (!tbody) return;

        let terfilter = window.dataMasterTindakanGlobal.filter(t => {
            let matchCari = (t.namaTindakan || "").toLowerCase().includes(cari) || (t.kategori || "").toLowerCase().includes(cari);
            let matchStatus = (statusFilter === 'Semua') ? true : (t.status === statusFilter);
            return matchCari && matchStatus;
        });

        if (terfilter.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:#95a5a6; font-weight:bold;">Data tidak ditemukan.</td></tr>`;
            if (paginationDiv) paginationDiv.style.display = 'none';
            return;
        }

        if (paginationDiv) paginationDiv.style.display = 'block';

        const totalPages = Math.ceil(terfilter.length / rowsPerPageTindakan) || 1;
        if (currentPageTindakan > totalPages) currentPageTindakan = totalPages;
        if (currentPageTindakan < 1) currentPageTindakan = 1;

        const startIndex = (currentPageTindakan - 1) * rowsPerPageTindakan;
        const endIndex = startIndex + rowsPerPageTindakan;
        const paginatedItems = terfilter.slice(startIndex, endIndex);

        let html = '';
        paginatedItems.forEach((t, i) => {
            let actualIndex = startIndex + i + 1; 
            
            let badgeStatus = t.status === 'Aktif' 
                ? `<span style="background:#d4efdf; color:#27ae60; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;">Aktif</span>` 
                : `<span style="background:#fadbd8; color:#c0392b; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;">Nonaktif</span>`;
                
            let strConsent = String(t.butuhConsent).toLowerCase().trim();
            let strLab = String(t.butuhLab).toLowerCase().trim();
            
            let icnConsent = (t.butuhConsent == 1 || strConsent === "ya" || strConsent === "true") ? "📝 Ya" : "-";
            let icnLab = (t.butuhLab == 1 || strLab === "ya" || strLab === "true") ? "🧪 Ya" : "-";

            let hargaMaksTxt = (t.hargaMaksimal && Number(t.hargaMaksimal) > 0) 
                ? `Rp ${Number(t.hargaMaksimal).toLocaleString('id-ID')}` 
                : `-`;

            html += `
                <tr style="border-bottom: 1px solid #ecf0f1;">
                    <td style="padding:12px 10px; font-size:13px; color:#7f8c8d;">${actualIndex}</td>
                    <td style="padding:12px 10px; font-size:13px; font-weight:bold; color:#2c3e50;">${t.namaTindakan}</td>
                    <td style="padding:12px 10px; font-size:13px; color:#34495e;">${t.kategori}</td>
                    <td style="padding:12px 10px; font-size:13px; font-weight:bold; color:#2980b9; text-align:right;">Rp ${Number(t.hargaDasar).toLocaleString('id-ID')}</td>
                    <td style="padding:12px 10px; font-size:13px; color:#7f8c8d; text-align:right;">${hargaMaksTxt}</td>
                    <td style="padding:12px 10px; font-size:13px; text-align:center; color:#e67e22;">${icnConsent}</td>
                    <td style="padding:12px 10px; font-size:13px; text-align:center; color:#9b59b6;">${icnLab}</td>
                    <td style="padding:12px 10px; text-align:center;">${badgeStatus}</td>
                    <td style="padding:12px 10px; text-align:center;">
                        <button onclick="window.bukaModalTindakan('${t.idTindakan}')" style="background:#f39c12; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.1);">✏️ Edit</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        let pageInfo = document.getElementById('pageInfoTindakan');
        if (pageInfo) pageInfo.innerText = `Halaman ${currentPageTindakan} dari ${totalPages}`;
        
        let btnPrev = document.getElementById('btnPrevTindakan');
        let btnNext = document.getElementById('btnNextTindakan');
        if (btnPrev) btnPrev.disabled = (currentPageTindakan === 1);
        if (btnNext) btnNext.disabled = (currentPageTindakan === totalPages);
    };

    window.ubahHalamanTindakan = function(step) {
        currentPageTindakan += step;
        window.renderTabelMasterTindakan(false); 
    };

    // =====================================================================
    // 3. KONTROL JENDELA POP-UP MODAL (TAMBAH / EDIT)
    // =====================================================================
    window.bukaModalTindakan = function(id) {
        const inpId = document.getElementById('inpTindakanId');
        if (inpId) inpId.value = id;
        
        let datalist = document.getElementById('listKategoriTindakan');
        if (datalist && window.dataMasterTindakanGlobal) {
            datalist.innerHTML = ''; 
            let listBersih = window.dataMasterTindakanGlobal
                .map(item => item.kategori ? String(item.kategori).trim() : '')
                .filter(kat => kat !== '');
            let unikKategori = [...new Set(listBersih)];
            
            unikKategori.forEach(kat => {
                let opt = document.createElement('option');
                opt.value = kat; 
                opt.text = kat;  
                datalist.appendChild(opt);
            });
        }

        const setVal = (elmId, val) => { const el = document.getElementById(elmId); if(el) el.value = val; };
        const setTxt = (elmId, val) => { const el = document.getElementById(elmId); if(el) el.innerText = val; };

        if (id === '') {
            setTxt('judulModalTindakan', "✨ Tambah Tindakan Baru");
            setVal('inpTindakanNama', "");
            setVal('inpTindakanKategori', "");
            setVal('inpTindakanHarga', "");
            setVal('inpTindakanMaks', "");
            setVal('inpTindakanKet', "");
            setVal('inpTindakanConsent', "Tidak");
            setVal('inpTindakanLab', "Tidak");
            setVal('inpTindakanStatus', "Aktif");
        } else {
            setTxt('judulModalTindakan', "✏️ Edit Tindakan");
            let data = window.dataMasterTindakanGlobal.find(x => x.idTindakan === id);
            if(data) {
                setVal('inpTindakanNama', data.namaTindakan);
                setVal('inpTindakanKategori', data.kategori);
                
                setVal('inpTindakanHarga', Number(data.hargaDasar).toLocaleString('id-ID'));
                setVal('inpTindakanMaks', (data.hargaMaksimal && Number(data.hargaMaksimal) > 0) ? Number(data.hargaMaksimal).toLocaleString('id-ID') : "");
                
                setVal('inpTindakanKet', data.keterangan || "");
                
                let strConsent = String(data.butuhConsent).toLowerCase().trim();
                let strLab = String(data.butuhLab).toLowerCase().trim();
                setVal('inpTindakanConsent', (data.butuhConsent == 1 || strConsent === "ya" || strConsent === "true") ? "Ya" : "Tidak");
                setVal('inpTindakanLab', (data.butuhLab == 1 || strLab === "ya" || strLab === "true") ? "Ya" : "Tidak");
                setVal('inpTindakanStatus', data.status || "Aktif");
            }
        }
        
        const modal = document.getElementById('modalMasterTindakan');
        if (modal) modal.style.display = 'flex';
    };

    window.tutupModalTindakan = function() {
        const modal = document.getElementById('modalMasterTindakan');
        if (modal) modal.style.display = 'none';
    };

    // =====================================================================
    // 4. PENYIMPANAN DATA KE SERVER
    // =====================================================================
    window.simpanMasterTindakan = function() {
        const elHarga = document.getElementById('inpTindakanHarga');
        const elMaks = document.getElementById('inpTindakanMaks');
        
        let hargaMentah = elHarga ? elHarga.value.replace(/[^0-9]/g, '') : "0";
        let maksMentah = elMaks ? elMaks.value.replace(/[^0-9]/g, '') : "0";

        let valConsent = document.getElementById('inpTindakanConsent')?.value === 'Ya' ? 1 : 0;
        let valLab = document.getElementById('inpTindakanLab')?.value === 'Ya' ? 1 : 0;
        
        if (!window.tokenMasterTindakan) {
            window.tokenMasterTindakan = "MST-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000);
        }

        let payload = {
            idTindakan: document.getElementById('inpTindakanId')?.value || "",
            namaTindakan: document.getElementById('inpTindakanNama')?.value.trim() || "",
            kategori: document.getElementById('inpTindakanKategori')?.value.trim() || "",
            hargaDasar: Number(hargaMentah) || 0,
            hargaMaksimal: Number(maksMentah) || 0,
            keterangan: document.getElementById('inpTindakanKet')?.value || "",
            butuhConsent: valConsent, 
            butuhLab: valLab,         
            status: document.getElementById('inpTindakanStatus')?.value || "Aktif",
            tokenId: window.tokenMasterTindakan 
        };

        if (!payload.namaTindakan || !payload.kategori || hargaMentah === "") {
            alert("⚠️ Nama Tindakan, Kategori, dan Harga Dasar wajib diisi! (Ketik angka 0 jika gratis)"); 
            return;
        }

        const btnSimpan = document.getElementById('btnSimpanTindakan');
        if (btnSimpan) {
            btnSimpan.innerText = "Menyimpan... ⏳";
            btnSimpan.disabled = true;
        }

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "simpanMasterTindakan", payload: payload })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                window.tutupModalTindakan();

                // 🔥 OPTIMISTIC UI UPDATE
                if (typeof window.dataMasterTindakanGlobal !== "undefined") {
                    let indexDicari = -1;
                    if (payload.idTindakan) {
                        indexDicari = window.dataMasterTindakanGlobal.findIndex(t => String(t.idTindakan) === String(payload.idTindakan));
                    } else {
                        indexDicari = window.dataMasterTindakanGlobal.findIndex(t => t.namaTindakan.toLowerCase() === payload.namaTindakan.toLowerCase());
                    }

                    if (indexDicari !== -1) {
                        window.dataMasterTindakanGlobal[indexDicari].namaTindakan = payload.namaTindakan;
                        window.dataMasterTindakanGlobal[indexDicari].kategori = payload.kategori;
                        window.dataMasterTindakanGlobal[indexDicari].hargaDasar = payload.hargaDasar;
                        window.dataMasterTindakanGlobal[indexDicari].hargaMaksimal = payload.hargaMaksimal;
                        window.dataMasterTindakanGlobal[indexDicari].butuhConsent = payload.butuhConsent;
                        window.dataMasterTindakanGlobal[indexDicari].butuhLab = payload.butuhLab;
                        window.dataMasterTindakanGlobal[indexDicari].status = payload.status;
                        window.dataMasterTindakanGlobal[indexDicari].keterangan = payload.keterangan;
                    } else {
                        window.dataMasterTindakanGlobal.unshift(payload);
                    }

                    window.renderTabelMasterTindakan(false);
                }

                alert("✅ Master Tindakan berhasil disimpan!");
                window.tokenMasterTindakan = null;
                
                // 🔥 FIX: Paksa refresh background dengan parameter `true`
                if (typeof window.initMasterTindakan === "function") window.initMasterTindakan(true); 
            } else {
                alert("Gagal menyimpan: " + res.message);
            }
        })
        .catch(err => {
            console.error(err);
            if (btnSimpan) btnSimpan.innerText = "Koneksi Terputus...";
            alert("⚠️ KONEKSI TERPUTUS!\n\nJangan klik simpan berulang kali. Data Anda kemungkinan sudah masuk ke sistem.\n\nTabel akan dimuat ulang untuk memastikannya.");
            
            window.tutupModalTindakan();
            if (typeof window.initMasterTindakan === "function") window.initMasterTindakan(true); 
        })
        .finally(() => {
            setTimeout(() => {
                if (btnSimpan) {
                    btnSimpan.innerText = "💾 Simpan Data";
                    btnSimpan.disabled = false;
                }
            }, 3000);
        });
    };

    // =====================================================================
    // 5. HELPER FORMAT RUPIAH REALTIME
    // =====================================================================
    window.formatRibuanTindakan = function(input) {
        let angkaMurni = input.value.replace(/[^0-9]/g, ''); 
        if (angkaMurni === "") {
            input.value = "";
            return;
        }
        input.value = parseInt(angkaMurni, 10).toLocaleString('id-ID'); 
    };

})();