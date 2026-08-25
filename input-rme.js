// =========================================================================
// 🩺 MODUL INPUT REKAM MEDIS ELEKTRONIK (RME)
// =========================================================================
(function() { 
 
    // 1. VARIABEL PRIVAT MODUL RME
    window.masterTindakanGlobal = [];
    window.consentSudahDisimpanHariIni = false;

    // Listener Auto-Bullet Point pada textarea
    window.addEventListener('DOMContentLoaded', function() {
        const textareas = document.querySelectorAll('.auto-bullet');
        textareas.forEach(ta => {
            ta.addEventListener('focus', function() {
                if (this.value.trim() === '') this.value = '• ';
            });
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
    });

    // =========================================================================
    // 💾 PENYIMPAN DRAF RME (DENGAN SABUK PENGAMAN & TANGGAL KONTROL)
    // =========================================================================
    window.simpanDraftRME = function() {
        const modalRME = document.getElementById('modalRiwayatFull');
        if (modalRME && (modalRME.style.display === 'none' || modalRME.style.display === '')) return;
        if (window.isRestoringDraft) return;
        
        const elNoRM = document.getElementById('modalNoRM');
        if (!elNoRM) return;
        const noRM = elNoRM.value ? elNoRM.value.trim() : (elNoRM.innerText ? elNoRM.innerText.trim() : "");
        if (!noRM || noRM === "-" || noRM === "undefined") return;

        const ambilNilaiDualId = (idUtama, idAlternatif) => {
            const el1 = document.getElementById(idUtama);
            if (el1) return el1.value;
            const el2 = document.getElementById(idAlternatif);
            return el2 ? el2.value : "";
        };

        const barisTindakan = document.querySelectorAll('#kontainerTindakanDinamis .baris-tindakan-item');
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

        const anamnesa = ambilNilaiDualId('modalAnamnesa', 'anamnesa');
        const objektif = ambilNilaiDualId('modalObjektif', 'objektif');
        const diagnosa = ambilNilaiDualId('modalDiagnosa', 'diagnosa');
        const resep = ambilNilaiDualId('resep', 'modalResep');

        if (listTindakanDraft.length === 0 && anamnesa === "" && objektif === "" && diagnosa === "" && resep === "") return;

        const draft = {
            visitDate: window.tanggalKunjunganAktif, 
            anamnesa: anamnesa,
            objektif: objektif,
            diagnosa: diagnosa,
            tindakanDinamis: listTindakanDraft, 
            resep: resep,
            proPerawatan: ambilNilaiDualId('proPerawatan', 'modalProPerawatan'),
            proKontrol: ambilNilaiDualId('proKontrol', 'modalProKontrol'),
            tanggalKontrol: document.getElementById('tanggalKontrol') ? document.getElementById('tanggalKontrol').value : "",
            savedTTD: localStorage.getItem('ttd_consent_' + noRM) || ""
        };
        
        localStorage.setItem('draft_rme_' + noRM, JSON.stringify(draft));
    };


    // 🔥 FUNGSI UTAMA: Menambahkan Baris Tindakan dengan Filter Kategori & Format Rupiah
    window.tambahBarisTindakan = function(dataAwal = null) {
        const kontainer = document.getElementById('kontainerTindakanDinamis');
        if (!kontainer) return;

        const rowId = "tindakan_row_" + Date.now() + Math.floor(Math.random() * 100);

        const rowWrapper = document.createElement('div');
        rowWrapper.id = rowId;
        rowWrapper.className = 'baris-tindakan-item';
        rowWrapper.style = "display: flex; flex-direction: column; background: white; padding: 15px; border: 1px solid #ebd3c7; border-radius: 4px; border-left: 4px solid #3498db; box-shadow: 0 1px 3px rgba(0,0,0,0.05);";

        let setKategori = new Set();
        if (window.masterTindakanGlobal && window.masterTindakanGlobal.length > 0) {
            window.masterTindakanGlobal.forEach(t => {
                if (t.kategori) setKategori.add(t.kategori.trim());
            });
        }

        let opsiKategoriHtml = `<option value="">-- Pilih Kategori / Spesialis --</option>`;
        setKategori.forEach(kat => {
            opsiKategoriHtml += `<option value="${kat}">${kat.toUpperCase()}</option>`;
        });

        rowWrapper.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap;">
                <div style="flex: 1.2; min-width: 180px;">
                    <select class="sel-kategori-tindakan" style="width:100%; padding:8px; border-radius:4px; border:1px solid #bdc3c7; height: 38px;" onchange="window.filterTindakanPerKategori('${rowId}', this.value)" required>
                        ${opsiKategoriHtml}
                    </select>
                </div>
                
                <div style="flex: 2; min-width: 200px; display: flex; flex-direction: column; justify-content: flex-start;">
                    <select class="sel-nama-tindakan" style="width:100%; padding:8px; border-radius:4px; border:1px solid #bdc3c7; background-color: #f5f6fa; height: 38px;" onchange="window.pilihTindakanDinamis('${rowId}', this.value)" disabled required>
                        <option value="">-- Pilih Tindakan Medis --</option>
                    </select>
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

        const elemenKategori = rowWrapper.querySelector('.sel-kategori-tindakan');
        const elemenTindakan = rowWrapper.querySelector('.sel-nama-tindakan');
        const elemenHarga = rowWrapper.querySelector('.inp-harga-tindakan');
        const elemenCatatan = rowWrapper.querySelector('.inp-catatan-tindakan');

        if (elemenKategori) elemenKategori.addEventListener('change', window.simpanDraftRME);
        if (elemenTindakan) {
            elemenTindakan.addEventListener('change', () => {
                window.simpanDraftRME();
                if (typeof window.periksaKebutuhanConsentUI === "function") window.periksaKebutuhanConsentUI();
            });
        }
        if (elemenHarga) {
            elemenHarga.addEventListener('input', window.simpanDraftRME);
            elemenHarga.addEventListener('change', window.simpanDraftRME);
        }
        if (elemenCatatan) elemenCatatan.addEventListener('input', window.simpanDraftRME);

        if (dataAwal) {
            const matchTindakan = window.masterTindakanGlobal.find(t => t.nama === dataAwal.namaTindakan);
            if (matchTindakan) {
                rowWrapper.querySelector('.sel-kategori-tindakan').value = matchTindakan.kategori;
                window.filterTindakanPerKategori(rowId, matchTindakan.kategori);
                rowWrapper.querySelector('.sel-nama-tindakan').value = dataAwal.namaTindakan;
                window.pilihTindakanDinamis(rowId, dataAwal.namaTindakan);
                
                const inpHarga = rowWrapper.querySelector('.inp-harga-tindakan');
                inpHarga.value = Number(dataAwal.hargaDiinput).toLocaleString('en-US');
                rowWrapper.querySelector('.inp-catatan-tindakan').value = dataAwal.catatanKlinis || "";
            }
        }

        if (window.isPasienLunasAktif) {
            const elemenKategori = rowWrapper.querySelector('.sel-kategori-tindakan');
            const elemenTindakan = rowWrapper.querySelector('.sel-nama-tindakan');
            const elemenHarga = rowWrapper.querySelector('.inp-harga-tindakan');
            
            if (elemenKategori) { elemenKategori.disabled = true; elemenKategori.style.backgroundColor = "#e9ecef"; }
            if (elemenTindakan) { elemenTindakan.disabled = true; elemenTindakan.style.backgroundColor = "#e9ecef"; }
            if (elemenHarga) { elemenHarga.readOnly = true; elemenHarga.style.backgroundColor = "#e9ecef"; }
            
            const elemenTombolHapus = rowWrapper.querySelectorAll('button, [class*="hapus"], [onclick*="hapus"]');
            elemenTombolHapus.forEach(tombol => {
                tombol.style.display = 'none';
            });
        }

        window.simpanDraftRME();
        if (typeof window.periksaKebutuhanConsentUI === "function") window.periksaKebutuhanConsentUI();

        setTimeout(() => {
            window.simpanDraftRME();
            if (typeof window.periksaKebutuhanConsentUI === "function") window.periksaKebutuhanConsentUI();
        }, 150);
    };

    window.hapusBarisTindakan = function(rowId) {
        const row = document.getElementById(rowId);
        if (row) row.remove();
        window.simpanDraftRME();
        if (typeof window.periksaKebutuhanConsentUI === "function") window.periksaKebutuhanConsentUI();
    };

    // =========================================================================
    // 🎯 FILTER TINDAKAN PER KATEGORI 
    // =========================================================================
    window.filterTindakanPerKategori = function(rowId, kategoriTerpilih) {
        const row = document.getElementById(rowId);
        if (!row) return;

        let selTindakan = row.querySelector('.sel-nama-tindakan');
        const inpHarga = row.querySelector('.inp-harga-tindakan');
        const boxHarga = row.querySelector('.box-harga-container');
        const divInfo = row.querySelector('.info-tindakan-detail');

        if (!selTindakan) return;

        if (selTindakan.tagName.toLowerCase() === 'input') {
            let cellTindakan = selTindakan.parentElement;
            if (cellTindakan && cellTindakan.classList.contains('wrapper-kustom-input')) {
                cellTindakan = cellTindakan.parentElement;
            }
            
            if (cellTindakan) {
                cellTindakan.innerHTML = `
                    <select class="sel-nama-tindakan" style="width:100%; padding:8px; border-radius:4px; border:1px solid #bdc3c7; background-color: #f5f6fa; height: 38px;" onchange="window.pilihTindakanDinamis('${rowId}', this.value)" required>
                        <option value="">-- Pilih Tindakan Medis --</option>
                    </select>
                `;
                selTindakan = row.querySelector('.sel-nama-tindakan');
                if (selTindakan) {
                    selTindakan.addEventListener('change', () => {
                        window.simpanDraftRME();
                        if (typeof window.periksaKebutuhanConsentUI === "function") window.periksaKebutuhanConsentUI();
                    });
                }
            }
        }

        const badgeConsent = row.querySelector('.badge-wajib-consent');
        if (badgeConsent) badgeConsent.style.display = "none";

        selTindakan.innerHTML = `<option value="" data-butuh-consent="0">-- Pilih Tindakan Medis --</option>`;
        if (inpHarga) {
            inpHarga.value = "";
            inpHarga.disabled = true;
        }
        if (boxHarga) boxHarga.style.backgroundColor = "#f5f6fa";
        if (divInfo) divInfo.style.display = "none";

        const cleanKategoriTerpilih = String(kategoriTerpilih || "").trim().toLowerCase();
        if (!cleanKategoriTerpilih) {
            selTindakan.disabled = true;
            selTindakan.style.backgroundColor = "#f5f6fa";
            if (typeof window.periksaKebutuhanConsentUI === "function") window.periksaKebutuhanConsentUI();
            return;
        }

        selTindakan.disabled = false;
        selTindakan.style.backgroundColor = "white";

        const masterList = window.masterTindakanGlobal || [];
        masterList.forEach(t => {
            const katMaster = String(t.kategori || t.Kategori || "").trim().toLowerCase();
            
            if (katMaster === cleanKategoriTerpilih) {
                const namaBersih = String(t.nama || t.Nama_Tindakan || t.namaTindakan || "").trim();
                const valConsent = t.Butuh_Consent || t.butuhConsent || t.butuh_consent || t[3] || 0;
                const isWajib = (String(valConsent).trim() === "1" || valConsent === 1 || String(valConsent).toLowerCase() === "true");
                
                selTindakan.innerHTML += `<option value="${namaBersih}" data-butuh-consent="${isWajib ? '1' : '0'}">${namaBersih}</option>`;
            }
        });

        selTindakan.innerHTML += `<option value="KUSTOM" data-butuh-consent="0">Lain-lain / Tindakan Kustom</option>`;
        
        if (typeof window.periksaKebutuhanConsentUI === "function") window.periksaKebutuhanConsentUI();
    };

    // =========================================================================
    // 🎯 PEMILIH TINDAKAN DINAMIS
    // =========================================================================
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
                            const pesanError = `Harga harus di antara Rp ${minHarga.toLocaleString('en-US')} - Rp ${maxHarga.toLocaleString('en-US')}`;
                            this.setCustomValidity(pesanError); 
                            this.style.color = "#c0392b"; 
                            if (boxHarga) boxHarga.style.border = "2px solid #e74c3c"; 
                        } else {
                            this.setCustomValidity(''); 
                            this.style.color = "inherit";
                            if (boxHarga) boxHarga.style.border = "1px solid #bdc3c7";
                        }
                    } else {
                        this.setCustomValidity('');
                        this.style.color = "inherit";
                        if (boxHarga) boxHarga.style.border = "1px solid #bdc3c7";
                    }
                } else {
                    this.value = "";
                    this.setCustomValidity('');
                    this.style.color = "inherit";
                    if (boxHarga) boxHarga.style.border = "1px solid #bdc3c7";
                }
                window.simpanDraftRME();
            };
        };

        if (!cleanNamaPilihan) {
            if (inpHarga) { 
                inpHarga.value = ""; 
                inpHarga.disabled = true; 
                inpHarga.setCustomValidity(''); 
                inpHarga.style.color = "inherit";
            }
            if (boxHarga) {
                boxHarga.style.backgroundColor = "#f5f6fa"; 
                boxHarga.style.border = "1px solid #bdc3c7";
            }
            if (infoDetail) infoDetail.style.display = 'none';
            const badgeLama = row.querySelector('.badge-wajib-consent');
            if (badgeLama) badgeLama.style.display = 'none';
            if (typeof window.periksaKebutuhanConsentUI === "function") window.periksaKebutuhanConsentUI();
            return;
        }

        if (cleanNamaPilihan.toUpperCase() === "KUSTOM") {
            if (selTindakan && selTindakan.tagName.toLowerCase() === 'select') {
                const parentCell = selTindakan.parentElement;
                parentCell.innerHTML = `
                    <div class="wrapper-kustom-input" style="display:flex; width:100%;">
                        <input type="text" class="sel-nama-tindakan" placeholder="Ketik nama tindakan..." style="width:100%; padding:8px; border-radius:4px; border:1px solid #bdc3c7; height: 38px;" onchange="window.simpanDraftRME(); window.periksaKebutuhanConsentUI();" required>
                    </div>
                `;
                setTimeout(() => {
                    const newInp = row.querySelector('.sel-nama-tindakan');
                    if (newInp) newInp.focus();
                }, 50);
            }
            
            if (inpHarga) {
                inpHarga.disabled = false;
                inpHarga.readOnly = false;
                inpHarga.value = "";
                inpHarga.placeholder = "Ketik harga manual...";
                inpHarga.setCustomValidity(''); 
                inpHarga.style.color = "inherit";
                
                if (boxHarga) {
                    boxHarga.style.backgroundColor = "white"; 
                    boxHarga.style.border = "1px solid #bdc3c7";
                }
                pasangAutoFormatHarga(0, 0); 
            }
            
            if (infoDetail) infoDetail.style.display = 'none';
            const badgeLama = row.querySelector('.badge-wajib-consent');
            if (badgeLama) badgeLama.style.display = 'none';

            window.simpanDraftRME();
            if (typeof window.periksaKebutuhanConsentUI === "function") window.periksaKebutuhanConsentUI();
            return;
        }

        const match = (window.masterTindakanGlobal || []).find(t => {
            const n1 = String(t.nama || "").trim().toLowerCase();
            return n1 === cleanNamaPilihan.toLowerCase();
        });

        let isWajibConsent = false;

        if (match) {
            const hargaDasar = Number(match.harga || 0);
            const hargaMaksimal = Number(match.hargaMaksimal || 0);
            
            if (inpHarga) {
                inpHarga.value = hargaDasar > 0 ? hargaDasar.toLocaleString('en-US') : "";
                inpHarga.setCustomValidity(''); 
                inpHarga.style.color = "inherit";
                if (boxHarga) boxHarga.style.border = "1px solid #bdc3c7";
                
                if (hargaMaksimal > 0 && hargaMaksimal !== hargaDasar) {
                    inpHarga.disabled = false;
                    inpHarga.readOnly = false;
                    inpHarga.placeholder = `Rp ${hargaDasar.toLocaleString('en-US')} - ${hargaMaksimal.toLocaleString('en-US')}`;
                    if (boxHarga) boxHarga.style.backgroundColor = "white"; 
                    pasangAutoFormatHarga(hargaDasar, hargaMaksimal); 
                } else {
                    inpHarga.disabled = true; 
                    inpHarga.placeholder = "0";
                    if (boxHarga) boxHarga.style.backgroundColor = "#f5f6fa"; 
                    inpHarga.oninput = null; 
                }
                inpHarga.dispatchEvent(new Event('input'));
                inpHarga.dispatchEvent(new Event('change'));
            }
            
            const teksKet = String(match.keterangan || "").trim();
            const teksKategori = String(match.kategori || "").trim();
            
            if (lblKeterangan) lblKeterangan.innerText = teksKet;
            
            if (lblKategori) {
                if (teksKategori) {
                    lblKategori.innerText = teksKategori.toUpperCase();
                    lblKategori.style.display = 'inline-block';
                } else {
                    lblKategori.innerText = "";
                    lblKategori.style.display = 'none'; 
                }
            }
            
            if (infoDetail) {
                infoDetail.style.display = (teksKet || teksKategori) ? 'block' : 'none';
            }

            const butuhConsentVal = match.Butuh_Consent || match.butuhConsent || 0;
            isWajibConsent = (String(butuhConsentVal).trim() === "1" || butuhConsentVal === 1 || String(butuhConsentVal).toLowerCase() === "true");
        }

        selTindakan = row.querySelector('.sel-nama-tindakan');
        if (!isWajibConsent && selTindakan && selTindakan.tagName.toLowerCase() === 'select' && selTindakan.selectedIndex >= 0) {
            const optAktif = selTindakan.options[selTindakan.selectedIndex];
            if (optAktif && optAktif.getAttribute('data-butuh-consent') === "1") {
                isWajibConsent = true;
            }
        }

        let badge = row.querySelector('.badge-wajib-consent');
        if (isWajibConsent) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'badge-wajib-consent';
                badge.style = "display: inline-block; background-color: #e67e22; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 3px; margin-top: 4px; align-self: flex-start;";
                badge.innerHTML = "⚠️ Wajib Informed Consent";
                if (selTindakan && selTindakan.parentElement) selTindakan.parentElement.appendChild(badge);
            } else {
                badge.style.display = "inline-block";
            }
        } else if (badge) {
            badge.style.display = "none";
        }

        window.simpanDraftRME();
        if (typeof window.periksaKebutuhanConsentUI === "function") window.periksaKebutuhanConsentUI();
    };

    window.mulaiDikteInputDinamis = function(rowId) {
        const row = document.getElementById(rowId);
        if (!row) return;
        const inputCatatan = row.querySelector('.inp-catatan-tindakan');
        
        const tempId = "temp_mic_" + rowId;
        inputCatatan.id = tempId;
        
        if (typeof window.mulaiDikte === "function") {
            window.mulaiDikte(tempId);
        }
    };

    window.pemicuKoreksiRMEDariTimeline = function(noRM, namaPasien, tanggalDaftar, barisSheet, anamnesa, objektif, diagnosa, perawatan, resep) {

        const kolomKiri = document.getElementById('kolomInputRME'); 
        if (kolomKiri) {
            kolomKiri.style.display = 'block'; 
        }

        const formKiriSplit = document.getElementById('formModalMedisSplit') || 
                              document.getElementById('formModalMedis') || 
                              document.getElementById('formMedis');
        if (formKiriSplit) {
            formKiriSplit.style.display = 'block'; 
            formKiriSplit.dataset.activeNoRM = noRM;
            formKiriSplit.dataset.tanggalDaftar = tanggalDaftar;
            formKiriSplit.dataset.rowUpdate = barisSheet; 
        }

        const areaKontainerRME = document.getElementById('modalRiwayatFull') || document.getElementById('sectionRME');
        if (areaKontainerRME) {
            areaKontainerRME.style.display = 'flex';
        }

        const setNilaiDOM = (idUtama, idAlternatif, value) => {
            const el1 = document.getElementById(idUtama);
            if (el1) { el1.value = value; return; }
            const el2 = document.getElementById(idAlternatif);
            if (el2) el2.value = value;
        };

        setNilaiDOM('modalNama', 'namaPasien', namaPasien);
        setNilaiDOM('modalAnamnesa', 'txtAnamnesa', anamnesa === "-" ? "" : anamnesa);
        setNilaiDOM('modalObjektif', 'txtObjektif', objektif === "-" ? "" : objektif);
        setNilaiDOM('modalDiagnosa', 'txtDiagnosa', diagnosa === "-" ? "" : diagnosa);
        setNilaiDOM('modalResep', 'txtResep', resep === "-" ? "" : resep);

        const kontainerTindakan = document.getElementById('kontainerTindakanDinamis');
        if (kontainerTindakan) {
            kontainerTindakan.innerHTML = ""; 
            try {
                let arrTindakan = JSON.parse(perawatan);
                if (Array.isArray(arrTindakan) && arrTindakan.length > 0) {
                    arrTindakan.forEach(t => {
                        window.tambahBarisTindakan({
                            namaTindakan: t.namaTindakan,
                            hargaDiinput: t.hargaDiinput || t.hargaBersihPerItem || 0,
                            catatanKlinis: t.catatanKlinis || ""
                        });
                    });
                }
            } catch(e) {
                if (perawatan && perawatan !== "-" && perawatan !== "") {
                    window.tambahBarisTindakan({ namaTindakan: "KUSTOM", hargaDiinput: 0, catatanKlinis: perawatan });
                }
            }
        }

        const btnSubmit = formKiriSplit ? formKiriSplit.querySelector('button[type="submit"]') : document.getElementById('btnSubmitRME');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerText = "🔄 Proses Perubahan Rekam Medis";
            btnSubmit.style.background = "#e67e22";
        }
        
        const btnBatal = document.getElementById('btnBatalEdit');
        if (btnBatal) {
            btnBatal.style.display = 'block';
        }

        if (typeof window.switchTabRME === "function") {
            window.switchTabRME('form');
        }
    };

    // =========================================================================
    // 🎯 UNIFIKASI AMAN: FORM SUBMIT RME MULTI-ID DENGAN PERLINDUNGAN GANJAL
    // =========================================================================
    // 🔥 PERBAIKAN: Diubah menjadi DOMContentLoaded agar form ditangkap di awal
    window.addEventListener('DOMContentLoaded', function() {
        const formAktifRme = document.getElementById('formModalMedisSplit') || 
                             document.getElementById('formModalMedis') || 
                             document.getElementById('formMedis');

        if (formAktifRme) {
            formAktifRme.addEventListener('submit', async function(e) { 
                e.preventDefault(); 
                
                if (typeof window.validasiSebelumSimpanRME === "function" && !window.validasiSebelumSimpanRME()) {
                    return; 
                }

                const submitBtn = e.target.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true; 
                    submitBtn.innerText = "⏳ Menyimpan Perubahan...";
                }

                if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Mengenkripsi & Menyimpan Rekam Medis...");

                const sessionData    = JSON.parse(localStorage.getItem('anvaya_session'));
                const idDokterAktif  = sessionData ? sessionData.idUser : "USR-000"; 
                const usernameAktif  = sessionData ? sessionData.username : "Anonymous"; 
                const roleAktif      = sessionData ? sessionData.role : "Staff";        

                const idInputFile = document.getElementById('modalFileFoto') ? 'modalFileFoto' : 'txtFileFoto';
                let dataFileModal = null;
                if (typeof window.bacaFileKeBase64 === "function") {
                    dataFileModal = await window.bacaFileKeBase64(idInputFile);
                }

                const dapatkanNilaiDOM = (idUtama, idAlternatif) => {
                    const el1 = document.getElementById(idUtama);
                    if (el1) return el1.value;
                    const el2 = document.getElementById(idAlternatif);
                    return el2 ? el2.value : "";
                };

                const barisTindakan = document.querySelectorAll('#kontainerTindakanDinamis .baris-tindakan-item');
                let listTindakanDipilih = [];

                barisTindakan.forEach(row => {
                    const selNama = row.querySelector('.sel-nama-tindakan');
                    const inpHarga = row.querySelector('.inp-harga-tindakan');
                    const inpCatatan = row.querySelector('.inp-catatan-tindakan');
                    
                    if (selNama && selNama.value) {
                        let hargaMurni = Number(inpHarga.value.replace(/[^0-9]/g, '')) || 0;
                        let namaTindakanFix = selNama.value.trim();
                        
                        let statusButuhLab = 0;
                        if (window.masterTindakanGlobal) {
                            let dataMasterItem = window.masterTindakanGlobal.find(t => t.nama === namaTindakanFix);
                            if (dataMasterItem && dataMasterItem.Butuh_Lab === 1) {
                                statusButuhLab = 1;
                            }
                        }

                        listTindakanDipilih.push({
                            namaTindakan: namaTindakanFix,
                            hargaBersihPerItem: hargaMurni,
                            catatanKlinis: inpCatatan ? inpCatatan.value.trim() : "",
                            butuhLab: statusButuhLab 
                        });
                    }
                });

                if (!window.tokenRmeUnik) {
                    window.tokenRmeUnik = "RME-" + new Date().getTime() + "-" + Math.floor(Math.random() * 10000);
                }

                if (window.originalRmeSnapshot) {
                    const normalisasiTeks = (teks) => (teks || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
                    
                    const currentSnapshot = 
                        normalisasiTeks(dapatkanNilaiDOM('modalAnamnesa', 'txtAnamnesa')) +
                        normalisasiTeks(dapatkanNilaiDOM('modalObjektif', 'txtObjektif')) +
                        normalisasiTeks(dapatkanNilaiDOM('modalDiagnosa', 'txtDiagnosa')) +
                        normalisasiTeks(JSON.stringify(listTindakanDipilih)) + 
                        normalisasiTeks(dapatkanNilaiDOM('modalResep', 'txtResep')) +
                        normalisasiTeks(dapatkanNilaiDOM('modalProPerawatan', 'txtProPerawatan')) +
                        normalisasiTeks(dapatkanNilaiDOM('modalProKontrol', 'txtProKontrol')) +
                        normalisasiTeks(dapatkanNilaiDOM('modalTanggalKontrol', 'tanggalKontrol'));

                    if (currentSnapshot === window.originalRmeSnapshot) {
                        if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading(); 
                        
                        alert("⚠️ Tidak ada perubahan kalimat/kata yang terdeteksi.\n(Hanya mengubah spasi atau tanda baca tidak dihitung).\n\nPenyimpanan dibatalkan untuk mencegah duplikasi database.");
                        
                        if (submitBtn) {
                            submitBtn.disabled = false; 
                            submitBtn.innerText = "💾 Simpan & Selesaikan Kunjungan";
                        }
                        return; 
                    }
                }

                const data = {
                    action: "submitRekamMedis",
                    targetSheet: "RekamMedis",
                    tokenId: window.tokenRmeUnik, 
                    noRM: dapatkanNilaiDOM('modalNoRM', 'billNoRM') || formAktifRme.dataset.activeNoRM || "",
                    rowUpdate: dapatkanNilaiDOM('modalRowUpdate', 'modalRowUpdate') || formAktifRme.dataset.rowUpdate || "", 
                    namaPasien: dapatkanNilaiDOM('modalNama', 'billNama'),
                    anamnesa: dapatkanNilaiDOM('modalAnamnesa', 'txtAnamnesa'),
                    objektif: dapatkanNilaiDOM('modalObjektif', 'txtObjektif'),
                    diagnosa: dapatkanNilaiDOM('modalDiagnosa', 'txtDiagnosa'),
                    perawatan: JSON.stringify(listTindakanDipilih),
                    proPerawatan: dapatkanNilaiDOM('modalProPerawatan', 'txtProPerawatan'), 
                    proKontrol: dapatkanNilaiDOM('modalProKontrol', 'txtProKontrol'),
                    tanggalKontrolTarget: dapatkanNilaiDOM('modalTanggalKontrol', 'tanggalKontrol'),     
                    resep: dapatkanNilaiDOM('modalResep', 'txtResep'),
                    tanggalKunjungan: window.tanggalKunjunganAktif || (typeof dapatkanStringFormatAman === "function" ? dapatkanStringFormatAman(new Date()) : new Date().toISOString().split('T')[0]),
                    idDokter: idDokterAktif,
                    namaDokter: usernameAktif,
                    operatorUsername: usernameAktif, 
                    operatorRole: roleAktif,         
                    linkFoto: dapatkanNilaiDOM('modalLinkFoto', 'txtLinkFoto') || "-",
                    fileBaru: dataFileModal 
                };

                fetch(window.WEB_APP_URL, { method: "POST", body: JSON.stringify(data) })
                .then(response => response.json())
                .then(res => {
                    if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();

                    if (submitBtn) {
                        submitBtn.disabled = false; 
                        submitBtn.innerText = "💾 Simpan & Selesaikan Kunjungan";
                    }
                    
                    if(res.result === "success") {
                        alert("✅ Catatan Rekam Medis sukses disimpan dan dikunci!");
                        
                        window.tokenRmeUnik = null; 
                        if (typeof window.resetStatusConsentUI === "function") window.resetStatusConsentUI();
                        
                        const currentRM = data.noRM;
                        if(currentRM) {
                            const rmTrim = String(currentRM).trim();
                            localStorage.removeItem('draft_rme_' + rmTrim);
                            localStorage.removeItem('ttd_consent_' + rmTrim);
                            localStorage.removeItem('tujuan_consent_' + rmTrim);
                            localStorage.removeItem('pdf_url_consent_' + rmTrim); 
                        }
                        
                        const modalFull = document.getElementById('modalRiwayatFull') || document.getElementById('sectionRME');
                        if(modalFull) modalFull.style.display = 'none'; 
                        
                        if (typeof window.switchTab === "function") window.switchTab('antrean');
                        if (typeof window.muatAntreanHariIni === "function") window.muatAntreanHariIni(); 
                    } else { 
                        alert("❌ Gagal menyimpan: " + (res.message || "Terjadi kesalahan server.")); 
                    }
                }).catch(err => {
                    if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();

                    console.error(err);
                    if (submitBtn) submitBtn.innerText = "Koneksi Terputus...";
                    
                    alert("⚠️ KONEKSI TERPUTUS SAAT MENYIMPAN!\n\nDokter tidak perlu panik atau mengetik ulang. Data Rekam Medis kemungkinan besar SUDAH MASUK dengan aman ke server.\n\nSistem akan menutup formulir ini dan memuat ulang antrean untuk memastikannya.");
                    
                    const modalFull = document.getElementById('modalRiwayatFull') || document.getElementById('sectionRME');
                    if(modalFull) modalFull.style.display = 'none'; 
                    
                    if (typeof window.switchTab === "function") window.switchTab('antrean');
                    if (typeof window.muatAntreanHariIni === "function") window.muatAntreanHariIni(); 
                    
                    setTimeout(() => {
                        if (submitBtn) {
                            submitBtn.disabled = false; 
                            submitBtn.innerText = "💾 Simpan & Selesaikan Kunjungan";
                        }
                    }, 5000);
                });
            });
        }
    });

    window.pemicuEditCatatanMulai = function(barisSheet, isHariIni) {
        if (!window.currentHistoryData) {
            alert("⚠️ Gagal membaca memori riwayat. Silakan buka ulang RME.");
            return;
        }
        
        const kolomKiri = document.getElementById('kolomInputRME');
        if (kolomKiri) {
            kolomKiri.style.setProperty('display', 'block', 'important');
        }

        const formAktif = document.getElementById('formModalMedisSplit') || 
                        document.getElementById('formModalMedis') || 
                        document.getElementById('formMedis');
        
        if (formAktif) {
            formAktif.style.setProperty('display', 'block', 'important');
            formAktif.querySelectorAll('.form-group').forEach(el => {
                el.style.setProperty('display', 'block', 'important');
            });
        }

        const dataTerpilih = window.currentHistoryData.find(r => String(r.barisSheet) === String(barisSheet));
        
        if (dataTerpilih) {
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

            window.salinAtauEditRME(
                isHariIni,
                dataTerpilih.barisSheet,
                dataTerpilih.anamnesa,
                dataTerpilih.objektif,
                dataTerpilih.diagnosa,
                dataTerpilih.perawatan,
                dataTerpilih.resep,
                dataTerpilih.proPerawatan,
                pureCatatan 
            );

            const normalisasiTeks = (teks) => (teks || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
            
            window.originalRmeSnapshot = 
                normalisasiTeks(dataTerpilih.anamnesa) +
                normalisasiTeks(dataTerpilih.objektif) +
                normalisasiTeks(dataTerpilih.diagnosa) +
                normalisasiTeks(dataTerpilih.perawatan) +
                normalisasiTeks(dataTerpilih.resep) +
                normalisasiTeks(dataTerpilih.proPerawatan) +
                normalisasiTeks(pureCatatan) +
                normalisasiTeks(extractedDate);

            setTimeout(() => {
                const elTgl1 = document.getElementById('modalTanggalKontrol');
                const elTgl2 = document.getElementById('tanggalKontrol');
                if (elTgl1) elTgl1.value = extractedDate;
                if (elTgl2) elTgl2.value = extractedDate;
            }, 50);
            
            const btnBatal = document.getElementById('btnBatalEdit');
            if (btnBatal) btnBatal.style.setProperty('display', 'block', 'important');
            
        } else {
            alert("⚠️ Data rekam medis tidak ditemukan di dalam memori.");
        }

        setTimeout(() => {
            if (typeof window.periksaKebutuhanConsentUI === "function") window.periksaKebutuhanConsentUI();
        }, 300);
    };

    window.salinAtauEditRME = function(isHariIni, barisSheet, anam, obj, diag, per, res, proPer, proKon) {
        const kolomKiri = document.getElementById('kolomInputRME');
        if(kolomKiri) kolomKiri.style.display = 'block';
        
        const setNilaiAman = (idElement, nilai) => {
            const el = document.getElementById(idElement);
            if (el) el.value = nilai || "";
        };

        setNilaiAman('modalAnamnesa', anam);
        setNilaiAman('modalObjektif', obj);
        setNilaiAman('modalDiagnosa', diag);
        if (typeof window.sinkronisasiChipDiagnosa === "function") window.sinkronisasiChipDiagnosa();
        setNilaiAman('modalResep', res);
        setNilaiAman('modalProPerawatan', proPer);
        setNilaiAman('modalProKontrol', proKon); 

        const kontainerTindakan = document.getElementById('kontainerTindakanDinamis');
        if (kontainerTindakan) {
            kontainerTindakan.innerHTML = ""; 
            try {
                let arrTindakan = JSON.parse(per);
                if (Array.isArray(arrTindakan) && arrTindakan.length > 0) {
                    arrTindakan.forEach(t => {
                        window.tambahBarisTindakan({
                            namaTindakan: t.namaTindakan,
                            hargaDiinput: t.hargaDiinput || t.hargaBersihPerItem || 0,
                            catatanKlinis: t.catatanKlinis
                        });
                    });
                }
            } catch(e) {
                if (per && per !== "-" && per !== "") {
                    window.tambahBarisTindakan({
                        namaTindakan: "KUSTOM",
                        hargaDiinput: 0,
                        catatanKlinis: per
                    });
                }
            }
        }

        const btnSimpan = document.getElementById('btnSimpanRME');
        const hiddenRow = document.getElementById('modalRowUpdate');

        if (isHariIni === true || isHariIni === "true") {
            if(hiddenRow) hiddenRow.value = barisSheet;
            if(btnSimpan) btnSimpan.innerHTML = "💾 Simpan Perubahan Edit"; 
            alert("Mode Edit Aktif: Anda akan memperbarui catatan rekam medis HARI INI secara langsung.");
        } else {
            if(hiddenRow) hiddenRow.value = barisSheet; 
            if(btnSimpan) btnSimpan.innerHTML = "💾 Simpan Koreksi / Revisi"; 
            alert("Mode Revisi Aktif: Anda akan mengoreksi data MASA LALU.\n\nSistem TIDAK AKAN menghapus data asli, melainkan membuat BARIS KOREKSI BARU sebagai rekam jejak audit (Audit Trail) untuk Owner.");
        }

        const btnBatal = document.getElementById('btnBatalEdit');
        if(btnBatal) btnBatal.style.display = 'block';

        const wrapperHistori = document.getElementById('wrapperRiwayatFull');
        if (wrapperHistori) {
            const tombolHistori = wrapperHistori.querySelectorAll('button');
            tombolHistori.forEach(btn => {
                btn.classList.add('disabled-by-edit'); 
                btn.disabled = true; 
                btn.style.opacity = '0.4'; 
                btn.style.cursor = 'not-allowed'; 
                btn.title = "Selesaikan atau batalkan mode Edit/Salin di sebelah kiri terlebih dahulu.";
            });
        }
        
        window.simpanDraftRME();
    };

    window.batalEditRME = function() {
        window.isRestoringDraft = true; 

        const formSplit = document.getElementById('formModalMedisSplit');
        if (formSplit) formSplit.reset();
        
        const rowUpdate = document.getElementById('modalRowUpdate');
        if (rowUpdate) rowUpdate.value = "";

        if (typeof window.resetStatusConsentUI === "function") window.resetStatusConsentUI();
        
        const btnBatal = document.getElementById('btnBatalEdit');
        if (btnBatal) btnBatal.style.display = 'none';
        
        const btnSimpan = document.getElementById('btnSimpanRME');
        if (btnSimpan) btnSimpan.innerHTML = "💾 Simpan & Selesaikan Kunjungan";
        
        const kolomInput = document.getElementById('kolomInputRME');
        if (kolomInput) kolomInput.style.display = 'none';

        const kontainerTindakan = document.getElementById('kontainerTindakanDinamis');
        if (kontainerTindakan) kontainerTindakan.innerHTML = "";

        const wrapperHistori = document.getElementById('wrapperRiwayatFull');
        if (wrapperHistori) {
            const tombolHistori = wrapperHistori.querySelectorAll('button.disabled-by-edit');
            tombolHistori.forEach(btn => {
                btn.classList.remove('disabled-by-edit'); 
                btn.disabled = false; 
                btn.style.opacity = '1'; 
                btn.style.cursor = 'pointer'; 
                btn.title = ""; 
            });
        }
        
        setTimeout(() => { window.isRestoringDraft = false; }, 200);
        alert("Mode edit dibatalkan. Formulir telah dibersihkan.");
    };

    window.validasiSebelumSimpanRME = function() {
        const barisTindakan = document.querySelectorAll('#kontainerTindakanDinamis .baris-tindakan-item');
        let adaTindakanBerisiko = false;
        let namaTindakanBerisiko = [];

        const masterData = window.masterTindakanGlobal || [];

        barisTindakan.forEach(row => {
            const selNama = row.querySelector('.sel-nama-tindakan');
            if (!selNama || !selNama.value) return;

            const namaTerpilih = selNama.value.trim().toLowerCase();

            let isWajib = row.getAttribute('data-butuh-consent') == "1" || 
                        (selNama.getAttribute('data-butuh-consent') == "1") ||
                        row.querySelector('.badge-consent');

            if (!isWajib && masterData.length > 0) {
                const itemMaster = masterData.find(item => {
                    const namaMaster = (item.nama || item.namaTindakan || "").trim().toLowerCase();
                    return namaMaster === namaTerpilih;
                });

                if (itemMaster && (itemMaster.butuhConsent == 1 || itemMaster.butuhConsent === true)) {
                    isWajib = true;
                }
            }

            if (isWajib) {
                adaTindakanBerisiko = true;
                namaTindakanBerisiko.push(selNama.value.trim());
            }
        });

        if (adaTindakanBerisiko && !window.consentSudahDisimpanHariIni) {
            alert(`⚠️ TINDAKAN MEDIS BERISIKO TERDETEKSI!\n\nTindakan: "${namaTindakanBerisiko.join(', ')}"\n\nSesuai SOP Medico-Legal Klinik Anvaya, Anda wajib membuat Informed Consent dan meminta tanda tangan pasien/wali terlebih dahulu sebelum menutup rekam medis ini.`);
            
            if (typeof window.triggerInformedConsentDariRME === "function") {
                window.triggerInformedConsentDariRME();
            } else if (typeof window.bukaModalConsent === "function") {
                const noRM = document.getElementById('modalNoRM')?.value || "-";
                const nama = document.getElementById('modalNama')?.value || "-";
                window.bukaModalConsent(noRM, nama, namaTindakanBerisiko.join(', '));
            }
            return false; 
        }

        return true; 
    };

    window.bukaModalRiwayatFull = function(noRM, namaPasien, mode = 'input', tanggalDaftarLangsung = "", rowNumberTarget = "") {
        const cleanNoRM = String(noRM || "").trim();
        if (!cleanNoRM || cleanNoRM === "-" || cleanNoRM === "undefined") {
            alert("⚠️ Nomor Rekam Medis pasien tidak valid (" + cleanNoRM + "). Tidak dapat memuat profil RME.");
            return;
        }

        let dataPasienObj = null;
        if (typeof window.dataAntreanGlobal !== 'undefined' && window.dataAntreanGlobal !== null) {
            if (rowNumberTarget !== "") {
                dataPasienObj = window.dataAntreanGlobal.find(p => p.noRM === cleanNoRM && String(p.rowNumber) === String(rowNumberTarget));
            } else {
                dataPasienObj = window.dataAntreanGlobal.find(p => p.noRM === cleanNoRM);
            }
        }

        if (!dataPasienObj && mode === 'input') {
            alert("⚠️ Data antrean tidak ditemukan di memori!");
            return;
        }
        
        window.tanggalKunjunganAktif = tanggalDaftarLangsung || (dataPasienObj ? dataPasienObj.tanggalDaftar : "");
        window.isPasienLunasAktif = false;
        if (dataPasienObj && (dataPasienObj.statusBayar === "Lunas" || (dataPasienObj.statusBayar && dataPasienObj.statusBayar.toLowerCase() === "lunas"))) {
            window.isPasienLunasAktif = true;
        }

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
        
        if (panelHistori) panelHistori.style.display = 'block'; 
        if (btnToggle) {
            btnToggle.innerHTML = '👁️ Sembunyikan Histori';
            btnToggle.style.backgroundColor = '#34495e';
        }
        if (kolomKiri) {
            kolomKiri.style.flex = '0 0 55%';
            kolomKiri.style.borderRight = '2px solid #bdc3c7';
        }
        
        if (mode === 'view') {
            if (kolomKiri) kolomKiri.style.display = 'none'; 
        } else {
            if (kolomKiri) kolomKiri.style.display = 'block'; 
            if (formSplit) formSplit.style.display = 'block'; 
        }

        document.getElementById('modalNoRM').value = cleanNoRM;
        document.getElementById('modalNama').value = namaPasien;
        document.getElementById('modalRowUpdate').value = rowNumberTarget; 
        
        window.isRestoringDraft = true; 
        if (formSplit) formSplit.reset();

        window.originalRmeSnapshot = null;

        const savedDraft = localStorage.getItem('draft_rme_' + cleanNoRM);
        let draftValidObj = null;

        if (savedDraft && mode === 'input') {
            try {
                const tempDraft = JSON.parse(savedDraft);
                
                if (!tempDraft.visitDate || tempDraft.visitDate !== window.tanggalKunjunganAktif) {
                    console.log("🗑️ Draf usang atau dari kunjungan lama terdeteksi. Melakukan pembersihan otomatis...");
                    localStorage.removeItem('draft_rme_' + cleanNoRM);
                    localStorage.removeItem('ttd_consent_' + cleanNoRM);
                    localStorage.removeItem('tujuan_consent_' + cleanNoRM);
                } else {
                    draftValidObj = tempDraft; 
                }
            } catch(e) {
                console.error("Format draf rusak", e);
                localStorage.removeItem('draft_rme_' + cleanNoRM); 
            }
        }
        
        if (typeof window.resetStatusConsentUI === "function") window.resetStatusConsentUI();
        window.consentSudahDisimpanHariIni = false;
        window.urlFotoConsentAktif = "";
        window.tujuanConsentAktif = "";

        const savedTTD = localStorage.getItem('ttd_consent_' + cleanNoRM);
        const savedTujuan = localStorage.getItem('tujuan_consent_' + cleanNoRM);

        if (savedTTD && savedTTD !== "-" && savedTTD !== "undefined") {
            window.consentSudahDisimpanHariIni = true;
            window.urlFotoConsentAktif = savedTTD;
            if (savedTujuan) window.tujuanConsentAktif = savedTujuan;

            const btnConsent = document.getElementById('btnBuatConsent');
            if (btnConsent) {
                btnConsent.style.backgroundColor = "#27ae60"; 
                btnConsent.innerHTML = "✅ Informed Consent Tersimpan";
            }
        }
        
        const kontainerTindakan = document.getElementById('kontainerTindakanDinamis');
        if (kontainerTindakan) {
            kontainerTindakan.innerHTML = "";
            let infoLunas = document.getElementById('infoLunasRME');
            if (!infoLunas) {
                infoLunas = document.createElement('div');
                infoLunas.id = 'infoLunasRME';
                infoLunas.style.padding = '8px 12px';
                infoLunas.style.backgroundColor = '#d4edda';
                infoLunas.style.borderLeft = '4px solid #28a745';
                infoLunas.style.color = '#155724';
                infoLunas.style.marginBottom = '12px';
                infoLunas.style.borderRadius = '4px';
                infoLunas.style.fontSize = '12px';
                infoLunas.innerHTML = '🔒 <strong>KUITANSI TELAH DICETAK (LUNAS).</strong><br>Anda dapat mengedit atau melengkapi catatan klinis pasien (Anamnesa, Diagnosa, dll), namun rincian tindakan dan tarif telah dikunci untuk menjaga integritas pembukuan kasir.';
                kontainerTindakan.parentNode.insertBefore(infoLunas, kontainerTindakan);
            }
            infoLunas.style.display = window.isPasienLunasAktif ? 'block' : 'none';
        }

        if (draftValidObj) { 
            const eksekusiRestorasi = () => {
                if (!window.masterTindakanGlobal || window.masterTindakanGlobal.length === 0) {
                    setTimeout(eksekusiRestorasi, 300);
                    return;
                }
                
                try {
                    const draftObj = draftValidObj;
                    const pasokNilai = (id, val) => {
                        const el = document.getElementById(id);
                        if (el) el.value = val || "";
                    };
                    
                    pasokNilai('modalAnamnesa', draftObj.anamnesa);
                    pasokNilai('modalObjektif', draftObj.objektif);
                    pasokNilai('modalDiagnosa', draftObj.diagnosa);
                    pasokNilai('modalPerawatan', draftObj.perawatan);
                    pasokNilai('resep', draftObj.resep);
                    pasokNilai('modalResep', draftObj.resep);
                    pasokNilai('proPerawatan', draftObj.proPerawatan);
                    pasokNilai('modalProPerawatan', draftObj.proPerawatan);
                    pasokNilai('proKontrol', draftObj.proKontrol);
                    pasokNilai('modalProKontrol', draftObj.proKontrol);
                    pasokNilai('tanggalKontrol', draftObj.tanggalKontrol);

                    if (draftObj.savedTTD && draftObj.savedTTD !== "-" && draftObj.savedTTD !== "") {
                        localStorage.setItem('ttd_consent_' + cleanNoRM, draftObj.savedTTD);
                        window.consentSudahDisimpanHariIni = true;
                        window.urlFotoConsentAktif = draftObj.savedTTD;
                    }

                    if (draftObj.tindakanDinamis && Array.isArray(draftObj.tindakanDinamis) && draftObj.tindakanDinamis.length > 0) {
                        draftObj.tindakanDinamis.forEach(t => {
                            window.tambahBarisTindakan(t);
                        });
                        
                        setTimeout(() => {
                            const barisAktif = document.querySelectorAll('#kontainerTindakanDinamis .baris-tindakan-item');
                            barisAktif.forEach((row, index) => {
                                const dataDrafItem = draftObj.tindakanDinamis[index];
                                if (dataDrafItem) {
                                    const inpHarga = row.querySelector('.inp-harga-tindakan');
                                    if (inpHarga && dataDrafItem.hargaDiinput) {
                                        let hargaMurni = String(dataDrafItem.hargaDiinput).replace(/[^0-9]/g, '');
                                        if (hargaMurni) {
                                            inpHarga.value = hargaMurni;
                                            inpHarga.dispatchEvent(new Event('input'));
                                            inpHarga.dispatchEvent(new Event('change'));
                                        }
                                    }
                                    const inpCatatan = row.querySelector('.inp-catatan-tindakan');
                                    if (inpCatatan && dataDrafItem.catatanKlinis) {
                                        inpCatatan.value = dataDrafItem.catatanKlinis;
                                    }
                                }
                            });
                            
                            window.simpanDraftRME();
                            if (typeof window.periksaKebutuhanConsentUI === "function") window.periksaKebutuhanConsentUI();
                        }, 150);
                    } else {
                        if (typeof window.periksaKebutuhanConsentUI === "function") window.periksaKebutuhanConsentUI();
                    }
                } catch(e) {
                    console.error("Gagal merestorasi data draf RME:", e);
                }
            };
            eksekusiRestorasi();
        } else {
            if (typeof window.periksaKebutuhanConsentUI === "function") window.periksaKebutuhanConsentUI();
        }

        setTimeout(() => { window.isRestoringDraft = false; }, 200);

        const timelineContainer = document.getElementById('wrapperRiwayatFull');
        if (timelineContainer) timelineContainer.innerHTML = '<p style="text-align:center; padding:20px; font-weight:bold; color:#555;">Mengambil riwayat & profil medis... ⏳</p>';

        const bannerMedis = document.getElementById('bannerPeringatanMedis');
        if (bannerMedis) bannerMedis.style.display = 'none';

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

                if(alergi !== "-" && alergi.toLowerCase() !== "tidak ada") {
                    document.getElementById('kontenAlergiRME').innerHTML = `⚠️ <strong>ALERGI:</strong> ${alergi}`;
                    bannerTampil = true;
                }
                if(obatRutin !== "-" && obatRutin.toLowerCase() !== "tidak ada") {
                    document.getElementById('kontenObatRME').innerHTML = `💊 <strong>OBAT RUTIN:</strong> ${obatRutin}`;
                    bannerTampil = true;
                }
                if(bannerTampil && bannerMedis) bannerMedis.style.display = 'block';
            }
        })
        .catch(err => console.error("Gagal muat profil medis:", err));

        fetch(window.WEB_APP_URL, { method: "POST", body: JSON.stringify({ action: "getAllRiwayatMedis", noRM: cleanNoRM }) })
        .then(res => res.json())
        .then(res => {
            if (!timelineContainer) return;
            timelineContainer.innerHTML = "";
            
            if (res.result === "success" && res.data && res.data.length > 0) {
                const dataRiwayat = res.data.reverse(); 
                window.currentHistoryData = dataRiwayat; 
                
                dataRiwayat.forEach(r => {
                    let linkFotoHtml = r.linkFoto && r.linkFoto !== "-" ? `<a href="${r.linkFoto}" target="_blank" style="display:inline-block; margin-top:8px; color:#2980b9; font-weight:bold;">🖼️ Lihat Lampiran Foto</a>` : '';
                    
                    let tombolEditRMEHtml = '';
                    if (perms.editRME === 1 && mode !== 'input') { 
                        tombolEditRMEHtml = `
                            <button onclick="window.pemicuEditCatatanMulai('${r.barisSheet}', ${r.isHariIni})" 
                                    style="background-color: #e67e22; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer;">
                                📝 Edit / Salin Catatan
                            </button>
                        `;
                    }

                    let tanggalKunjunganAsli = r.tanggalKunjungan && r.tanggalKunjungan !== "" && r.tanggalKunjungan !== "-" ? r.tanggalKunjungan : (r.tanggal ? r.tanggal.split(" ")[0] : "-"); 
                    
                    let teksTanggalKunjungan = `<strong>🗓️ Kunjungan: ${tanggalKunjunganAsli}</strong>`;
                    let teksWaktuInput = `<span style="font-size: 11px; color: #7f8c8d;">⏱️ Input/Edit: ${r.tanggal || '-'}</span>`;
                    
                    let tanggalSistemCumaHari = r.tanggal ? r.tanggal.split(" ")[0] : ""; 
                    let formatSistemSama = tanggalSistemCumaHari;
                    
                    if (tanggalSistemCumaHari.includes("/")) {
                        let parts = tanggalSistemCumaHari.split("/");
                        if (parts.length === 3 && parts[2].length === 4) { 
                            formatSistemSama = `${parts[2]}-${parts[1]}-${parts[0]}`; 
                        }
                    }

                    let infoEditan = "";
                    if (tanggalKunjunganAsli !== formatSistemSama && formatSistemSama !== "") {
                        infoEditan = `<div style="background-color: #fcf3cf; color: #d35400; font-size: 11px; padding: 3px 8px; border-radius: 4px; margin-top: 4px; display: inline-block; font-weight: 600;">
                                        ⚠️ Koreksi / Input Susulan
                                    </div>`;
                    }

                    let tampilanTindakanHtml = "";
                    try {
                        let arrTindakan = JSON.parse(r.perawatan);
                        if (Array.isArray(arrTindakan) && arrTindakan.length > 0) {
                            arrTindakan.forEach(t => {
                                let labelCatatan = t.catatanKlinis ? ` <span style="color:#7f8c8d; font-style:italic;">(${t.catatanKlinis})</span>` : "";
                                let hargaAman = Number(t.hargaDiinput || t.hargaBersihPerItem) || 0;
                                tampilanTindakanHtml += `• <strong>${t.namaTindakan}</strong> - Rp ${hargaAman.toLocaleString('id-ID')}${labelCatatan}<br>`;
                            });
                        } else {
                            tampilanTindakanHtml = typeof window.formatKeBulletPoin === "function" ? window.formatKeBulletPoin(r.perawatan) : r.perawatan;
                        }
                    } catch(e) {
                        tampilanTindakanHtml = typeof window.formatKeBulletPoin === "function" ? window.formatKeBulletPoin(r.perawatan) : (r.perawatan || "-"); 
                    }

                    const card = document.createElement('div');
                    card.className = 'rme-card';
                    card.style.cssText = "border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 15px; background-color: white;";
                    card.innerHTML = `
                        <div class="rme-card-header" style="background-color:#f9f9f9; padding:10px 15px; border-bottom:1px solid #eee; border-left:4px solid #34495e; margin-bottom:10px; display:flex; justify-content:space-between; align-items: flex-start;">
                            <div>
                                ${teksTanggalKunjungan}<br>
                                ${teksWaktuInput}
                                ${infoEditan}
                                <div style="margin-top: 5px; color: #2c3e50; font-size: 12px;">🩺 <strong>Dr. ${r.namaDokter || r.idDokter || "Tidak Diketahui"}</strong></div>
                            </div>
                            <div>${tombolEditRMEHtml}</div>
                        </div>
                        <div style="font-size:13px; padding:5px 15px 15px 15px;">
                            <div style="margin-bottom:8px;"><strong>💬 Anamnesa:</strong><br><span style="white-space:pre-wrap;">${typeof window.formatKeBulletPoin === "function" ? window.formatKeBulletPoin(r.anamnesa) : (r.anamnesa || '-')}</span></div>
                            <div style="margin-bottom:8px;"><strong>🔍 Objektif:</strong><br><span style="white-space:pre-wrap;">${typeof window.formatKeBulletPoin === "function" ? window.formatKeBulletPoin(r.objektif) : (r.objektif || '-')}</span></div>
                            <div style="margin-bottom:8px; color:#c0392b;"><strong>📌 Diagnosa:</strong><br><span style="white-space:pre-wrap;">${typeof window.formatKeBulletPoin === "function" ? window.formatKeBulletPoin(r.diagnosa) : (r.diagnosa || '-')}</span></div>
                            <div style="margin-bottom:8px;"><strong>🛠️ Tindakan:</strong><br><span style="white-space:pre-wrap;">${tampilanTindakanHtml || '-'}</span></div>
                            
                            <div style="margin-bottom:8px; color:#2980b9;"><strong>📋 Pro Perawatan:</strong> <br><span style="white-space:pre-wrap;">${typeof window.formatKeBulletPoin === "function" ? window.formatKeBulletPoin(r.proPerawatan) : (r.proPerawatan || '-')}</span></div>
                            <div style="margin-bottom:8px; color:#8e44ad;"><strong>🔁 Pro Kontrol:</strong> <br><span style="white-space:pre-wrap;">${typeof window.formatKeBulletPoin === "function" ? window.formatKeBulletPoin(r.proKontrol) : (r.proKontrol || '-')}</span></div>
                            
                            <div style="margin-bottom:8px; font-family:monospace; font-weight:bold;"><strong>💊 Resep:</strong><br><span style="white-space:pre-wrap;">${typeof window.formatKeBulletPoin === "function" ? window.formatKeBulletPoin(r.resep) : (r.resep || '-')}</span></div>
                            ${linkFotoHtml}
                        </div>
                    `;
                    timelineContainer.appendChild(card);
                });
            } else {
                timelineContainer.innerHTML = '<p style="text-align:center; padding:30px; color:#7f8c8d; font-weight:bold;">Belum ada riwayat medis yang tercatat untuk pasien ini.</p>';
            }
        })
        .catch(err => {
            if (timelineContainer) timelineContainer.innerHTML = '<p style="text-align:center; padding:30px; color:#c0392b; font-weight:bold;">❌ Gagal memuat histori medis dari server.</p>';
            console.error("Gagal muat histori medis:", err);
        });
    };

    window.bukaInputRME = function(noRM, namaPasien, tanggalDaftar) { 
        const formAktifRme = document.getElementById('formModalMedisSplit') || 
                            document.getElementById('formModalMedis') || 
                            document.getElementById('formMedis');

        const kolomKiri = document.getElementById('kolomInputRME');
        if (kolomKiri) {
            kolomKiri.style.display = 'block'; 
        }

        if (formAktifRme) {
            formAktifRme.style.display = 'block';
            formAktifRme.reset();
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
                    setNilaiDOM('modalProPerawatan', 'txtProPerawatan', data.hariIni.proPerawatan || "");
                    setNilaiDOM('modalProKontrol', 'txtProKontrol', data.hariIni.proKontrol || "");
                    setNilaiDOM('modalResep', 'txtResep', data.hariIni.resep || "");
                    setNilaiDOM('modalLinkFoto', 'txtLinkFoto', data.hariIni.linkFoto || "");
                    
                    if (formAktifRme) formAktifRme.dataset.rowUpdate = data.rowHariIni;
                    
                    const kontainerTindakan = document.getElementById('kontainerTindakanDinamis');
                    if (kontainerTindakan) {
                        kontainerTindakan.innerHTML = "";
                        try {
                            let arrTindakan = JSON.parse(data.hariIni.perawatan);
                            if (Array.isArray(arrTindakan)) {
                                arrTindakan.forEach(t => {
                                    window.tambahBarisTindakan({
                                        namaTindakan: t.namaTindakan,
                                        hargaDiinput: t.hargaDiinput || t.hargaBersihPerItem || 0,
                                        catatanKlinis: t.catatanKlinis || ""
                                    });
                                });
                            }
                        } catch(e) {
                            if (data.hariIni.perawatan) {
                                window.tambahBarisTindakan({ namaTindakan: "KUSTOM", hargaDiinput: 0, catatanKlinis: data.hariIni.perawatan });
                            }
                        }
                    }
                    if (btnSubmit) { btnSubmit.innerText = "🔄 Update Catatan Rekam Medis"; btnSubmit.style.background = "#e67e22"; }
                } else {
                    if (btnSubmit) { btnSubmit.innerText = "💾 Simpan Catatan Medis Baru"; btnSubmit.style.background = "#9b59b6"; }
                    const kontainerTindakan = document.getElementById('kontainerTindakanDinamis');
                    if (kontainerTindakan) kontainerTindakan.innerHTML = "";
                }
            }
        }).catch(err => { if (btnSubmit) btnSubmit.disabled = false; });
    };

    window.tutupInputRME = function() {
        const sectionRME = document.getElementById('sectionRME');
        const modalRiwayatFull = document.getElementById('modalRiwayatFull');
        if (sectionRME) sectionRME.style.display = 'none';
        if (modalRiwayatFull) modalRiwayatFull.style.display = 'none';
    };

})();