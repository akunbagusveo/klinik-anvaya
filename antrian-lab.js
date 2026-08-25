// =========================================================================
// 🧪 MODUL SMART WORKLIST LAB (JALUR B - AKSES PERAWAT)
// =========================================================================
(function() {

    // =====================================================================
    // 1. FUNGSI PENARIKAN DATA ANTREAN LAB DARI SERVER
    // =====================================================================
    window.muatAntreanLab = function() {
        const tbody = document.getElementById('tbodyAntreanLab');
        if(!tbody) return;
        
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px;">⏳ Menyinkronkan mesin pelacak dengan Kasir...</td></tr>';
        
        // 🔥 UPGRADE: Menyalakan Layar Hitam Loading
        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Memeriksa Tagihan Lab Menggantung...");

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getAntreanLab" })
        })
        .then(res => res.json())
        .then(res => {
            // 🔥 MATIKAN Layar Hitam Loading
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();

            if (res.result === "success") {
                window.renderTabelAntreanLab(res.data);
            } else {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:red;">Gagal memuat: ${res.message}</td></tr>`;
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            console.error("Error muatAntreanLab:", err);
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:red;">⚠️ Gangguan jaringan komunikasi.</td></tr>';
        });
    };

    // =====================================================================
    // 2. FUNGSI RENDER TABEL & TOMBOL AKSI
    // =====================================================================
    window.renderTabelAntreanLab = function(data) {
        const tbody = document.getElementById('tbodyAntreanLab');
        if (!tbody) return;

        tbody.innerHTML = "";
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px; color:#7f8c8d; font-style:italic;">🎉 Yeaay! Semua tagihan vendor lab eksternal pasien sudah beres diselesaikan!</td></tr>';
            return;
        }

        data.forEach(item => {
            let tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid #ecf0f1";
            
            // 🔥 UPGRADE KESELAMATAN: Escape tanda kutip tunggal agar tombol onclick tidak Error
            let amanInvoice = (item.invoice || "").replace(/'/g, "\\'");
            let amanPasien = (item.namaPasien || "").replace(/'/g, "\\'");
            let amanTindakan = (item.namaTindakan || "").replace(/'/g, "\\'");
            let amanDokter = (item.namaDokter || "").replace(/'/g, "\\'");

            tr.innerHTML = `
                <td style="padding:15px; font-weight:bold; color:#34495e;">${item.invoice}</td>
                <td style="padding:15px; font-weight:bold; color:#2980b9;">${item.namaPasien}</td>
                <td style="padding:15px; font-weight:bold; color:#8e44ad;">👨‍⚕️ ${item.namaDokter}</td>
                <td style="padding:15px; font-weight:bold; color:#e67e22; max-width: 250px; line-height: 1.6;">
                    <span style="display:inline-block; background:#fef5e7; padding:6px 10px; border-radius:6px; border:1px solid #f8c471; word-wrap:break-word; white-space:normal;">
                        ${item.namaTindakan}
                    </span>
                </td>
                <td style="padding:15px; text-align:center;">
                    <button onclick="window.bukaModalInputLab('${amanInvoice}', '${amanPasien}', '${amanTindakan}', '${amanDokter}')" style="background:#27ae60; color:white; border:none; padding:8px 15px; border-radius:4px; font-weight:bold; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.1);">💰 Input Harga</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
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
        
        // Auto-focus ke kotak input agar perawat bisa langsung mengetik
        setTimeout(() => { if (inpHarga) inpHarga.focus(); }, 100);
    };

    // 🔥 FITUR BARU: Menutup Jendela Modal
    window.tutupModalInputLab = function() {
        const modal = document.getElementById('modalInputLab');
        if (modal) modal.style.display = 'none';
    };

    // =====================================================================
    // 4. MESIN KALKULASI REAL-TIME & FORMAT RUPIAH
    // =====================================================================
    window.formatRupiahRealtime = function(input) {
        // Hapus semua karakter selain angka
        let angkaMurni = input.value.replace(/[^0-9]/g, '');
        
        // 🔥 UPGRADE: Menyamakan standar format Rupiah menggunakan titik (id-ID)
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
        let beban = harga * 0.4; // 40% ditanggung dokter
        
        let lblPotongan = document.getElementById('lblPotonganDokter');
        if (lblPotongan) lblPotongan.innerText = "- Rp " + beban.toLocaleString('id-ID');
    };

    // =====================================================================
    // 5. PROSES PENYIMPANAN KE DATABASE & CETAK STRUK
    // =====================================================================
    window.simpanTagihanLabDinamis = function(e) {
        e.preventDefault();
        
        // Tangkap tombol secara aman
        let btn = (e.target && e.target.querySelector('button[type="submit"]')) || document.getElementById('btnSimpanLabDinamis');
        
        const invoice = document.getElementById('hdnLabInvoice').value;
        const pasien = document.getElementById('lblLabPasien').innerText;
        const tindakan = document.getElementById('lblLabTindakan').innerText;
        const dokter = document.getElementById('hdnLabDokter').value;
        
        // Bersihkan titik format rupiah sebelum dikirim ke Database
        let strHarga = document.getElementById('inpLabHargaDinamis').value.replace(/[^0-9]/g, '');
        const harga = Number(strHarga);
        
        if (harga <= 0) {
            alert("⚠️ Harga tagihan dari Vendor Lab tidak boleh nol!");
            return;
        }

        let beban = harga * 0.4; // 40%

        if (btn) {
            btn.disabled = true;
            btn.innerText = "⏳ Menyimpan...";
        }

        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Memproses Tagihan & Mencetak Struk...");

        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        const operatorName = sessionData.username || "Perawat";

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "simpanDataLab", 
                noKuitansi: invoice,
                tanggalBayar: new Date().toISOString().split('T')[0],
                hargaLab: harga, // Angka murni tanpa titik
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
                
                // Cetak Struk Mini
                window.cetakStrukLabInternal(invoice, pasien, tindakan, dokter, harga, beban);
                
                // Segarkan Tabel Antrean
                window.muatAntreanLab(); 
            } else {
                alert("❌ Gagal menyimpan: " + res.message);
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            if (btn) {
                btn.disabled = false;
                btn.innerText = "💾 Simpan Lab";
            }
            console.error("Error simpan Lab:", err);
            alert("⚠️ Gangguan jaringan. Mohon periksa koneksi internet Anda.");
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
        
        // Delay sedikit agar browser merender struknya sebelum memunculkan popup print
        setTimeout(() => {
            jendelaCetak.print();
        }, 500);
    };

})();