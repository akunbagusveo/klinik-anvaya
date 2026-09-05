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

   // =====================================================================
    // 📊 MESIN RENDER MASTER TINDAKAN (HYBRID & PAGINATION)
    // =====================================================================
    window.renderTabelMasterTindakan = function(resetHalaman = false) {
        if (resetHalaman) window.currentPageTindakan = 1;
        if (!window.currentPageTindakan) window.currentPageTindakan = 1;
        
        const limitPerPage = 15; // 🔥 DIUBAH KE 15: Agar tidak kepanjangan di-scroll di HP

        let elCari = document.getElementById('cariTindakan');
        let cari = elCari ? elCari.value.toLowerCase() : "";
        let elStatus = document.getElementById('filterStatusTindakan');
        let statusFilter = elStatus ? elStatus.value : "Semua";
        
        let wadahPC = document.getElementById('tabelMasterTindakanBodyPC');
        let wadahMobile = document.getElementById('tabelMasterTindakanBodyMobile');
        let paginationDiv = document.getElementById('paginationControlsTindakan');
        
        if (wadahPC) wadahPC.innerHTML = '';
        if (wadahMobile) wadahMobile.innerHTML = '';

        let terfilter = window.dataMasterTindakanGlobal.filter(t => {
            let matchCari = (t.namaTindakan || "").toLowerCase().includes(cari) || (t.kategori || "").toLowerCase().includes(cari);
            let matchStatus = (statusFilter === 'Semua') ? true : (t.status === statusFilter);
            return matchCari && matchStatus;
        });

        if (terfilter.length === 0) {
            if (wadahPC) wadahPC.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:#95a5a6; font-weight:bold;">Data tidak ditemukan.</td></tr>`;
            if (wadahMobile) wadahMobile.innerHTML = `<div style="text-align:center; padding:30px; background:#fff; border-radius:8px; color:#95a5a6; font-weight:bold;">Data tidak ditemukan.</div>`;
            if (paginationDiv) paginationDiv.innerHTML = '';
            return;
        }

        // Logika Potong Data
        const totalPages = Math.ceil(terfilter.length / limitPerPage) || 1;
        if (window.currentPageTindakan > totalPages) window.currentPageTindakan = totalPages;
        if (window.currentPageTindakan < 1) window.currentPageTindakan = 1;

        const startIndex = (window.currentPageTindakan - 1) * limitPerPage;
        const endIndex = startIndex + limitPerPage;
        const paginatedItems = terfilter.slice(startIndex, endIndex);

        paginatedItems.forEach((t, i) => {
            let actualIndex = startIndex + i + 1; 
            
            let badgeStatus = t.status === 'Aktif' 
                ? `<span style="background:#d4efdf; color:#27ae60; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;">Aktif</span>` 
                : `<span style="background:#fadbd8; color:#c0392b; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;">Nonaktif</span>`;
                
            let strConsent = String(t.butuhConsent).toLowerCase().trim();
            let strLab = String(t.butuhLab).toLowerCase().trim();
            
            let icnConsent = (t.butuhConsent == 1 || strConsent === "ya" || strConsent === "true") ? "📝 Ya" : "-";
            let icnLab = (t.butuhLab == 1 || strLab === "ya" || strLab === "true") ? "🧪 Ya" : "-";

            let hargaMaksTxt = (t.hargaMaksimal && Number(t.hargaMaksimal) > 0) ? `Rp ${Number(t.hargaMaksimal).toLocaleString('id-ID')}` : `-`;
            let hargaDasarTxt = `Rp ${Number(t.hargaDasar).toLocaleString('id-ID')}`;

            // 💻 SUNTIKKAN KE WUJUD PC
            if (wadahPC) {
                let tr = document.createElement('tr');
                tr.style.cssText = "border-bottom: 1px solid #ecf0f1; transition: background 0.2s;";
                tr.onmouseover = function() { this.style.background = '#f8fafc'; };
                tr.onmouseout = function() { this.style.background = 'transparent'; };
                tr.innerHTML = `
                    <td style="padding:12px 10px; font-size:13px; color:#7f8c8d;">${actualIndex}</td>
                    <td style="padding:12px 10px; font-size:13px; font-weight:bold; color:#2c3e50;">${t.namaTindakan}</td>
                    <td style="padding:12px 10px; font-size:13px; color:#34495e;">${t.kategori}</td>
                    <td style="padding:12px 10px; font-size:13px; font-weight:bold; color:#2980b9; text-align:right;">${hargaDasarTxt}</td>
                    <td style="padding:12px 10px; font-size:13px; color:#7f8c8d; text-align:right;">${hargaMaksTxt}</td>
                    <td style="padding:12px 10px; font-size:13px; text-align:center; color:#e67e22;">${icnConsent}</td>
                    <td style="padding:12px 10px; font-size:13px; text-align:center; color:#9b59b6;">${icnLab}</td>
                    <td style="padding:12px 10px; text-align:center;">${badgeStatus}</td>
                    <td style="padding:12px 10px; text-align:center;">
                        <button onclick="window.bukaModalTindakan('${t.idTindakan}')" style="background:#f39c12; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.1);">✏️ Edit</button>
                    </td>
                `;
                wadahPC.appendChild(tr);
            }

            // 📱 SUNTIKKAN KE WUJUD MOBILE
            if (wadahMobile) {
                let card = document.createElement('div');
                card.style.cssText = "background:#fff; border:1px solid #e0e0e0; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.02); overflow:hidden;";
                card.innerHTML = `
                    <div onclick="window.toggleAccordionMaster(this)" style="padding:15px; background:#fbfcfc; display:flex; justify-content:space-between; align-items:flex-start; cursor:pointer; border-bottom:1px solid transparent;">
                        <div>
                            <div style="font-weight:bold; color:#2c3e50; font-size:15px; margin-bottom:4px;">${t.namaTindakan}</div>
                            <div style="font-size:12px; color:#7f8c8d; font-weight:bold;">${t.kategori} • ${badgeStatus}</div>
                        </div>
                        <div style="display:flex; align-items:center; padding-top: 5px;">
                            <span class="acc-icon-master" style="font-size:16px; color:#95a5a6; transition: transform 0.3s; font-weight:bold;">▼</span>
                        </div>
                    </div>
                    <div style="display:none; padding:15px; border-top:1px solid #ecf0f1; background:#fff;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:13px;">
                            <span style="color:#7f8c8d;">Harga Dasar:</span> <strong style="color:#2980b9;">${hargaDasarTxt}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:13px;">
                            <span style="color:#7f8c8d;">Harga Maksimal:</span> <strong>${hargaMaksTxt}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:15px; font-size:13px; background:#f9f9f9; padding:10px; border-radius:6px;">
                            <div style="text-align:center;"><div style="color:#7f8c8d; font-size:11px; margin-bottom:4px;">Wajib Consent</div><div style="color:#e67e22; font-weight:bold;">${icnConsent}</div></div>
                            <div style="text-align:center;"><div style="color:#7f8c8d; font-size:11px; margin-bottom:4px;">Tagihan Lab</div><div style="color:#9b59b6; font-weight:bold;">${icnLab}</div></div>
                        </div>
                        <button onclick="window.bukaModalTindakan('${t.idTindakan}')" style="width:100%; background:#f39c12; color:white; border:none; padding:12px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:14px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">✏️ Edit Tindakan</button>
                    </div>
                `;
                wadahMobile.appendChild(card);
            }
        });

        window.renderKontrolPaginasiMaster(totalPages, window.currentPageTindakan);
    };

    // =====================================================================
    // 🖲️ KONTROL PAGINASI & ANIMASI (PINTAR)
    // =====================================================================
    window.renderKontrolPaginasiMaster = function(totalPages, currentPage) {
        const wadah = document.getElementById('paginationControlsTindakan');
        if (!wadah) return;
        wadah.innerHTML = '';
        if (totalPages <= 1) { wadah.style.display = 'none'; return; }
        
        wadah.style.display = 'flex';

        const btnPrev = document.createElement('button');
        btnPrev.className = 'btn-page-master';
        btnPrev.innerText = '« Prev';
        btnPrev.disabled = currentPage === 1;
        btnPrev.onclick = () => { window.currentPageTindakan--; window.renderTabelMasterTindakan(); };
        wadah.appendChild(btnPrev);

        // Algoritma ellipsis (titik-titik) untuk halamaman yang banyak
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                const btnNum = document.createElement('button');
                btnNum.className = 'btn-page-master' + (i === currentPage ? ' active' : '');
                btnNum.innerText = i;
                btnNum.onclick = () => { window.currentPageTindakan = i; window.renderTabelMasterTindakan(); };
                wadah.appendChild(btnNum);
            } else if (i === currentPage - 2 || i === currentPage + 2) {
                const btnDot = document.createElement('span');
                btnDot.innerText = '...';
                btnDot.style.margin = '0 5px';
                btnDot.style.color = '#7f8c8d';
                btnDot.style.fontWeight = 'bold';
                wadah.appendChild(btnDot);
            }
        }

        const btnNext = document.createElement('button');
        btnNext.className = 'btn-page-master';
        btnNext.innerText = 'Next »';
        btnNext.disabled = currentPage === totalPages;
        btnNext.onclick = () => { window.currentPageTindakan++; window.renderTabelMasterTindakan(); };
        wadah.appendChild(btnNext);
    };

    window.toggleAccordionMaster = function(headerElement) {
        const cardBody = headerElement.nextElementSibling;
        const icon = headerElement.querySelector('.acc-icon-master');
        if (cardBody.style.display === "none") {
            cardBody.style.display = "block";
            headerElement.style.borderBottom = "1px solid #ecf0f1";
            icon.style.transform = "rotate(180deg)";
        } else {
            cardBody.style.display = "none";
            headerElement.style.borderBottom = "1px solid transparent";
            icon.style.transform = "rotate(0deg)";
        }
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