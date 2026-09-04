// =========================================================================
// 🧪 MODUL SMART WORKLIST LAB (JALUR B - AKSES PERAWAT)
// =========================================================================
(function() {

    // =====================================================================
    // 1. FUNGSI PENARIKAN DATA ANTREAN LAB DARI SERVER
    // =====================================================================
    window.muatAntreanLab = function() {
        const wadah = document.getElementById('tbodyAntreanLab');
        if(!wadah) return;
        
        // 🔥 Ubah tag <tr> menjadi <div> agar tidak rusak
        wadah.innerHTML = '<div style="text-align:center; padding:30px; font-weight:bold; color:#7f8c8d; background:#fff; border-radius:8px;">⏳ Menyinkronkan mesin pelacak dengan Kasir...</div>';
        
        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Memeriksa Tagihan Lab Menggantung...");

        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getAntreanLab" })
        })
        .then(res => res.json())
        .then(res => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            if (res.result === "success") { window.renderTabelAntreanLab(res.data); } 
            else { wadah.innerHTML = `<div style="text-align:center; padding:20px; color:red; background:#fff; border-radius:8px;">Gagal memuat: ${res.message}</div>`; }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            wadah.innerHTML = '<div style="text-align:center; padding:20px; color:red; background:#fff; border-radius:8px;">⚠️ Gangguan jaringan komunikasi.</div>';
        });
    };

    // =====================================================================
    // 2. FUNGSI RENDER CARD & ACCORDION (PENGGANTI TABEL KAKU)
    // =====================================================================
    window.renderTabelAntreanLab = function(data) {
        const wadah = document.getElementById('tbodyAntreanLab');
        if (!wadah) return;

        wadah.innerHTML = "";
        
        if (!data || data.length === 0) {
            wadah.innerHTML = '<div style="text-align:center; padding:40px; background:#fff; border-radius:8px; color:#7f8c8d; font-style:italic; box-shadow:0 2px 5px rgba(0,0,0,0.05);">🎉 Yeaay! Semua tagihan vendor lab eksternal pasien sudah beres diselesaikan!</div>';
            return;
        }

        data.forEach(item => {
            let amanInvoice = (item.invoice || "").replace(/'/g, "\\'");
            let amanPasien = (item.namaPasien || "").replace(/'/g, "\\'");
            let amanTindakan = (item.namaTindakan || "").replace(/'/g, "\\'");
            let amanDokter = (item.namaDokter || "").replace(/'/g, "\\'");

            let card = document.createElement('div');
            card.className = "lab-card";
            card.style.cssText = "background:#fff; border:1px solid #e0e0e0; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.02); overflow:hidden; transition: all 0.3s ease;";
            
            card.innerHTML = `
                <!-- HEADER KARTU (Bisa Diklik) -->
                <div onclick="window.toggleAccordionLab(this)" style="padding:15px; background:#fbfcfc; display:flex; justify-content:space-between; align-items:center; cursor:pointer; border-bottom:1px solid transparent;">
                    <div>
                        <div style="font-weight:bold; color:#2980b9; font-size:16px; margin-bottom:4px;">${item.namaPasien}</div>
                        <div style="font-size:12px; color:#7f8c8d; font-weight:bold;">${item.invoice}</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:11px; background:#e8f8f5; color:#1abc9c; padding:4px 8px; border-radius:12px; font-weight:bold;">Menunggu Harga</span>
                        <span class="acc-icon" style="font-size:18px; color:#95a5a6; transition: transform 0.3s; font-weight:bold;">▼</span>
                    </div>
                </div>
                
                <!-- BODY KARTU (Isi Tersembunyi) -->
                <div class="lab-card-body" style="display:none; padding:15px; border-top:1px solid #ecf0f1; background:#fff;">
                    <div style="margin-bottom:10px;">
                        <span style="font-size:12px; color:#7f8c8d;">Dokter Pengirim:</span><br>
                        <span style="font-weight:bold; color:#8e44ad; font-size:14px;">👨‍⚕️ ${item.namaDokter}</span>
                    </div>
                    <div style="margin-bottom:15px;">
                        <span style="font-size:12px; color:#7f8c8d;">Tindakan Lab / Vendor:</span><br>
                        <div style="display:inline-block; background:#fef5e7; padding:8px 12px; border-radius:6px; border:1px solid #f8c471; color:#d35400; font-size:14px; font-weight:bold; margin-top:4px; word-wrap:break-word; max-width: 100%;">
                            ${item.namaTindakan}
                        </div>
                    </div>
                    <button onclick="window.bukaModalInputLab('${amanInvoice}', '${amanPasien}', '${amanTindakan}', '${amanDokter}')" style="width:100%; background:#27ae60; color:white; border:none; padding:12px 15px; border-radius:6px; font-weight:bold; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.15); font-size:15px;">
                        💰 Input Harga Vendor
                    </button>
                </div>
            `;
            wadah.appendChild(card);
        });
    };

    // =====================================================================
    // 🔥 FUNGSI BARU: ANIMASI KLIK ACCORDION
    // Taruh fungsi ini tepat di bawah fungsi renderTabelAntreanLab di atas!
    // =====================================================================
    window.toggleAccordionLab = function(headerElement) {
        const cardBody = headerElement.nextElementSibling;
        const icon = headerElement.querySelector('.acc-icon');
        
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
    // 3. FUNGSI KONTROL JENDELA POP-UP (MODAL)
    // =====================================================================
    window.bukaModalInputLab = function(invoice, pasien, tindakan, dokter) {
        document.getElementById('hdnLabInvoice').value = invoice;
        document.getElementById('hdnLabDokter').value = dokter; 
        
        document.getElementById('lblLabPasien').innerText = pasien;
        document.getElementById('lblLabTindakan').innerText = tindakan;
        
        const inpHarga = document.getElementById('inpLabHargaDinamis');
        if (inpHarga) inpHarga.value = "";
        
        document.getElementById('lblPotonganDokter').innerText = "Rp 0";
        
        const modal = document.getElementById('modalInputLab');
        if (modal) modal.style.display = 'flex';
        
        setTimeout(() => { if (inpHarga) inpHarga.focus(); }, 100);
    };

    window.tutupModalInputLab = function() {
        const modal = document.getElementById('modalInputLab');
        if (modal) modal.style.display = 'none';
    };

    // =====================================================================
    // 4. MESIN KALKULASI REAL-TIME & FORMAT RUPIAH
    // =====================================================================
    window.formatRupiahRealtime = function(input) {
        let angkaMurni = input.value.replace(/[^0-9]/g, '');
        if (angkaMurni) {
            input.value = Number(angkaMurni).toLocaleString('id-ID'); 
        } else {
            input.value = '';
        }
        window.hitungRealtimePotonganLab();
    };

    window.hitungRealtimePotonganLab = function() {
        let inpHarga = document.getElementById('inpLabHargaDinamis');
        if (!inpHarga) return;

        let strHarga = inpHarga.value.replace(/[^0-9]/g, '');
        let harga = Number(strHarga) || 0;
        let beban = harga * 0.4; 
        
        let lblPotongan = document.getElementById('lblPotonganDokter');
        if (lblPotongan) lblPotongan.innerText = "- Rp " + beban.toLocaleString('id-ID');
    };

    // =====================================================================
    // 5. PROSES PENYIMPANAN KE DATABASE & CETAK STRUK
    // =====================================================================
    window.simpanTagihanLabDinamis = function(e) {
        e.preventDefault();
        
        let btn = (e.target && e.target.querySelector('button[type="submit"]')) || document.getElementById('btnSimpanLabDinamis');
        
        const invoice = document.getElementById('hdnLabInvoice').value;
        const pasien = document.getElementById('lblLabPasien').innerText;
        const tindakan = document.getElementById('lblLabTindakan').innerText;
        const dokter = document.getElementById('hdnLabDokter').value;
        
        let strHarga = document.getElementById('inpLabHargaDinamis').value.replace(/[^0-9]/g, '');
        const harga = Number(strHarga);
        
        if (harga <= 0) {
            alert("⚠️ Harga tagihan dari Vendor Lab tidak boleh nol!");
            return;
        }

        let beban = harga * 0.4; 

        if (btn) {
            btn.disabled = true;
            btn.innerText = "⏳ Menyimpan...";
        }

        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Memproses Tagihan & Mencetak Struk...");

        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        const operatorName = sessionData.username || "Perawat";

        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "simpanDataLab", 
                noKuitansi: invoice,
                tanggalBayar: new Date().toISOString().split('T')[0],
                hargaLab: harga, 
                pasien: pasien,
                perawatanLab: tindakan,
                operator: operatorName
            })
        })
        .then(res => res.json())
        .then(res => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();

            if (btn) {
                btn.disabled = false;
                btn.innerText = "💾 Simpan Lab";
            }

            if(res.result === "success") {
                window.tutupModalInputLab();
                window.cetakStrukLabInternal(invoice, pasien, tindakan, dokter, harga, beban);
                window.muatAntreanLab(); 
            } else {
                alert("❌ Gagal menyimpan: " + res.message);
            }
        })
        .catch(err => {
            // 🔥 UPDATE DINAMIS: AUTO-RECOVERY UNTUK GHOST TIMEOUT
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            if (btn) {
                btn.disabled = false;
                btn.innerText = "💾 Simpan Lab";
            }
            console.error("Error simpan Lab:", err);
            
            // Beritahu user dengan pesan yang menenangkan
            alert("⚠️ KONEKSI TERPUTUS SAAT MENYIMPAN!\n\nJangan panik. Data tagihan lab Anda kemungkinan besar sudah berhasil dicatat oleh sistem di latar belakang.\n\nSistem akan otomatis menutup jendela ini dan menyegarkan antrean untuk memastikannya.");
            
            // Tutup Pop-Up dan paksa Refresh tabel
            window.tutupModalInputLab();
            window.muatAntreanLab();
        });
    };

    window.cetakStrukLabInternal = function(invoice, pasien, tindakan, dokter, harga, beban) {
        const tglCetak = new Date().toLocaleString('id-ID');
        const jendelaCetak = window.open('', '_blank', 'width=400,height=600');
        
        const htmlStruk = `
            <html>
            <head>
                <title>Struk Tagihan Lab - ${invoice}</title>
                <style>
                    body { font-family: 'Courier New', Courier, monospace; font-size: 14px; padding: 20px; color: #000; }
                    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    .bold { font-weight: bold; }
                    .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2 style="margin:0; font-size: 18px;">KLINIK ANVAYA</h2>
                    <p style="margin:5px 0 0 0; font-size: 12px;">BUKTI INTERNAL TAGIHAN LAB</p>
                </div>
                
                <div class="row"><span>No. Invoice:</span> <span>${invoice}</span></div>
                <div class="row"><span>Waktu Cetak:</span> <span>${tglCetak}</span></div>
                
                <div class="divider"></div>
                
                <div class="row"><span>Nama Pasien:</span> <span class="bold">${pasien}</span></div>
                <div class="row"><span>Dokter PJP:</span> <span>${dokter}</span></div>
                <div class="row" style="margin-top: 10px;"><span>Tindakan Lab:</span></div>
                <div class="row bold" style="margin-left: 10px;">- ${tindakan}</div>
                
                <div class="divider"></div>
                
                <div class="row"><span>Tagihan Vendor:</span> <span class="bold">Rp ${Number(harga).toLocaleString('id-ID')}</span></div>
                <div class="row" style="color: #555; font-size: 12px;"><span>(Potongan Gaji Dokter 40%)</span> <span>(- Rp ${beban.toLocaleString('id-ID')})</span></div>
                
                <div class="divider"></div>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px;">
                    <p>Struk ini merupakan dokumen internal.<br>Harap lampirkan bersama form setoran.</p>
                </div>
            </body>
            </html>
        `;
        
        jendelaCetak.document.write(htmlStruk);
        jendelaCetak.document.close();
        jendelaCetak.focus();
        
        setTimeout(() => {
            jendelaCetak.print();
        }, 500);
    };

})();