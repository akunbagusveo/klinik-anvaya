// =========================================================================
// 🩺 MODUL INPUT REKAM MEDIS ELEKTRONIK (RME) - KODE ULTIMATE
// =========================================================================
(function() { 
 
    window.masterTindakanGlobal = [];
    window.consentSudahDisimpanHariIni = false;
    window.barisRekamMedisTarget = null; 
    
    // 🔥 VARIABEL BARU: Pengunci Hak Milik Dokter
    window.dokterPemilikRM = null;
    window.namaDokterPemilikRM = null;

    // 🔥 KACAMATA RADAR (KEMBALIKAN FUNGSI YANG HILANG INI)
    const isVisible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

    window.triggerSyncDiagnosa = function() {
        if (typeof window.sinkronisasiChipDiagnosa === "function") window.sinkronisasiChipDiagnosa();
        if (typeof window.renderChipDiagnosa === "function") window.renderChipDiagnosa();
    };

    const getVisibleContainer = () => {
        const split = document.getElementById('formModalMedisSplit');
        const modal = document.getElementById('formModalMedis');
        let activeForm = document;
        
        if (split && split.offsetWidth > 0) activeForm = split;
        else if (modal && modal.offsetWidth > 0) activeForm = modal;
        
        return activeForm.querySelector('#kontainerTindakanDinamis') || document.getElementById('kontainerTindakanDinamis');
    };

    window.addEventListener('DOMContentLoaded', function() {
        // --- 1. FITUR AUTO-BULLET TEXTAREA ---
        const textareas = document.querySelectorAll('.auto-bullet');
        textareas.forEach(ta => {
            ta.addEventListener('focus', function() { if (this.value.trim() === '') this.value = '• '; });
            ta.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const insert = '\n• ';
                    const start = this.selectionStart;
                    this.value = this.value.substring(0, start) + insert + this.value.substring(this.selectionEnd);
                    this.selectionStart = this.selectionEnd = start + insert.length;
                } else if (e.key === '.') {
                    e.preventDefault();
                    const insert = '.\n• ';
                    const start = this.selectionStart;
                    this.value = this.value.substring(0, start) + insert + this.value.substring(this.selectionEnd);
                    this.selectionStart = this.selectionEnd = start + insert.length;
                }
            });
        });
        // -------------------------------------------------------------------------------------------------------------

        // --- 2. ENGINE SIMPAN REKAM MEDIS (SUBMIT) ---
        const semuaFormMedis = document.querySelectorAll('form[id*="Medis"]');
        semuaFormMedis.forEach(formAktifRme => {
            formAktifRme.addEventListener('submit', async function(e) { 
                e.preventDefault(); 
                
                if (typeof window.validasiSebelumSimpanRME === "function" && !window.validasiSebelumSimpanRME()) return; 

                const submitBtn = e.target.querySelector('button[type="submit"]');
                if (submitBtn) { submitBtn.disabled = true; submitBtn.innerText = "⏳ Menyimpan Perubahan..."; }
                if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Mengenkripsi & Menyimpan Rekam Medis...");

                const sessionData    = JSON.parse(localStorage.getItem('anvaya_session'));
                const idDokterAktif  = sessionData ? sessionData.idUser : "USR-000"; 
                const usernameAktif  = sessionData ? sessionData.username : "Anonymous"; 
                const roleAktif      = sessionData ? sessionData.role : "Staff";        

                let dataFileModal = null;
                if (typeof window.bacaFileKeBase64 === "function") {
                    dataFileModal = await window.bacaFileKeBase64(document.getElementById('modalFileFoto') ? 'modalFileFoto' : 'txtFileFoto');
                }

                const dapatkanNilaiDOM = (idUtama, idAlternatif) => {
                    let val = "";
                    formAktifRme.querySelectorAll(`#${idUtama}, [name="${idUtama}"]`).forEach(el => { if(el.value.trim() !== "") val = el.value; });
                    if(val !== "") return val;
                    formAktifRme.querySelectorAll(`#${idAlternatif}, [name="${idAlternatif}"]`).forEach(el => { if(el.value.trim() !== "") val = el.value; });
                    if(val !== "") return val;
                    document.querySelectorAll(`#${idUtama}, #${idAlternatif}`).forEach(el => { if(el.value.trim() !== "") val = el.value; });
                    return val;
                };

                const barisTindakan = document.querySelectorAll('.baris-tindakan-item');
                let listTindakanDipilih = [];

                barisTindakan.forEach(row => {
                    if (!isVisible(row)) return; 
                    const selNama = row.querySelector('.sel-nama-tindakan');
                    const inpHarga = row.querySelector('.inp-harga-tindakan');
                    const inpCatatan = row.querySelector('.inp-catatan-tindakan');
                    
                    if (selNama && selNama.value) {
                        let hargaMurni = Number(inpHarga.value.replace(/[^0-9]/g, '')) || 0;
                        let namaTindakanFix = selNama.value.trim();
                        let statusButuhLab = 0;
                        if (window.masterTindakanGlobal) {
                            let dataMasterItem = window.masterTindakanGlobal.find(t => t.nama === namaTindakanFix);
                            if (dataMasterItem && dataMasterItem.Butuh_Lab === 1) statusButuhLab = 1;
                        }
                        listTindakanDipilih.push({
                            namaTindakan: namaTindakanFix,
                            hargaBersihPerItem: hargaMurni,
                            catatanKlinis: inpCatatan ? inpCatatan.value.trim() : "",
                            butuhLab: statusButuhLab 
                        });
                    }
                });

                if (!window.tokenRmeUnik) window.tokenRmeUnik = "RME-" + new Date().getTime() + "-" + Math.floor(Math.random() * 10000);

                // 🔥 PAYLOAD AMAN: Tetap gunakan Nama Dokter Asli, tapi catat Owner/Admin sebagai "Operator"
                const finalIdDokter = window.dokterPemilikRM || idDokterAktif;
                const finalNamaDokter = window.namaDokterPemilikRM || usernameAktif;

                const data = {
                    action: "submitRekamMedis",
                    targetSheet: "RekamMedis",
                    tokenId: window.tokenRmeUnik, 
                    noRM: dapatkanNilaiDOM('modalNoRM', 'billNoRM') || formAktifRme.dataset.activeNoRM || "",
                    rowUpdate: dapatkanNilaiDOM('modalRowUpdate', 'txtRowUpdate') || formAktifRme.dataset.rowUpdate || "", 
                    rowRekamMedisTarget: window.barisRekamMedisTarget || "", 
                    namaPasien: dapatkanNilaiDOM('modalNama', 'billNama'),
                    anamnesa: dapatkanNilaiDOM('modalAnamnesa', 'txtAnamnesa'),
                    objektif: dapatkanNilaiDOM('modalObjektif', 'txtObjektif'),
                    diagnosa: dapatkanNilaiDOM('modalDiagnosa', 'txtDiagnosa'),
                    perawatan: JSON.stringify(listTindakanDipilih),
                    proPerawatan: dapatkanNilaiDOM('modalProPerawatan', 'txtProPerawatan'), 
                    proKontrol: dapatkanNilaiDOM('modalProKontrol', 'txtProKontrol'),
                    tanggalKontrolTarget: dapatkanNilaiDOM('modalTanggalKontrol', 'tanggalKontrol'),     
                    resep: dapatkanNilaiDOM('modalResep', 'txtResep'),
                    tanggalKunjungan: window.tanggalKunjunganAktif || (typeof window.formatTanggalIndo === "function" ? new Date().toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
                    
                    idDokter: finalIdDokter,       // 🔥 KUNCI HAK MILIK!
                    namaDokter: finalNamaDokter,   // 🔥 KUNCI HAK MILIK!
                    operatorUsername: usernameAktif, 
                    operatorRole: roleAktif,         
                    linkFoto: dapatkanNilaiDOM('modalLinkFoto', 'txtLinkFoto') || "-",
                    fileBaru: dataFileModal 
                };

                fetch(window.WEB_APP_URL, { method: "POST", body: JSON.stringify(data) })
                .then(response => response.json())
                .then(res => {
                    if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
                    if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = "💾 Simpan & Selesaikan Kunjungan"; }
                    
                    if(res.result === "success") {
                        alert("✅ Catatan Rekam Medis sukses disimpan dan dikunci!");
                        window.tokenRmeUnik = null; 
                        window.barisRekamMedisTarget = null; 
                        
                        if (typeof window.resetStatusConsentUI === "function") window.resetStatusConsentUI();
                        
                        const currentRM = data.noRM;
                        if(currentRM) {
                            const rmTrim = String(currentRM).trim();
                            localStorage.removeItem('draft_rme_' + rmTrim); 
                            localStorage.removeItem('ttd_consent_' + rmTrim); 
                            localStorage.removeItem('tujuan_consent_' + rmTrim); 
                            localStorage.removeItem('pdf_url_consent_' + rmTrim); 
                            localStorage.removeItem('risiko_consent_' + rmTrim);
                        }
                        
                        const modalFull = document.getElementById('modalRiwayatFull') || document.getElementById('sectionRME');
                        if(modalFull) modalFull.style.display = 'none'; 
                        
                        if (typeof window.switchTab === "function") window.switchTab('antrean');
                        if (typeof window.muatAntreanHariIni === "function") window.muatAntreanHariIni(); 
                    } else { alert("❌ Gagal menyimpan: " + (res.message || "Terjadi kesalahan server.")); }
                }).catch(err => {
                    if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
                    console.error(err);
                    if (submitBtn) submitBtn.innerText = "Koneksi Terputus...";
                    alert("⚠️ KONEKSI TERPUTUS SAAT MENYIMPAN!\n\nDokter tidak perlu panik. Data Rekam Medis kemungkinan besar SUDAH MASUK dengan aman ke server.\n\nSistem akan memuat ulang antrean untuk memastikannya.");
                    const modalFull = document.getElementById('modalRiwayatFull') || document.getElementById('sectionRME');
                    if(modalFull) modalFull.style.display = 'none'; 
                    if (typeof window.switchTab === "function") window.switchTab('antrean');
                    if (typeof window.muatAntreanHariIni === "function") window.muatAntreanHariIni(); 
                    setTimeout(() => { if (submitBtn) { submitBtn.disabled = false; submitBtn.innerText = "💾 Simpan & Selesaikan Kunjungan"; } }, 5000);
                });
            });
        });
        //---------------------------------------------------------------------------------------------------------------------------------------

        // 3. SUNTIK ACCORDION KE PROFIL PASIEN SECARA DINAMIS
        const profilGrid = document.getElementById('gridProfilRME');
        if (profilGrid && !document.getElementById('mobileProfilHeader')) {
            const header = document.createElement('div');
            header.id = 'mobileProfilHeader';
            header.className = 'profil-mobile-header';
            header.innerHTML = '<span style="font-weight:bold; color:#1e3c72; font-size:14px;">👤 Tampilkan Detail Pasien</span> <span class="profil-arrow" style="color:#7f8c8d; transition:0.3s; font-size:16px;">❯</span>';
            
            profilGrid.insertBefore(header, profilGrid.firstChild);

            header.addEventListener('click', function() {
                profilGrid.classList.toggle('profil-expanded');
                const arrow = this.querySelector('.profil-arrow');
                if(profilGrid.classList.contains('profil-expanded')) {
                    arrow.style.transform = 'rotate(90deg)';
                } else {
                    arrow.style.transform = 'rotate(0deg)';
                }
            });
        }

        // 4. SUNTIK STEPPER KE FORM INPUT RME SECARA DINAMIS
        const formRME = document.getElementById('formModalMedisSplit');
        if (formRME && !document.getElementById('rmeStepperNav')) {
            
            // Buat Navigasi Stepper
            const nav = document.createElement('div');
            nav.id = 'rmeStepperNav';
            nav.className = 'rme-stepper-nav-mobile';
            nav.innerHTML = `
                <div class="step-btn active" onclick="window.ubahStepRME(1)">1. Anamnesa</div>
                <div class="step-btn" onclick="window.ubahStepRME(2)">2. Diagnosa</div>
                <div class="step-btn" onclick="window.ubahStepRME(3)">3. Tindakan & Obat</div>
            `;
            formRME.insertBefore(nav, formRME.firstChild);

            // Klasifikasikan Otomatis Elemen Form tanpa Hardcode Index
            Array.from(formRME.children).forEach(child => {
                if(child.tagName === 'INPUT' || child.id === 'rmeStepperNav') return;
                
                const html = child.innerHTML.toLowerCase();
                
                // Pengecualian mutlak: Tombol Simpan & Batal Edit
                if(html.includes('btnsimpanrme') || html.includes('batal edit')) {
                    child.classList.add('step-selalu-muncul');
                    return; 
                }

                // Pengelompokan Berbasis Keyword (Dinamis)
                if (html.includes('anamnesa') || html.includes('objektif')) {
                    child.setAttribute('data-step-mobile', '1');
                } else if (html.includes('diagnosa') || html.includes('icd')) {
                    child.setAttribute('data-step-mobile', '2');
                } else {
                    // Semua kotak selain di atas masuk ke step 3 (Tindakan, Resep, File, Pro)
                    child.setAttribute('data-step-mobile', '3');
                }
            });

            formRME.setAttribute('data-active-step', '1');
        }

    });

    window.simpanDraftRME = function() {
        const modalRME = document.getElementById('modalRiwayatFull');
        if (modalRME && (modalRME.style.display === 'none' || modalRME.style.display === '')) return;
        if (window.isRestoringDraft) return;
        
        const elNoRM = document.getElementById('modalNoRM');
        if (!elNoRM) return;
        const noRM = elNoRM.value ? elNoRM.value.trim() : (elNoRM.innerText ? elNoRM.innerText.trim() : "");
        if (!noRM || noRM === "-" || noRM === "undefined") return;

        const ambilNilaiDualId = (idUtama, idAlternatif) => {
            let val = "";
            const formAktif = document.getElementById('formModalMedisSplit') || document.getElementById('formModalMedis');
            if(formAktif) {
                formAktif.querySelectorAll(`#${idUtama}, [name="${idUtama}"]`).forEach(el => { if(el.value.trim() !== "") val = el.value; });
                if(val !== "") return val;
                formAktif.querySelectorAll(`#${idAlternatif}, [name="${idAlternatif}"]`).forEach(el => { if(el.value.trim() !== "") val = el.value; });
                if(val !== "") return val;
            }
            document.querySelectorAll(`#${idUtama}, #${idAlternatif}`).forEach(el => { if(el.value.trim() !== "") val = el.value; });
            return val;
        };

        const formAktif = document.getElementById('formModalMedisSplit') || document.getElementById('formModalMedis') || document;
        const barisTindakan = formAktif.querySelectorAll('.baris-tindakan-item');
        let listTindakanDraft = [];
        
        barisTindakan.forEach(row => {
            const selNama = row.querySelector('.sel-nama-tindakan');
            const inpHarga = row.querySelector('.inp-harga-tindakan');
            const inpCatatan = row.querySelector('.inp-catatan-tindakan');
            if (selNama && selNama.value && selNama.value.trim() !== "") {
                listTindakanDraft.push({
                    namaTindakan: selNama.value,
                    hargaDiinput: inpHarga ? inpHarga.value : "0",
                    catatanKlinis: inpCatatan ? inpCatatan.value : ""
                });
            }
        });

        const anamnesa = ambilNilaiDualId('modalAnamnesa', 'txtAnamnesa');
        const objektif = ambilNilaiDualId('modalObjektif', 'txtObjektif');
        const diagnosa = ambilNilaiDualId('modalDiagnosa', 'txtDiagnosa');
        const resep = ambilNilaiDualId('modalResep', 'txtResep');

        if (listTindakanDraft.length === 0 && anamnesa === "" && objektif === "" && diagnosa === "" && resep === "") return;

        const draft = {
            visitDate: window.tanggalKunjunganAktif, 
            anamnesa: anamnesa,
            objektif: objektif,
            diagnosa: diagnosa,
            tindakanDinamis: listTindakanDraft, 
            resep: resep,
            proPerawatan: ambilNilaiDualId('modalProPerawatan', 'txtProPerawatan'),
            proKontrol: ambilNilaiDualId('modalProKontrol', 'txtProKontrol'),
            tanggalKontrol: ambilNilaiDualId('modalTanggalKontrol', 'tanggalKontrol'),
            savedTTD: localStorage.getItem('ttd_consent_' + noRM) || ""
        };
        localStorage.setItem('draft_rme_' + noRM, JSON.stringify(draft));
    };

    window.tambahBarisTindakan = function(dataAwal = null) {
        const kontainer = getVisibleContainer();
        if (!kontainer) return;

        const rowId = "tindakan_row_" + Date.now() + Math.floor(Math.random() * 100);
        const rowWrapper = document.createElement('div');
        rowWrapper.id = rowId;
        rowWrapper.className = 'baris-tindakan-item';
        rowWrapper.style = "display: flex; flex-direction: column; background: white; padding: 15px; border: 1px solid #ebd3c7; border-radius: 4px; border-left: 4px solid #3498db; box-shadow: 0 1px 3px rgba(0,0,0,0.05);";

        // 🔥 UI ALA DIAGNOSA: Memakai position:relative untuk membungkus custom dropdown absolute
        rowWrapper.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap;">
                <div style="flex: 3; min-width: 250px; display: flex; flex-direction: column; justify-content: flex-start; position: relative;">
                    <input type="text" class="sel-nama-tindakan" id="inp_tindakan_${rowId}" placeholder="🔍 Ketik nama tindakan... (misal: Cabut Gigi)" style="width:100%; padding:8px; border-radius:4px; border:1px solid #bdc3c7; background-color: white; height: 38px;" onchange="window.pilihTindakanDinamis('${rowId}', this.value)" autocomplete="off" required>
                    
                    <!-- 📦 Kontainer Custom Dropdown yang Rapi ke Bawah -->
                    <div id="drop_tindakan_${rowId}" style="display: none; position: absolute; top: 40px; left: 0; right: 0; background: white; border: 1px solid #bdc3c7; border-top: none; border-radius: 0 0 6px 6px; box-shadow: 0 6px 12px rgba(0,0,0,0.15); max-height: 250px; overflow-y: auto; z-index: 9999;"></div>
                </div>
                
                <div style="flex: 1; min-width: 150px; display: flex; align-items: center; border: 1px solid #bdc3c7; border-radius: 4px; padding-left: 10px; background-color: #f5f6fa; height: 38px; box-sizing: border-box;" class="box-harga-container">
                    <span style="color: #7f8c8d; font-weight: bold; font-size: 13px; margin-right: 5px;">Rp</span>
                    <input type="text" class="inp-harga-tindakan" placeholder="0" style="border: none; outline: none; width: 100%; padding: 8px 4px; border-radius: 0 4px 4px 0; background: transparent; height: 36px;" disabled required>
                </div>
                <div style="flex: 2; min-width: 200px; display: flex; gap: 5px; align-items: center;">
                    <input type="text" class="inp-catatan-tindakan" placeholder="Catatan Klinis (Gigi/Bahan)..." style="width:100%; padding:8px; border-radius:4px; border:1px solid #bdc3c7; height: 38px; box-sizing: border-box;">
                    <button type="button" class="btn-mic" style="padding: 0 10px; height: 38px; display: inline-flex; align-items: center;" onclick="window.mulaiDikteInputDinamis('${rowId}')">🎙️</button>
                </div>
                <div>
                    <button type="button" style="background-color:#e74c3c; color:white; border:none; padding:0 12px; height:38px; cursor:pointer; border-radius:4px; font-weight:bold; display:inline-flex; align-items:center;" onclick="window.hapusBarisTindakan('${rowId}')">🗑️</button>
                </div>
            </div>
            <div class="info-tindakan-detail" style="font-size: 11px; color: #7f8c8d; margin-top: 8px; display: none; line-height: 1.6;">
                <span class="lbl-kategori" style="display: inline-block; background: #34495e; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; margin-right: 10px; margin-bottom: 4px;"></span>
                <span class="lbl-keterangan" style="display: inline-block; font-style: italic; margin-bottom: 4px;"></span>
            </div>
        `;

        kontainer.appendChild(rowWrapper);

        const elemenTindakan = rowWrapper.querySelector('.sel-nama-tindakan');
        const dropTindakan = rowWrapper.querySelector('#drop_tindakan_' + rowId);
        const elemenHarga = rowWrapper.querySelector('.inp-harga-tindakan');
        const elemenCatatan = rowWrapper.querySelector('.inp-catatan-tindakan');

        if (elemenTindakan) {
            // 🧠 LOGIKA PENCARIAN CUSTOM (Autocomplete Cerdas)
            elemenTindakan.addEventListener('input', function() {
                const keyword = this.value.toLowerCase().trim();
                dropTindakan.innerHTML = '';
                
                if (!keyword) {
                    dropTindakan.style.display = 'none';
                    return;
                }

                const matches = (window.masterTindakanGlobal || []).filter(t => {
                    return String(t.nama || "").toLowerCase().includes(keyword) || String(t.kategori || "").toLowerCase().includes(keyword);
                });

                if (matches.length > 0) {
                    dropTindakan.style.display = 'block';
                    matches.forEach(m => {
                        const optDiv = document.createElement('div');
                        // Styling mirip UI Diagnosa
                        optDiv.style = "padding: 10px 14px; border-bottom: 1px solid #f1f2f6; cursor: pointer; display: flex; flex-direction: column; gap: 4px;";
                        optDiv.innerHTML = `<strong style="color: #2c3e50; font-size: 13px;">${m.nama}</strong><span style="color: #7f8c8d; font-size: 11px;">Kategori: ${m.kategori}</span>`;
                        
                        // Efek melayang (Hover)
                        optDiv.onmouseover = () => optDiv.style.backgroundColor = "#f5f6fa";
                        optDiv.onmouseout = () => optDiv.style.backgroundColor = "transparent";
                        
                        // Saat opsi diklik
                        optDiv.onclick = () => {
                            elemenTindakan.value = m.nama;
                            dropTindakan.style.display = 'none';
                            window.pilihTindakanDinamis(rowId, m.nama);
                            window.simpanDraftRME();
                        };
                        dropTindakan.appendChild(optDiv);
                    });
                } else {
                    dropTindakan.style.display = 'block';
                    dropTindakan.innerHTML = `<div style="padding: 12px; color: #e74c3c; font-size: 12px; text-align: center; font-style: italic;">Tidak ditemukan. Tekan Tab/Enter untuk Input Custom.</div>`;
                }
            });

            // 🖱️ Tutup dropdown jika dokter mengeklik area kosong di luar kotak
            document.addEventListener('click', function(e) {
                if (e.target !== elemenTindakan && e.target !== dropTindakan) {
                    if (dropTindakan) dropTindakan.style.display = 'none';
                }
            });

            elemenTindakan.addEventListener('change', () => { window.simpanDraftRME(); if (typeof window.periksaKebutuhanConsentUI === "function") window.periksaKebutuhanConsentUI(); });
        }
        
        if (elemenHarga) {
            elemenHarga.addEventListener('input', window.simpanDraftRME);
            elemenHarga.addEventListener('change', window.simpanDraftRME);
        }
        if (elemenCatatan) elemenCatatan.addEventListener('input', window.simpanDraftRME);

        if (dataAwal) {
            elemenTindakan.value = dataAwal.namaTindakan || "";
            window.pilihTindakanDinamis(rowId, dataAwal.namaTindakan || "");
            if (elemenHarga) elemenHarga.value = Number(dataAwal.hargaDiinput || 0).toLocaleString('en-US');
            if (elemenCatatan) elemenCatatan.value = dataAwal.catatanKlinis || "";
        }

        if (window.isPasienLunasAktif) {
            if (elemenTindakan) { elemenTindakan.disabled = true; elemenTindakan.style.backgroundColor = "#e9ecef"; }
            if (elemenHarga) { elemenHarga.readOnly = true; elemenHarga.style.backgroundColor = "#e9ecef"; }
            rowWrapper.querySelectorAll('button, [class*="hapus"]').forEach(tombol => tombol.style.display = 'none');
        }
        window.simpanDraftRME();
    };

    window.hapusBarisTindakan = function(rowId) {
        const row = document.getElementById(rowId);
        if (row) row.remove();
        window.simpanDraftRME();
        if (typeof window.periksaKebutuhanConsentUI === "function") window.periksaKebutuhanConsentUI();
    };

    // window.filterTindakanPerKategori = function(rowId, kategoriTerpilih) {
    //     const row = document.getElementById(rowId);
    //     if (!row) return;

    //     // Pada arsitektur baru (Datalist), elemen utama selalu berupa <input>
    //     const inputTindakan = row.querySelector('.sel-nama-tindakan');
    //     const datalist = document.getElementById('list_tindakan_' + rowId);
        
    //     const inpHarga = row.querySelector('.inp-harga-tindakan');
    //     const boxHarga = row.querySelector('.box-harga-container');
    //     const divInfo = row.querySelector('.info-tindakan-detail');
    //     const badgeConsent = row.querySelector('.badge-wajib-consent');

    //     if (!inputTindakan || !datalist) return;

    //     // 1. Lakukan Reset Visual (Membawa logika dari kode lama Anda)
    //     if (badgeConsent) badgeConsent.style.display = "none";
    //     if (inpHarga) { inpHarga.value = ""; inpHarga.disabled = true; }
    //     if (boxHarga) boxHarga.style.backgroundColor = "#f5f6fa";
    //     if (divInfo) divInfo.style.display = "none";
        
    //     // Kosongkan teks yang sedang diketik dokter
    //     inputTindakan.value = ""; 

    //     // 2. Cek Jika Kategori Kosong / Belum Dipilih
    //     const cleanKat = String(kategoriTerpilih || "").trim().toLowerCase();
    //     if (!cleanKat) {
    //         inputTindakan.disabled = true; 
    //         inputTindakan.style.backgroundColor = "#f5f6fa";
    //         inputTindakan.placeholder = "-- Pilih Kategori Dahulu --";
    //         datalist.innerHTML = "";
    //         return;
    //     }

    //     // 3. Buka Gembok Input & Persiapkan Pencarian
    //     inputTindakan.disabled = false; 
    //     inputTindakan.style.backgroundColor = "white";
    //     inputTindakan.placeholder = "🔍 Ketik nama tindakan...";

    //     // 4. Susun Daftar Sugesti (Autocomplete) ke dalam Datalist
    //     let htmlOpsi = "";
    //     const masterList = window.masterTindakanGlobal || [];
        
    //     masterList.forEach(t => {
    //         if (String(t.kategori || t.Kategori || "").trim().toLowerCase() === cleanKat) {
    //             const namaBersih = String(t.nama || t.Nama_Tindakan || t.namaTindakan || "").trim();
    //             // Catatan: data-butuh-consent tidak perlu ditaruh di <option> lagi,
    //             // karena pilihTindakanDinamis sudah cerdas mencarinya langsung dari masterList
    //             htmlOpsi += `<option value="${namaBersih}">`;
    //         }
    //     });

    //     // 5. Tetap sediakan opsi KUSTOM untuk kompatibilitas
    //     htmlOpsi += `<option value="KUSTOM">`;
        
    //     datalist.innerHTML = htmlOpsi;
    // };

    window.pilihTindakanDinamis = function(rowId, namaTindakan) {
        const row = document.getElementById(rowId);
        if (!row) return;

        const inpHarga = row.querySelector('.inp-harga-tindakan');
        const boxHarga = row.querySelector('.box-harga-container');
        const lblKeterangan = row.querySelector('.lbl-keterangan');
        const lblKategori = row.querySelector('.lbl-kategori'); 
        const infoDetail = row.querySelector('.info-tindakan-detail');
        let selTindakan = row.querySelector('.sel-nama-tindakan');

        const cleanNamaPilihan = String(namaTindakan || "").trim();

        const pasangAutoFormatHarga = (minHarga = 0, maxHarga = 0) => {
            if (!inpHarga) return;
            inpHarga.oninput = function() {
                let valMurni = this.value.replace(/[^0-9]/g, '');
                if (valMurni) {
                    this.value = Number(valMurni).toLocaleString('en-US');
                    if (maxHarga > 0) {
                        const angkaInput = Number(valMurni);
                        if (angkaInput < minHarga || angkaInput > maxHarga) {
                            this.setCustomValidity(`Harga harus di antara Rp ${minHarga.toLocaleString('en-US')} - Rp ${maxHarga.toLocaleString('en-US')}`); 
                            this.style.color = "#c0392b"; 
                            if (boxHarga) boxHarga.style.border = "2px solid #e74c3c"; 
                        } else {
                            this.setCustomValidity(''); this.style.color = "inherit";
                            if (boxHarga) boxHarga.style.border = "1px solid #bdc3c7";
                        }
                    } else {
                        this.setCustomValidity(''); this.style.color = "inherit";
                        if (boxHarga) boxHarga.style.border = "1px solid #bdc3c7";
                    }
                } else {
                    this.value = ""; this.setCustomValidity(''); this.style.color = "inherit";
                    if (boxHarga) boxHarga.style.border = "1px solid #bdc3c7";
                }
                window.simpanDraftRME();
            };
        };

        if (!cleanNamaPilihan) {
            if (inpHarga) { inpHarga.value = ""; inpHarga.disabled = true; inpHarga.setCustomValidity(''); inpHarga.style.color = "inherit"; }
            if (boxHarga) { boxHarga.style.backgroundColor = "#f5f6fa"; boxHarga.style.border = "1px solid #bdc3c7"; }
            if (infoDetail) infoDetail.style.display = 'none';
            const badgeLama = row.querySelector('.badge-wajib-consent');
            if (badgeLama) badgeLama.style.display = 'none';
            return;
        }

        if (cleanNamaPilihan.toUpperCase() === "KUSTOM") {
            if (selTindakan && selTindakan.tagName.toLowerCase() === 'select') {
                const parentCell = selTindakan.parentElement;
                parentCell.innerHTML = `<div class="wrapper-kustom-input" style="display:flex; width:100%;"><input type="text" class="sel-nama-tindakan" placeholder="Ketik nama tindakan..." style="width:100%; padding:8px; border-radius:4px; border:1px solid #bdc3c7; height: 38px;" onchange="window.simpanDraftRME();" required></div>`;
                setTimeout(() => { const newInp = row.querySelector('.sel-nama-tindakan'); if (newInp) newInp.focus(); }, 50);
            }
            if (inpHarga) {
                inpHarga.disabled = false; inpHarga.readOnly = false; inpHarga.value = ""; inpHarga.placeholder = "Ketik harga manual...";
                inpHarga.setCustomValidity(''); inpHarga.style.color = "inherit";
                if (boxHarga) { boxHarga.style.backgroundColor = "white"; boxHarga.style.border = "1px solid #bdc3c7"; }
                pasangAutoFormatHarga(0, 0); 
            }
            if (infoDetail) infoDetail.style.display = 'none';
            const badgeLama = row.querySelector('.badge-wajib-consent');
            if (badgeLama) badgeLama.style.display = 'none';
            window.simpanDraftRME();
            return;
        }

        const match = (window.masterTindakanGlobal || []).find(t => String(t.nama || "").trim().toLowerCase() === cleanNamaPilihan.toLowerCase());
        let isWajibConsent = false;

        // 🔥 KODE BARU: Jika dokter mengetik bebas tindakan yang tidak ada di master data
        if (!match && cleanNamaPilihan.toUpperCase() !== "KUSTOM") {
            if (inpHarga) {
                inpHarga.disabled = false; inpHarga.readOnly = false; inpHarga.value = ""; inpHarga.placeholder = "Ketik harga manual...";
                inpHarga.setCustomValidity(''); inpHarga.style.color = "inherit";
                if (boxHarga) { boxHarga.style.backgroundColor = "white"; boxHarga.style.border = "1px solid #bdc3c7"; }
                pasangAutoFormatHarga(0, 0); 
            }
            if (infoDetail) infoDetail.style.display = 'none';
            const badgeLama = row.querySelector('.badge-wajib-consent');
            if (badgeLama) badgeLama.style.display = 'none';
            window.simpanDraftRME();
            return;
        }

        if (match) {
            const hargaDasar = Number(match.harga || 0);
            const hargaMaksimal = Number(match.hargaMaksimal || 0);
            
            if (inpHarga) {
                inpHarga.value = hargaDasar > 0 ? hargaDasar.toLocaleString('en-US') : "";
                inpHarga.setCustomValidity(''); inpHarga.style.color = "inherit";
                if (boxHarga) boxHarga.style.border = "1px solid #bdc3c7";
                
                if (hargaMaksimal > 0 && hargaMaksimal !== hargaDasar) {
                    inpHarga.disabled = false; inpHarga.readOnly = false;
                    inpHarga.placeholder = `Rp ${hargaDasar.toLocaleString('en-US')} - ${hargaMaksimal.toLocaleString('en-US')}`;
                    if (boxHarga) boxHarga.style.backgroundColor = "white"; 
                    pasangAutoFormatHarga(hargaDasar, hargaMaksimal); 
                } else {
                    inpHarga.disabled = true; inpHarga.placeholder = "0";
                    if (boxHarga) boxHarga.style.backgroundColor = "#f5f6fa"; inpHarga.oninput = null; 
                }
                inpHarga.dispatchEvent(new Event('input')); inpHarga.dispatchEvent(new Event('change'));
            }
            
            if (lblKeterangan) lblKeterangan.innerText = String(match.keterangan || "").trim();
            if (lblKategori) {
                const teksKategori = String(match.kategori || "").trim();
                if (teksKategori) { lblKategori.innerText = teksKategori.toUpperCase(); lblKategori.style.display = 'inline-block'; }
                else { lblKategori.style.display = 'none'; }
            }
            if (infoDetail) infoDetail.style.display = (match.keterangan || match.kategori) ? 'block' : 'none';

            const butuhConsentVal = match.Butuh_Consent || match.butuhConsent || 0;
            isWajibConsent = (String(butuhConsentVal).trim() === "1" || butuhConsentVal === 1 || String(butuhConsentVal).toLowerCase() === "true");
        }

        selTindakan = row.querySelector('.sel-nama-tindakan');
        if (!isWajibConsent && selTindakan && selTindakan.tagName.toLowerCase() === 'select' && selTindakan.selectedIndex >= 0) {
            const optAktif = selTindakan.options[selTindakan.selectedIndex];
            if (optAktif && optAktif.getAttribute('data-butuh-consent') === "1") isWajibConsent = true;
        }

        let badge = row.querySelector('.badge-wajib-consent');
        if (isWajibConsent) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'badge-wajib-consent';
                badge.style = "display: inline-block; background-color: #e67e22; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 3px; margin-top: 4px; align-self: flex-start;";
                badge.innerHTML = "⚠️ Wajib Informed Consent";
                if (selTindakan && selTindakan.parentElement) selTindakan.parentElement.appendChild(badge);
            } else { badge.style.display = "inline-block"; }
        } else if (badge) { badge.style.display = "none"; }

        window.simpanDraftRME();
        if (typeof window.periksaKebutuhanConsentUI === "function") window.periksaKebutuhanConsentUI();
    };

    window.mulaiDikteInputDinamis = function(rowId) {
        const row = document.getElementById(rowId);
        if (!row) return;
        const inputCatatan = row.querySelector('.inp-catatan-tindakan');
        const tempId = "temp_mic_" + rowId;
        inputCatatan.id = tempId;
        if (typeof window.mulaiDikte === "function") window.mulaiDikte(tempId);
    };

    window.pemicuEditCatatanMulai = function(barisSheet, isHariIni) {
        if (!window.currentHistoryData) { alert("⚠️ Gagal membaca memori riwayat."); return; }
        
        const kolomKiri = document.getElementById('kolomInputRME'); 
        if (kolomKiri) kolomKiri.style.setProperty('display', 'block', 'important');

        const formAktif = document.getElementById('formModalMedisSplit') || document.getElementById('formModalMedis');
        if (formAktif) {
            formAktif.style.setProperty('display', 'block', 'important');
            formAktif.querySelectorAll('.form-group').forEach(el => el.style.setProperty('display', 'block', 'important'));
        }

        const dataTerpilih = window.currentHistoryData.find(r => String(r.barisSheet) === String(barisSheet));
        
        if (dataTerpilih) {
            // 🔥 MENGUNCI HAK MILIK DOKTER ASLI SAAT DI-EDIT OLEH OWNER/ADMIN
            window.dokterPemilikRM = dataTerpilih.idDokter;
            window.namaDokterPemilikRM = dataTerpilih.namaDokter;

            let proKontrolMentah = dataTerpilih.proKontrol || "";
            let extractedDate = "";
            let pureCatatan = proKontrolMentah;

            const regexTgl = /Tgl Kontrol:\s*([0-9]{2,4}-[0-9]{2}-[0-9]{2,4})/i;
            const matchTgl = proKontrolMentah.match(regexTgl);
            
            if (matchTgl && matchTgl[1]) {
                extractedDate = matchTgl[1].trim();
                if (extractedDate.match(/^[0-9]{2}-[0-9]{2}-[0-9]{4}$/)) {
                    let p = extractedDate.split('-');
                    extractedDate = `${p[2]}-${p[1]}-${p[0]}`; 
                }
                pureCatatan = proKontrolMentah.replace(/🗓️ Tgl Kontrol:.*?\n📝 Catatan:\s*/g, "").trim();
                pureCatatan = pureCatatan.replace(/🗓️ Tgl Kontrol:.*?\n/g, "").trim(); 
            }

            window.salinAtauEditRME(isHariIni, dataTerpilih.barisSheet, dataTerpilih.anamnesa, dataTerpilih.objektif, dataTerpilih.diagnosa, dataTerpilih.perawatan, dataTerpilih.resep, dataTerpilih.proPerawatan, pureCatatan);

            const normalisasiTeks = (teks) => (teks || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
            window.originalRmeSnapshot = normalisasiTeks(dataTerpilih.anamnesa) + normalisasiTeks(dataTerpilih.objektif) + normalisasiTeks(dataTerpilih.diagnosa) + normalisasiTeks(dataTerpilih.perawatan) + normalisasiTeks(dataTerpilih.resep) + normalisasiTeks(dataTerpilih.proPerawatan) + normalisasiTeks(pureCatatan) + normalisasiTeks(extractedDate);

            setTimeout(() => {
                document.querySelectorAll('#modalTanggalKontrol, #tanggalKontrol').forEach(el => el.value = extractedDate);
            }, 50);
            
            const btnBatal = document.getElementById('btnBatalEdit');
            if (btnBatal) btnBatal.style.setProperty('display', 'block', 'important');
            
        } else {
            alert("⚠️ Data rekam medis tidak ditemukan di dalam memori.");
        }
    };

    window.salinAtauEditRME = function(isHariIni, barisSheet, anam, obj, diag, per, res, proPer, proKon) {
        const kolomKiri = document.getElementById('kolomInputRME');
        if(kolomKiri) kolomKiri.style.display = 'block';
        
        const setNilaiAman = (idElement, nilai) => {
            document.querySelectorAll('#' + idElement).forEach(el => el.value = nilai || "");
        };

        setNilaiAman('modalAnamnesa', anam); setNilaiAman('txtAnamnesa', anam);
        setNilaiAman('modalObjektif', obj); setNilaiAman('txtObjektif', obj);
        
        setNilaiAman('modalDiagnosa', diag); setNilaiAman('txtDiagnosa', diag);
        window.triggerSyncDiagnosa();

        setNilaiAman('modalResep', res); setNilaiAman('txtResep', res);
        setNilaiAman('modalProPerawatan', proPer); setNilaiAman('txtProPerawatan', proPer);
        setNilaiAman('modalProKontrol', proKon); setNilaiAman('txtProKontrol', proKon);

        window.barisRekamMedisTarget = barisSheet;

        const kontainerTindakan = getVisibleContainer();
        if (kontainerTindakan) {
            kontainerTindakan.innerHTML = ""; 
            try {
                let arrTindakan = JSON.parse(per);
                if (Array.isArray(arrTindakan) && arrTindakan.length > 0) {
                    arrTindakan.forEach(t => { window.tambahBarisTindakan({ namaTindakan: t.namaTindakan, hargaDiinput: t.hargaDiinput || t.hargaBersihPerItem || 0, catatanKlinis: t.catatanKlinis }); });
                }
            } catch(e) {
                if (per && per !== "-" && per !== "") window.tambahBarisTindakan({ namaTindakan: "KUSTOM", hargaDiinput: 0, catatanKlinis: per });
            }
        }

        const btnSimpan = document.getElementById('btnSimpanRME');

        if (isHariIni === true || isHariIni === "true") {
            if(btnSimpan) btnSimpan.innerHTML = "💾 Simpan Perubahan Edit"; 
            alert("Mode Edit Aktif: Anda akan memperbarui catatan rekam medis HARI INI secara langsung.");
        } else {
            if(btnSimpan) btnSimpan.innerHTML = "💾 Simpan Koreksi / Revisi"; 
            alert("Mode Revisi Aktif: Anda akan mengoreksi data MASA LALU.\n\nSistem TIDAK AKAN menghapus data asli, melainkan membuat BARIS KOREKSI BARU sebagai rekam jejak audit.");
        }

        const btnBatal = document.getElementById('btnBatalEdit');
        if(btnBatal) btnBatal.style.display = 'block';

        const wrapperHistori = document.getElementById('wrapperRiwayatFull');
        if (wrapperHistori) {
            wrapperHistori.querySelectorAll('button').forEach(btn => {
                btn.classList.add('disabled-by-edit'); btn.disabled = true; btn.style.opacity = '0.4'; btn.style.cursor = 'not-allowed'; 
            });
        }
        window.simpanDraftRME();
    };

    window.batalEditRME = function() {
        window.isRestoringDraft = true; 
        const formSplit = document.getElementById('formModalMedisSplit') || document.getElementById('formModalMedis');
        if (formSplit) formSplit.reset();
        
        document.querySelectorAll('#modalDiagnosa, #txtDiagnosa, [name="diagnosa"]').forEach(el => el.value = "");
        window.triggerSyncDiagnosa();

        window.barisRekamMedisTarget = null;
        window.dokterPemilikRM = null; // Bersihkan memori pemilik
        window.namaDokterPemilikRM = null; 
        
        if (typeof window.resetStatusConsentUI === "function") window.resetStatusConsentUI();
        
        const btnBatal = document.getElementById('btnBatalEdit');
        if (btnBatal) btnBatal.style.setProperty('display', 'none', 'important');
        
        const btnSimpan = document.getElementById('btnSimpanRME');
        if (btnSimpan) btnSimpan.innerHTML = "💾 Simpan & Selesaikan Kunjungan";
        
        const kolomInput = document.getElementById('kolomInputRME');
        if (kolomInput) kolomInput.style.setProperty('display', 'none', 'important');

        const kolomHistori = document.getElementById('kolomHistoriRME');
        if (kolomHistori) kolomHistori.style.setProperty('display', 'block', 'important');

        const kontainerTindakan = getVisibleContainer();
        if (kontainerTindakan) kontainerTindakan.innerHTML = "";

        const wrapperHistori = document.getElementById('wrapperRiwayatFull');
        if (wrapperHistori) {
            wrapperHistori.querySelectorAll('button.disabled-by-edit').forEach(btn => {
                btn.classList.remove('disabled-by-edit'); btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; 
            });
        }
        setTimeout(() => { window.isRestoringDraft = false; }, 200);
        alert("Mode edit dibatalkan. Formulir telah dibersihkan.");
    };

    window.validasiSebelumSimpanRME = function() {
        let diagVal = "";
        const formAktif = document.getElementById('formModalMedisSplit') || document.getElementById('formModalMedis');
        if (formAktif) {
            formAktif.querySelectorAll('#modalDiagnosa, #txtDiagnosa, [name="diagnosa"]').forEach(el => { if(el.value.trim() !== "") diagVal = el.value; });
        }
        
        if (diagVal === "") {
            alert("⚠️ Kolom Diagnosa masih kosong!\n\nSilakan pilih penyakit dari tombol cepat atau ketik dan tekan Enter pada kolom pencarian Diagnosa.");
            return false; 
        }

        const formPencari = document.getElementById('formModalMedisSplit') || document.getElementById('formModalMedis') || document;
        const barisTindakan = formPencari.querySelectorAll('.baris-tindakan-item');
        let adaTindakanBerisiko = false;
        let namaTindakanBerisiko = [];

        barisTindakan.forEach(row => {
            if (!isVisible(row)) return; 
            const selNama = row.querySelector('.sel-nama-tindakan');
            if (!selNama || !selNama.value) return;

            const namaTerpilih = selNama.value.trim().toLowerCase();
            let isWajib = row.getAttribute('data-butuh-consent') == "1" || (selNama.getAttribute('data-butuh-consent') == "1") || row.querySelector('.badge-consent');

            if (!isWajib && window.masterTindakanGlobal && window.masterTindakanGlobal.length > 0) {
                const itemMaster = window.masterTindakanGlobal.find(item => {
                    const namaMaster = (item.nama || item.namaTindakan || "").trim().toLowerCase();
                    return namaMaster === namaTerpilih;
                });
                if (itemMaster && (itemMaster.butuhConsent == 1 || itemMaster.butuhConsent === true)) isWajib = true;
            }

            if (isWajib) { adaTindakanBerisiko = true; namaTindakanBerisiko.push(selNama.value.trim()); }
        });

        if (adaTindakanBerisiko && !window.consentSudahDisimpanHariIni) {
            alert(`⚠️ TINDAKAN MEDIS BERISIKO TERDETEKSI!\n\nTindakan: "${namaTindakanBerisiko.join(', ')}"\n\nSesuai SOP Medico-Legal Klinik Anvaya, Anda wajib membuat Informed Consent terlebih dahulu sebelum menutup rekam medis ini.`);
            if (typeof window.triggerInformedConsentDariRME === "function") window.triggerInformedConsentDariRME();
            return false; 
        }
        return true; 
    };

    window.bukaModalRiwayatFull = function(noRM, namaPasien, mode = 'input', tanggalDaftarLangsung = "", rowNumberTarget = "") {
        const cleanNoRM = String(noRM || "").trim();
        if (!cleanNoRM || cleanNoRM === "-") { alert("⚠️ Nomor Rekam Medis pasien tidak valid."); return; }

        let dataPasienObj = null;
        if (typeof window.dataAntreanGlobal !== 'undefined' && window.dataAntreanGlobal !== null) {
            if (rowNumberTarget !== "") dataPasienObj = window.dataAntreanGlobal.find(p => p.noRM === cleanNoRM && String(p.rowNumber) === String(rowNumberTarget));
            else dataPasienObj = window.dataAntreanGlobal.find(p => p.noRM === cleanNoRM);
        }

        // 🔥 MENGUNCI HAK MILIK SAAT PASIEN DIBUKA DARI ANTREAN
        window.dokterPemilikRM = null;
        window.namaDokterPemilikRM = null;
        if (dataPasienObj) {
            window.dokterPemilikRM = dataPasienObj.idDokter || dataPasienObj.id_dokter || null;
            window.namaDokterPemilikRM = dataPasienObj.dokter || dataPasienObj.namaDokter || null;
        }

        window.tanggalKunjunganAktif = tanggalDaftarLangsung || (dataPasienObj ? dataPasienObj.tanggalDaftar : "");
        window.isPasienLunasAktif = dataPasienObj && (dataPasienObj.statusBayar === "Lunas" || (dataPasienObj.statusBayar && dataPasienObj.statusBayar.toLowerCase() === "lunas"));

        const btnTambah = document.getElementById('btnTambahTindakan');
        if (btnTambah) btnTambah.style.display = window.isPasienLunasAktif ? 'none' : 'inline-block';

        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        const perms = sessionData && sessionData.permissions ? sessionData.permissions : {};

        document.getElementById('modalRiwayatFull').style.display = 'flex'; 

        if (typeof window.muatKamusDikte === "function") window.muatKamusDikte();
        if (typeof window.muatMasterTindakan === "function" && (!window.masterTindakanGlobal || window.masterTindakanGlobal.length === 0)) window.muatMasterTindakan();
        
        const kolomKiri = document.getElementById('kolomInputRME');
        const formSplit = document.getElementById('formModalMedisSplit');
        const panelHistori = document.getElementById('kolomHistoriRME');
        const btnToggle = document.getElementById('btnToggleHistori');
        
        if (panelHistori) panelHistori.style.setProperty('display', 'block', 'important'); 
        if (btnToggle) { btnToggle.innerHTML = '👁️ Sembunyikan Histori'; btnToggle.style.backgroundColor = '#34495e'; }
        if (kolomKiri) { kolomKiri.style.flex = '0 0 55%'; kolomKiri.style.borderRight = '2px solid #bdc3c7'; }
        
        if (mode === 'view') {
            if (kolomKiri) kolomKiri.style.setProperty('display', 'none', 'important');
        } else {
            if (kolomKiri) kolomKiri.style.setProperty('display', 'block', 'important');
            if (formSplit) formSplit.style.setProperty('display', 'block', 'important');
        }

        document.getElementById('modalNoRM').value = cleanNoRM;
        document.getElementById('modalNama').value = namaPasien;
        document.getElementById('modalRowUpdate').value = rowNumberTarget; 
        
        window.isRestoringDraft = true; 
        if (formSplit) formSplit.reset();
        
        document.querySelectorAll('#modalDiagnosa, #txtDiagnosa, [name="diagnosa"]').forEach(el => el.value = "");
        window.triggerSyncDiagnosa();

        window.originalRmeSnapshot = null;
        window.barisRekamMedisTarget = null; 

        const savedDraft = localStorage.getItem('draft_rme_' + cleanNoRM);
        let draftValidObj = null;

        if (savedDraft && mode === 'input') {
            try {
                const tempDraft = JSON.parse(savedDraft);
                if (!tempDraft.visitDate || tempDraft.visitDate !== window.tanggalKunjunganAktif) {
                    localStorage.removeItem('draft_rme_' + cleanNoRM); localStorage.removeItem('ttd_consent_' + cleanNoRM); localStorage.removeItem('tujuan_consent_' + cleanNoRM);
                } else { draftValidObj = tempDraft; }
            } catch(e) { localStorage.removeItem('draft_rme_' + cleanNoRM); }
        }
        
        if (typeof window.resetStatusConsentUI === "function") window.resetStatusConsentUI();
        window.consentSudahDisimpanHariIni = false; window.urlFotoConsentAktif = ""; window.tujuanConsentAktif = "";

        const savedTTD = localStorage.getItem('ttd_consent_' + cleanNoRM);
        const savedTujuan = localStorage.getItem('tujuan_consent_' + cleanNoRM);

        if (savedTTD && savedTTD !== "-" && savedTTD !== "undefined") {
            window.consentSudahDisimpanHariIni = true; window.urlFotoConsentAktif = savedTTD;
            if (savedTujuan) window.tujuanConsentAktif = savedTujuan;
            const btnConsent = document.getElementById('btnBuatConsent');
            if (btnConsent) { btnConsent.style.backgroundColor = "#27ae60"; btnConsent.innerHTML = "✅ Informed Consent Tersimpan"; }
        }
        
        const kontainerTindakan = getVisibleContainer();
        if (kontainerTindakan) {
            kontainerTindakan.innerHTML = "";
            let infoLunas = document.getElementById('infoLunasRME');
            if (!infoLunas) {
                infoLunas = document.createElement('div');
                infoLunas.id = 'infoLunasRME';
                infoLunas.style.padding = '8px 12px'; infoLunas.style.backgroundColor = '#d4edda'; infoLunas.style.borderLeft = '4px solid #28a745'; infoLunas.style.color = '#155724'; infoLunas.style.marginBottom = '12px'; infoLunas.style.borderRadius = '4px'; infoLunas.style.fontSize = '12px';
                infoLunas.innerHTML = '🔒 <strong>KUITANSI TELAH DICETAK (LUNAS).</strong><br>Anda dapat mengedit atau melengkapi catatan klinis pasien (Anamnesa, Diagnosa, dll), namun rincian tindakan dan tarif telah dikunci untuk menjaga integritas pembukuan kasir.';
                kontainerTindakan.parentNode.insertBefore(infoLunas, kontainerTindakan);
            }
            infoLunas.style.display = window.isPasienLunasAktif ? 'block' : 'none';
        }

        if (draftValidObj) { 
            const eksekusiRestorasi = () => {
                if (!window.masterTindakanGlobal || window.masterTindakanGlobal.length === 0) { setTimeout(eksekusiRestorasi, 300); return; }
                try {
                    const draftObj = draftValidObj;
                    const pasokNilai = (idUtama, idAlternatif, val) => {
                        document.querySelectorAll(`#${idUtama}`).forEach(el => el.value = val || "");
                        document.querySelectorAll(`#${idAlternatif}`).forEach(el => el.value = val || "");
                    };
                    
                    pasokNilai('modalAnamnesa', 'txtAnamnesa', draftObj.anamnesa);
                    pasokNilai('modalObjektif', 'txtObjektif', draftObj.objektif);
                    
                    pasokNilai('modalDiagnosa', 'txtDiagnosa', draftObj.diagnosa);
                    window.triggerSyncDiagnosa();

                    pasokNilai('modalPerawatan', 'txtPerawatan', draftObj.perawatan);
                    pasokNilai('resep', 'modalResep', draftObj.resep);
                    pasokNilai('proPerawatan', 'modalProPerawatan', draftObj.proPerawatan);
                    pasokNilai('proKontrol', 'modalProKontrol', draftObj.proKontrol);
                    pasokNilai('tanggalKontrol', 'modalTanggalKontrol', draftObj.tanggalKontrol);

                    if (draftObj.savedTTD && draftObj.savedTTD !== "-" && draftObj.savedTTD !== "") {
                        localStorage.setItem('ttd_consent_' + cleanNoRM, draftObj.savedTTD);
                        window.consentSudahDisimpanHariIni = true; window.urlFotoConsentAktif = draftObj.savedTTD;
                    }

                    if (draftObj.tindakanDinamis && Array.isArray(draftObj.tindakanDinamis) && draftObj.tindakanDinamis.length > 0) {
                        draftObj.tindakanDinamis.forEach(t => { window.tambahBarisTindakan(t); });
                        setTimeout(() => { window.simpanDraftRME(); }, 150);
                    }
                } catch(e) { console.error("Gagal merestorasi draf RME:", e); }
            };
            eksekusiRestorasi();
        }

        setTimeout(() => { window.isRestoringDraft = false; }, 200);

        const timelineContainer = document.getElementById('wrapperRiwayatFull');
        if (timelineContainer) timelineContainer.innerHTML = '<p style="text-align:center; padding:20px; font-weight:bold; color:#555;">Mengambil riwayat & profil medis... ⏳</p>';

        const bannerMedis = document.getElementById('bannerPeringatanMedis');
        const elAlergi = document.getElementById('kontenAlergiRME');
        const elObat = document.getElementById('kontenObatRME');
        if (bannerMedis) bannerMedis.style.display = 'none';
        if (elAlergi) { elAlergi.innerHTML = ''; elAlergi.style.display = 'none'; }
        if (elObat) { elObat.innerHTML = ''; elObat.style.display = 'none'; }

        fetch(window.WEB_APP_URL, { method: "POST", body: JSON.stringify({ action: "getDetailPasien", noRM: cleanNoRM }) })
        .then(res => res.json())
        .then(res => {
            if(res.result === "success" && res.data) {
                window.pasienRMEAktif = res.data;
                let umur = typeof window.hitungUmur === "function" ? window.hitungUmur(res.data.tanggalLahir) : "-";
                document.getElementById('lblProfilNama').innerText = res.data.nama || namaPasien || "-";
                document.getElementById('lblProfilRM').innerText = res.data.noRM || cleanNoRM || "-";
                document.getElementById('lblProfilUmur').innerText = `${res.data.tempatLahir || '-'}, ${res.data.tanggalLahir || '-'} (${umur} Thn)`;
                document.getElementById('lblProfilKTP').innerText = res.data.noKTP || "-";
                document.getElementById('lblProfilWA').innerText = res.data.phone || "-";
                document.getElementById('lblProfilKerja').innerText = res.data.pekerjaan || "-";
                
                let domisiliGabung = (res.data.kecamatan && res.data.kecamatan !== "-") ? `${res.data.kecamatan}, ${res.data.kota}` : (res.data.alamat || "-");
                document.getElementById('lblProfilDomisili').innerText = domisiliGabung;

                let alergi = res.data.alergi ? res.data.alergi.trim() : "-";
                let obatRutin = res.data.obatRutin ? res.data.obatRutin.trim() : "-";
                let bannerTampil = false;

                if(alergi !== "-" && alergi !== "" && alergi.toLowerCase() !== "tidak ada") {
                    if(elAlergi) { elAlergi.innerHTML = `⚠️ <strong>ALERGI:</strong> ${alergi}`; elAlergi.style.display = 'block'; }
                    bannerTampil = true;
                }
                if(obatRutin !== "-" && obatRutin !== "" && obatRutin.toLowerCase() !== "tidak ada") {
                    if(elObat) { elObat.innerHTML = `💊 <strong>OBAT RUTIN:</strong> ${obatRutin}`; elObat.style.display = 'block'; }
                    bannerTampil = true;
                }
                if(bannerTampil && bannerMedis) bannerMedis.style.display = 'block';
            }
        });

        fetch(window.WEB_APP_URL, { method: "POST", body: JSON.stringify({ action: "getAllRiwayatMedis", noRM: cleanNoRM }) })
        .then(res => res.json())
        .then(res => {
            if (!timelineContainer) return;
            timelineContainer.innerHTML = "";
            
            if (res.result === "success" && res.data && res.data.length > 0) {
                const dataRiwayat = res.data.reverse(); 
                window.currentHistoryData = dataRiwayat; 
                
                dataRiwayat.forEach(r => {
                    let linkFotoHtml = r.linkFoto && r.linkFoto !== "-" ? `<a href="${r.linkFoto}" target="_blank" style="display:inline-block; margin-top:8px; color:#2980b9; font-weight:bold; z-index:10; position:relative;">🖼️ Lihat Lampiran Foto</a>` : '';
                    let linkPdfHtml = r.pdfUrl && r.pdfUrl !== "-" ? `<a href="${r.pdfUrl}" target="_blank" style="display:inline-block; margin-top:8px; margin-left:15px; color:#e74c3c; font-weight:bold; z-index:10; position:relative;">📄 Lihat PDF Consent</a>` : '';
                    
                    let tombolEditRMEHtml = '';
                    if (perms.editRME === 1 && mode !== 'input') { 
                        tombolEditRMEHtml = `<button onclick="window.pemicuEditCatatanMulai('${r.barisSheet}', ${r.isHariIni})" style="background-color: #e67e22; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; z-index:10; position:relative;">📝 Edit</button>`;
                    }

                    let tanggalKunjunganAsli = r.tanggalKunjungan && r.tanggalKunjungan !== "" && r.tanggalKunjungan !== "-" ? r.tanggalKunjungan : (r.tanggal ? r.tanggal.split(" ")[0] : "-"); 
                    let teksTanggalKunjungan = `<strong>🗓️ Kunjungan: ${tanggalKunjunganAsli}</strong>`;
                    let teksWaktuInput = `<span style="font-size: 11px; color: #7f8c8d;">⏱️ Input/Edit: ${r.tanggal || '-'}</span>`;
                    
                    let tanggalSistemCumaHari = r.tanggal ? r.tanggal.split(" ")[0] : ""; 
                    let formatSistemSama = tanggalSistemCumaHari;
                    if (tanggalSistemCumaHari.includes("/")) {
                        let parts = tanggalSistemCumaHari.split("/");
                        if (parts.length === 3 && parts[2].length === 4) { formatSistemSama = `${parts[2]}-${parts[1]}-${parts[0]}`; }
                    }

                    let infoEditan = "";
                    if (tanggalKunjunganAsli !== formatSistemSama && formatSistemSama !== "") {
                        infoEditan = `<div style="background-color: #fcf3cf; color: #d35400; font-size: 11px; padding: 3px 8px; border-radius: 4px; margin-top: 4px; display: inline-block; font-weight: 600;">⚠️ Koreksi / Input Susulan</div>`;
                    }

                    let tampilanTindakanHtml = "";
                    try {
                        let arrTindakan = JSON.parse(r.perawatan);
                        if (Array.isArray(arrTindakan) && arrTindakan.length > 0) {
                            arrTindakan.forEach(t => {
                                let hargaAman = Number(t.hargaDiinput || t.hargaBersihPerItem) || 0;
                                
                                // 🔥 KODE BARU: Desain UI Catatan Klinis yang lebih lega & profesional
                                // Jika ada catatan, buat baris baru (div) tanpa kurung & tanpa miring.
                                // Jika tidak ada catatan, cukup beri jeda enter (<br>).
                                let labelCatatan = t.catatanKlinis 
                                    ? `<div style="padding-left: 12px; color: #2c3e50; margin-top: 2px; margin-bottom: 8px;">${t.catatanKlinis}</div>` 
                                    : `<br>`;
                                
                                // Gabungkan Nama Tindakan dan Catatannya
                                tampilanTindakanHtml += `• <strong>${t.namaTindakan}</strong> - Rp ${hargaAman.toLocaleString('id-ID')}${labelCatatan}`;
                            });
                        } else {
                            tampilanTindakanHtml = typeof window.formatKeBulletPoin === "function" ? window.formatKeBulletPoin(r.perawatan) : r.perawatan;
                        }
                    } catch(e) {
                        tampilanTindakanHtml = typeof window.formatKeBulletPoin === "function" ? window.formatKeBulletPoin(r.perawatan) : (r.perawatan || "-"); 
                    }

                    // 🔥 PERUBAHAN HYBRID: Penambahan Sensor Accordion dan Class Khusus "detail-mobile-rme"
                    const card = document.createElement('div');
                    card.className = 'rme-card';
                    card.setAttribute('onclick', 'window.toggleCardMobileRME(this, event)'); // 👈 Sensor Sentuh
                    card.style.cssText = "border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 15px; background-color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.02);";
                    
                    card.innerHTML = `
                        <div class="rme-card-header" style="background-color:#f9f9f9; padding:12px 15px; border-bottom:1px solid #eee; border-radius: 8px 8px 0 0; display:flex; justify-content:space-between; align-items: flex-start;">
                            <div>
                                ${teksTanggalKunjungan}<br>${teksWaktuInput}
                                ${infoEditan}
                                <div style="margin-top: 5px; color: #2c3e50; font-size: 13px;">🩺 <strong>${r.namaDokter || r.idDokter || "Tidak Diketahui"}</strong></div>
                            </div>
                            <div class="rme-action-container">${tombolEditRMEHtml}</div>
                        </div>
                        <div class="detail-mobile-rme" style="font-size:13px; padding:15px; background-color: white; border-radius: 0 0 8px 8px;">
                            <div style="margin-bottom:8px;"><strong>💬 Anamnesa:</strong><br><span style="white-space:pre-wrap;">${typeof window.formatKeBulletPoin === "function" ? window.formatKeBulletPoin(r.anamnesa) : (r.anamnesa || '-')}</span></div>
                            <div style="margin-bottom:8px;"><strong>🔍 Objektif:</strong><br><span style="white-space:pre-wrap;">${typeof window.formatKeBulletPoin === "function" ? window.formatKeBulletPoin(r.objektif) : (r.objektif || '-')}</span></div>
                            <div style="margin-bottom:8px; color:#c0392b;"><strong>📌 Diagnosa:</strong><br><span style="white-space:pre-wrap;">${typeof window.formatKeBulletPoin === "function" ? window.formatKeBulletPoin(r.diagnosa) : (r.diagnosa || '-')}</span></div>
                            <div style="margin-bottom:8px;"><strong>🛠️ Tindakan:</strong><br><span style="white-space:pre-wrap;">${tampilanTindakanHtml || '-'}</span></div>
                            <div style="margin-bottom:8px; color:#2980b9;"><strong>📋 Pro Perawatan:</strong> <br><span style="white-space:pre-wrap;">${typeof window.formatKeBulletPoin === "function" ? window.formatKeBulletPoin(r.proPerawatan) : (r.proPerawatan || '-')}</span></div>
                            <div style="margin-bottom:8px; color:#8e44ad;"><strong>🔁 Pro Kontrol:</strong> <br><span style="white-space:pre-wrap;">${typeof window.formatKeBulletPoin === "function" ? window.formatKeBulletPoin(r.proKontrol) : (r.proKontrol || '-')}</span></div>
                            <div style="margin-bottom:8px; font-family:monospace; font-weight:bold;"><strong>💊 Resep:</strong><br><span style="white-space:pre-wrap;">${typeof window.formatKeBulletPoin === "function" ? window.formatKeBulletPoin(r.resep) : (r.resep || '-')}</span></div>
                            ${linkFotoHtml}
                            ${linkPdfHtml}
                        </div>
                    `;
                    timelineContainer.appendChild(card);
                });
            } else {
                timelineContainer.innerHTML = '<p style="text-align:center; padding:30px; color:#7f8c8d; font-weight:bold;">Belum ada riwayat medis yang tercatat untuk pasien ini.</p>';
            }
        });
    };

    window.bukaInputRME = function(noRM, namaPasien, tanggalDaftar) { 
        const formAktifRme = document.getElementById('formModalMedisSplit') || document.getElementById('formModalMedis');
        const kolomKiri = document.getElementById('kolomInputRME');
        if (kolomKiri) kolomKiri.style.display = 'block'; 

        if (formAktifRme) {
            formAktifRme.style.display = 'block';
            formAktifRme.reset();
            
            document.querySelectorAll('#modalDiagnosa, #txtDiagnosa, [name="diagnosa"]').forEach(el => el.value = "");
            window.triggerSyncDiagnosa();

            delete formAktifRme.dataset.rowUpdate;
            formAktifRme.dataset.activeNoRM = noRM;
            formAktifRme.dataset.tanggalDaftar = tanggalDaftar;
        }

        const areaKontainerRME = document.getElementById('modalRiwayatFull') || document.getElementById('sectionRME');
        if (areaKontainerRME) areaKontainerRME.style.display = 'flex';

        const setNilaiDOM = (idUtama, idAlternatif, value) => {
            const el1 = document.getElementById(idUtama);
            if (el1) { el1.value = value; return; }
            const el2 = document.getElementById(idAlternatif);
            if (el2) el2.value = value;
        };

        setNilaiDOM('modalNama', 'namaPasien', namaPasien);
        window.barisRekamMedisTarget = null; 

        // 🔥 MENGUNCI HAK MILIK SAAT PASIEN DIBUKA DARI DAFTAR TUNGGU
        window.dokterPemilikRM = null;
        window.namaDokterPemilikRM = null;
        if (typeof window.dataAntreanGlobal !== 'undefined' && window.dataAntreanGlobal !== null) {
            let dataPasienObj = window.dataAntreanGlobal.find(p => p.noRM === noRM);
            if (dataPasienObj) {
                window.dokterPemilikRM = dataPasienObj.idDokter || dataPasienObj.id_dokter || null;
                window.namaDokterPemilikRM = dataPasienObj.dokter || dataPasienObj.namaDokter || null;
            }
        }

        const alertBox = document.getElementById('alertMedisFormRME');
        if (alertBox) alertBox.style.display = 'none';
        
        const btnSubmit = formAktifRme ? formAktifRme.querySelector('button[type="submit"]') : document.getElementById('btnSubmitRME');
        if (btnSubmit) { btnSubmit.innerText = "⏳ Memuat Data..."; btnSubmit.disabled = true; }

        const tbodyRiwayat = document.getElementById('tabelRiwayatBody');
        if (tbodyRiwayat) tbodyRiwayat.innerHTML = '<tr><td colspan="6" style="text-align:center;">Mencari riwayat rekam medis di server...</td></tr>';
        
        fetch(window.WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getRekamMedisPasien', noRM: noRM, tanggal: tanggalDaftar })
        })
        .then(res => res.json())
        .then(data => {
            if (btnSubmit) btnSubmit.disabled = false;
            if (data.result === 'success') {
                if (data.hariIni) {
                    setNilaiDOM('modalAnamnesa', 'txtAnamnesa', data.hariIni.anamnesa || "");
                    setNilaiDOM('modalObjektif', 'txtObjektif', data.hariIni.objektif || "");
                    setNilaiDOM('modalDiagnosa', 'txtDiagnosa', data.hariIni.diagnosa || "");
                    window.triggerSyncDiagnosa();

                    setNilaiDOM('modalProPerawatan', 'txtProPerawatan', data.hariIni.proPerawatan || "");
                    setNilaiDOM('modalProKontrol', 'txtProKontrol', data.hariIni.proKontrol || "");
                    setNilaiDOM('modalResep', 'txtResep', data.hariIni.resep || "");
                    setNilaiDOM('modalLinkFoto', 'txtLinkFoto', data.hariIni.linkFoto || "");
                    
                    if (data.hariIni.pdfUrl) {
                        window.pdfConsentAktif = data.hariIni.pdfUrl;
                        localStorage.setItem('pdf_url_consent_' + noRM, data.hariIni.pdfUrl);
                    }

                    const elTgl1 = document.getElementById('modalTanggalKontrol');
                    const elTgl2 = document.getElementById('tanggalKontrol');

                    if (elTgl1) elTgl1.value = data.hariIni.tanggalKontrol || "";
                    if (elTgl2) elTgl2.value = data.hariIni.tanggalKontrol || "";
                    
                    if (data.rowHariIni) window.barisRekamMedisTarget = data.rowHariIni;
                    
                    const kontainerTindakan = getVisibleContainer();
                    if (kontainerTindakan) {
                        kontainerTindakan.innerHTML = "";
                        try {
                            let arrTindakan = JSON.parse(data.hariIni.perawatan);
                            if (Array.isArray(arrTindakan)) {
                                arrTindakan.forEach(t => { window.tambahBarisTindakan({ namaTindakan: t.namaTindakan, hargaDiinput: t.hargaDiinput || t.hargaBersihPerItem || 0, catatanKlinis: t.catatanKlinis || "" }); });
                            }
                        } catch(e) {
                            if (data.hariIni.perawatan) { window.tambahBarisTindakan({ namaTindakan: "KUSTOM", hargaDiinput: 0, catatanKlinis: data.hariIni.perawatan }); }
                        }
                    }
                    if (btnSubmit) { btnSubmit.innerText = "🔄 Update Catatan Rekam Medis"; btnSubmit.style.background = "#e67e22"; }
                } else {
                    if (btnSubmit) { btnSubmit.innerText = "💾 Simpan Catatan Medis Baru"; btnSubmit.style.background = "#9b59b6"; }
                    const kontainerTindakan = getVisibleContainer();
                    if (kontainerTindakan) kontainerTindakan.innerHTML = "";
                }
            }
        }).catch(err => { if (btnSubmit) btnSubmit.disabled = false; });
    };

    window.tutupInputRME = function() {
        window.barisRekamMedisTarget = null; 
        window.dokterPemilikRM = null; // Bersihkan memori pemilik
        window.namaDokterPemilikRM = null; 
        const sectionRME = document.getElementById('sectionRME');
        const modalRiwayatFull = document.getElementById('modalRiwayatFull');
        if (sectionRME) sectionRME.style.display = 'none';
        if (modalRiwayatFull) modalRiwayatFull.style.display = 'none';
    };

    

    // 🔥 FITUR BARU: Sensor Klik Accordion Khusus HP untuk Histori RME
    window.toggleCardMobileRME = function(element, event) {
        // PERLINDUNGAN: Cegah kartu membuka/menutup jika user tidak sengaja mengklik Tombol Edit atau Link Foto
        if (event.target.tagName === 'BUTTON' || event.target.tagName === 'A' || event.target.closest('button') || event.target.closest('a')) return;
        
        // Animasi Lipat hanya terjadi di layar HP
        if (window.innerWidth <= 768) {
            element.classList.toggle('expanded');
        }
    };

    

    

    // =====================================================================
    // 🔥 MESIN PENGGERAK STEPPER (Versi Upgrade Tahan Banting Mode Edit)
    // =====================================================================
    window.ubahStepRME = function(stepTujuan) {
        const formRME = document.getElementById('formModalMedisSplit');
        if(!formRME) return;

        formRME.setAttribute('data-active-step', stepTujuan);

        // 1. Update warna tombol navigasi
        document.querySelectorAll('.step-btn').forEach((btn, index) => {
            if(index + 1 === parseInt(stepTujuan)) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // 2. 🔥 JURUS PEMBERSIH: Hapus paksaan "display: block !important" dari fungsi Edit
        if (window.innerWidth <= 768) {
            Array.from(formRME.children).forEach(child => {
                if(child.style.display === 'block') child.style.removeProperty('display');
            });
            formRME.querySelectorAll('.form-group').forEach(el => {
                if(el.style.display === 'block') el.style.removeProperty('display');
            });
        }
    };

    // =====================================================================
    // 🔥 AUTO-RESET STEPPER: Paksa ke Step 1 setiap Buka / Edit Pasien
    // =====================================================================
    
    // A. Saat Mode Edit Riwayat
    const fungsiEditAsli = window.pemicuEditCatatanMulai;
    if (typeof fungsiEditAsli === "function") {
        window.pemicuEditCatatanMulai = function(barisSheet, isHariIni) {
            fungsiEditAsli(barisSheet, isHariIni); // Biarkan sistem Anda bekerja
            if (window.innerWidth <= 768) {
                setTimeout(() => { window.ubahStepRME(1); }, 100); // Reset ke Step 1
            }
        };
    }

    // B. Saat Mode Input Pasien Baru
    const fungsiBukaAsli = window.bukaInputRME;
    if (typeof fungsiBukaAsli === "function") {
        window.bukaInputRME = function(noRM, namaPasien, tanggalDaftar) {
            fungsiBukaAsli(noRM, namaPasien, tanggalDaftar); // Biarkan sistem Anda bekerja
            if (window.innerWidth <= 768) {
                setTimeout(() => { window.ubahStepRME(1); }, 100); // Reset ke Step 1
            }
        };
    }

    

})();