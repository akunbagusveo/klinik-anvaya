// =========================================================================
// 💰 MODUL PENDAPATAN DOKTER & SISTEM BAGI HASIL (KOKPIT FINANSIAL)
// =========================================================================
(function() {

    // 1. Variabel Privat Modul
    let rawDataBagiHasil = [];
    
    window.dataBagiHasilGlobal = []; 
    window.periodeBagiHasilGlobal = ""; 

    // 🔥 HELPER GLOBAL: Mesin Pendeteksi Kepribadian Ganda (Anti-Split)
    window.isDokterMatchGlobal = function(namaA, namaB) {
        if (!namaA || !namaB) return false;
        let a = String(namaA).toLowerCase().replace(/^(dr\.|dr |drg\.|drg )/i, '').trim();
        let b = String(namaB).toLowerCase().replace(/^(dr\.|dr |drg\.|drg )/i, '').trim();
        if (a === "" || b === "") return false;
        return a === b || a.includes(b) || b.includes(a);
    };

    // =====================================================================
    // 🩺 FUNGSI 1: MENGUNDUH DATA SEBELUM MENGGAMBAR LAYAR (MODE DOKTER)
    // =====================================================================
    window.initPendapatanDokter = function() {
        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        const roleId = sessionData && sessionData.role ? String(sessionData.role).toLowerCase().trim() : "";
        const roleName = sessionData && sessionData.namaRole ? String(sessionData.namaRole).toLowerCase().trim() : "";
        
        const isSuperAdmin = roleId === "rol-01" || roleName === "super admin" || roleName === "owner" || roleId === "owner";

        if (isSuperAdmin) {
            let jangkar = document.getElementById('filterBulanPendapatanDokter');
            if (jangkar) {
                let kontainerUtama = jangkar.parentElement.parentElement.parentElement; 
                kontainerUtama.innerHTML = `
                    <div style="text-align:center; padding:80px 20px; background:white; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.05); margin-bottom:20px;">
                        <div style="font-size:70px; margin-bottom:15px;">👔</div>
                        <h2 style="color:#2c3e50; margin:0 0 10px 0; font-size:26px;">Halo, Tim Manajemen!</h2>
                        <p style="color:#7f8c8d; font-size:15px; max-width:600px; margin:0 auto 30px auto; line-height:1.6;">
                            Halaman ini adalah area <b>Self-Service</b> yang dirancang khusus bagi para <b>Dokter</b> untuk memantau rincian fee tindakan dan slip gaji mereka masing-masing secara mandiri.<br><br>
                            Untuk melihat analitik klinik dan mengelola slip gaji seluruh dokter, silakan gunakan menu <b>Kokpit Finansial</b>.
                        </p>
                        <button onclick="
                        let tabAnalisis = document.getElementById('tabAnalisisBisnisBtn');
                        let tabBackend = document.getElementById('tabBackendBtn');
                        let subFinansial = document.getElementById('btnSubTabFinansial');
                        let subTabKeuangan = document.getElementById('subTabFinansialBtn');
                        
                        if (tabAnalisis && tabAnalisis.style.display !== 'none') {
                            tabAnalisis.click();
                        } else if (subFinansial || subTabKeuangan) {
                            if (tabBackend) tabBackend.click();
                            setTimeout(() => {
                                if (subFinansial) subFinansial.click();
                                else if (subTabKeuangan) subTabKeuangan.click();
                            }, 150);
                        } else {
                            alert('Silakan klik menu Kokpit Finansial / Analisis Bisnis secara manual di sidebar.');
                        }
                    " style="background:#3498db; color:white; border:none; padding:12px 30px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:15px; box-shadow:0 4px 10px rgba(52, 152, 219, 0.3); transition:0.3s;">
                        📊 Buka Kokpit Finansial
                    </button>
                    </div>
                `;
            }
            return; 
        }

        let inpBulan = document.getElementById('filterBulanPendapatanDokter');
        if(!inpBulan) return;
        
        if(!inpBulan.value) {
            let tglSekarang = new Date();
            let blnStr = ("0" + (tglSekarang.getMonth() + 1)).slice(-2);
            inpBulan.value = tglSekarang.getFullYear() + "-" + blnStr;
        }

        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        const setHtml = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };

        setVal('cardDokJmlTindakan', "⏳");
        setVal('cardDokFeePokok', "Memuat...");
        setHtml('cardDokInjeksi', "-");
        setVal('cardDokTHP', "Menghitung...");
        
        let banner = document.getElementById('bannerStatusSlip');
        if (banner) banner.style.display = 'none'; 
        
        let tbody = document.getElementById('tabelRincianDokterBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:40px; color:#7f8c8d; font-size:14px;">Mengunduh & menyinkronkan data dari server... ⏳</td></tr>`;

        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Mengunduh Data Pendapatan & Kalkulasi Slip Gaji...");

        fetch(window.WEB_APP_URL, { method: "POST", body: JSON.stringify({ action: "getDaftarSlipTerkunci" }) })
        .then(res => res.json())
        .then(resArsip => {
            window.arsipGajiTerkunci = (resArsip.result === "success") ? resArsip.data : [];
            return fetch(window.WEB_APP_URL, { method: "POST", body: JSON.stringify({ action: "getBagiHasilDokter" }) });
        })
        .then(resTrx => resTrx.json())
        .then(resTrx => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();

            window.rawDataBagiHasil = (resTrx.result === "success") ? resTrx.data : [];
            window.renderUIKinerjaDokter();
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            setVal('cardDokFeePokok', "⚠️ Gagal Koneksi");
            if (tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:40px; color:#e74c3c; font-size:14px; font-weight:bold;">❌ Gagal menghubungi server. Silakan muat ulang.</td></tr>`;
        });
    };

    // =====================================================================
    // 🩺 2. RENDER DATA REAL-TIME / ARSIP PADA DASHBOARD DOKTER
    // =====================================================================
    window.renderUIKinerjaDokter = function() {
        let inpBulan = document.getElementById('filterBulanPendapatanDokter');
        if (!inpBulan) return;
        
        let bulanTerpilih = inpBulan.value; 
        if (!bulanTerpilih) return;

        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        const namaLengkapDokter = (sessionData.namaLengkap || "").toLowerCase().trim();
        const usernameDokter = (sessionData.username || "").toLowerCase().trim();

        const isNamaMatch = (namaDatabase) => {
            if (!namaDatabase) return false;
            let dbName = String(namaDatabase).toLowerCase().trim();
            if (dbName === namaLengkapDokter || dbName === usernameDokter) return true;
            if (namaLengkapDokter && dbName && (namaLengkapDokter.includes(dbName) || dbName.includes(namaLengkapDokter))) return true;
            if (usernameDokter && dbName && (usernameDokter.includes(dbName) || dbName.includes(usernameDokter))) return true;
            return false;
        };

        let dataArsip = null;
        if (window.arsipGajiTerkunci) {
            dataArsip = window.arsipGajiTerkunci.find(x => isNamaMatch(x.namaDokter) && x.periode === bulanTerpilih);
        }

        let banner = document.getElementById('bannerStatusSlip');

        if (dataArsip) {
            if (banner) {
                banner.style.display = 'flex';
                banner.style.background = '#e8f8f5';
                banner.style.borderLeft = '5px solid #27ae60';
                banner.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:24px;">✅</span>
                        <div>
                            <h4 style="margin:0; color:#27ae60; font-size:16px;">Slip Gaji Telah Diterbitkan!</h4>
                            <p style="margin:2px 0 0 0; color:#2c3e50; font-size:13px;">Data periode ${bulanTerpilih} sudah di-ACC oleh Manajemen dan bersifat final.</p>
                        </div>
                    </div>
                    <button onclick="window.tampilkanSlipGajiDokter('${dataArsip.namaDokter}', '${bulanTerpilih}')" style="background:#27ae60; color:white; border:none; padding:10px 20px; border-radius:4px; font-weight:bold; cursor:pointer; box-shadow:0 2px 5px rgba(0,0,0,0.2);">📄 Lihat Slip PDF Final</button>
                `;
            }

            let totalPokok = dataArsip.pokokFee || 0;
            let totalBonus = dataArsip.bonus || 0;
            let totalPotong = dataArsip.potongan || 0;
            let netInjeksi = totalBonus - totalPotong;
            let finalTHP = dataArsip.thp || (totalPokok + netInjeksi);

            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
            setVal('cardDokFeePokok', "Rp " + totalPokok.toLocaleString('id-ID'));
            
            let elInjeksi = document.getElementById('cardDokInjeksi');
            if (elInjeksi) {
                if (totalBonus === 0 && totalPotong === 0) {
                    elInjeksi.innerHTML = `<span style="color:#9b59b6;">Rp 0</span>`;
                } else if (totalBonus > 0 && totalPotong > 0) {
                    elInjeksi.innerHTML = `
                        <div style="color:#27ae60; font-size:18px; margin-bottom:4px;">+ Rp ${totalBonus.toLocaleString('id-ID')}</div>
                        <div style="color:#e74c3c; font-size:18px;">- Rp ${totalPotong.toLocaleString('id-ID')}</div>
                    `;
                } else if (totalBonus > 0) {
                    elInjeksi.innerHTML = `<span style="color:#27ae60;">+ Rp ${totalBonus.toLocaleString('id-ID')}</span>`;
                } else if (totalPotong > 0) {
                    elInjeksi.innerHTML = `<span style="color:#e74c3c;">- Rp ${totalPotong.toLocaleString('id-ID')}</span>`;
                }
            }

            setVal('cardDokTHP', "Rp " + finalTHP.toLocaleString('id-ID'));

            let rincianJson = [];
            try { rincianJson = JSON.parse(dataArsip.rincianJson || "[]"); } catch(e) { rincianJson = dataArsip.rincian || []; }
            window.renderTabelRincianDokter(rincianJson);

        } else {
            if (banner) {
                banner.style.display = 'flex';
                banner.style.background = '#fff3cd';
                banner.style.borderLeft = '5px solid #f39c12';
                banner.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:24px;">⏳</span>
                        <div>
                            <h4 style="margin:0; color:#d35400; font-size:16px;">Live Tracking (Periode Berjalan)</h4>
                            <p style="margin:2px 0 0 0; color:#2c3e50; font-size:13px;">Gaji belum final. Angka di bawah adalah estimasi sementara yang akan di-review Manajemen.</p>
                        </div>
                    </div>
                    <div style="color:#f39c12; font-weight:bold; font-size:14px; padding-right:10px;">Masih Berjalan...</div>
                `;
            }

            let dataMentah = window.rawDataBagiHasil || [];
            if (dataMentah.length === 0) {
                const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
                setVal('cardDokJmlTindakan', "0");
                setVal('cardDokFeePokok', "Rp 0");
                if (document.getElementById('cardDokInjeksi')) document.getElementById('cardDokInjeksi').innerHTML = `<span style="color:#95a5a6; font-size:16px;">Rp 0 (Belum ACC)</span>`;
                setVal('cardDokTHP', "Rp 0");
                window.renderTabelRincianDokter([]);
                return;
            }

            let tahun = parseInt(bulanTerpilih.split('-')[0]);
            let bulan = parseInt(bulanTerpilih.split('-')[1]);
            
            let tglMulai = bulanTerpilih + "-01";
            let lastDay = new Date(tahun, bulan, 0).getDate(); 
            let strLastDay = lastDay < 10 ? '0' + lastDay : lastDay;
            let tglAkhir = bulanTerpilih + "-" + strLastDay;

            let dataTerfilter = dataMentah.filter(item => item.tanggal >= tglMulai && item.tanggal <= tglAkhir);

            let invoiceMap = {};
            dataTerfilter.forEach(item => {
                if (item.jenis !== "LAB") {
                    if (!invoiceMap[item.invoice]) invoiceMap[item.invoice] = { subtotal: 0, diskon: item.diskonInvoice || 0 };
                    invoiceMap[item.invoice].subtotal += (item.hargaAsli || 0);
                }
            });

            let rincianDokter = [];
            dataTerfilter.forEach(item => {
                if (item.jenis !== "LAB" && isNamaMatch(item.dokterPelaksana)) {
                    let inv = invoiceMap[item.invoice];
                    let rasio = inv.subtotal > 0 ? (item.hargaAsli / inv.subtotal) : 0;
                    let diskonProrataItem = rasio * inv.diskon;
                    
                    rincianDokter.push({
                        tanggal: item.tanggal, invoice: item.invoice, pasien: item.namaPasien, tindakan: item.namaTindakan,
                        hargaAsli: item.hargaAsli, diskonProrata: diskonProrataItem, hargaLabVendor: 0, feeFinal: 0 
                    });
                }
            });

            dataTerfilter.forEach(item => {
                if (item.jenis === "LAB" && isNamaMatch(item.dokterPelaksana)) {
                    let namaTindakanAsli = item.namaTindakan.replace("Potongan Lab Vendor: ", "");
                    let match = rincianDokter.find(r => r.invoice === item.invoice && r.tindakan === namaTindakanAsli);
                    if (match) match.hargaLabVendor += (item.bebanPotongan / 0.4);
                }
            });

            let totalBagiHasil = 0;
            rincianDokter.forEach(r => {
                let dasarBagiHasil = r.hargaAsli - r.hargaLabVendor - r.diskonProrata;
                r.feeFinal = dasarBagiHasil * 0.4;
                totalBagiHasil += r.feeFinal;
            });

            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
            setVal('cardDokFeePokok', "Rp " + totalBagiHasil.toLocaleString('id-ID'));
            if (document.getElementById('cardDokInjeksi')) document.getElementById('cardDokInjeksi').innerHTML = `<span style="color:#95a5a6; font-size:16px;">Rp 0 (Belum ACC)</span>`;
            setVal('cardDokTHP', "Rp " + totalBagiHasil.toLocaleString('id-ID'));
            
            window.renderTabelRincianDokter(rincianDokter);
        }
    };

    window.tampilkanSlipGajiDokter = function(nama, periode) {
        if (!window.arsipGajiTerkunci) return alert("Data arsip tidak ditemukan!");
        
        let dataArsip = window.arsipGajiTerkunci.find(x => window.isDokterMatchGlobal(x.namaDokter, nama) && x.periode === periode);
        if (!dataArsip) return alert("Slip belum diterbitkan untuk bulan ini.");

        let rincianArr = [];
        try { rincianArr = JSON.parse(dataArsip.rincianJson || "[]"); } catch(e) {}
        let jmlTindakan = rincianArr.length;

        let ketBonus = "Injeksi Bonus / Insentif";
        let ketPotongan = "Pemotongan Lain (Kasbon dll)";
        if (dataArsip.teksKeterangan) {
            let splitKet = dataArsip.teksKeterangan.split(" | Potongan: ");
            if (splitKet.length === 2) {
                ketBonus = splitKet[0].replace("Bonus: ", "") || ketBonus;
                ketPotongan = splitKet[1] || ketPotongan;
            }
        }

        const rp = (angka) => "Rp " + (angka || 0).toLocaleString('id-ID');

        let modalId = 'modalSlipDokterPrint';
        let adaModal = document.getElementById(modalId);
        if (adaModal) adaModal.remove(); 

        let modalHtml = `
            <div id="${modalId}" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; display:flex; justify-content:center; align-items:flex-start; overflow-y:auto; padding:20px; font-family:Arial, sans-serif;">
                
                <div style="background:white; width:100%; max-width:700px; margin:20px auto; padding:40px; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.5); position:relative;" id="areaPrintSlipDokter">
                    
                    <div class="no-print" style="position:absolute; top:20px; right:20px; display:flex; gap:10px;">
                        <button onclick="window.print()" style="background:#3498db; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; font-weight:bold;">🖨️ Cetak / Simpan PDF</button>
                        <button onclick="document.getElementById('${modalId}').remove()" style="background:#e74c3c; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; font-weight:bold;">✖ Tutup</button>
                    </div>

                    <div style="text-align:center; border-bottom:3px solid #2c3e50; padding-bottom:15px; margin-bottom:20px;">
                        <h1 style="margin:0; color:#2c3e50; font-size:24px; text-transform:uppercase; letter-spacing:1px;">KLINIK ANVAYA</h1>
                        <p style="margin:5px 0 0 0; color:#7f8c8d; font-size:14px;">Slip Honorarium & Fee Tindakan Medis</p>
                    </div>

                    <table style="width:100%; margin-bottom:20px; font-size:14px; color:#34495e;">
                        <tr><td style="width:150px; font-weight:bold; padding:5px 0;">Nama Dokter</td><td style="width:10px;">:</td><td style="font-weight:bold; color:#2980b9; font-size:16px;">dr. ${dataArsip.namaDokter.replace(/^(dr\.|dr |drg\.|drg )/i, '')}</td></tr>
                        <tr><td style="font-weight:bold; padding:5px 0;">Periode Kinerja</td><td>:</td><td>Bulan ${periode}</td></tr>
                        <tr><td style="font-weight:bold; padding:5px 0;">Total Tindakan</td><td>:</td><td>${jmlTindakan} Pasien</td></tr>
                    </table>

                    <table style="width:100%; border-collapse:collapse; margin-bottom:30px; font-size:14px;">
                        <thead>
                            <tr style="background:#ecf0f1; color:#2c3e50; text-align:left;">
                                <th style="padding:10px; border:1px solid #bdc3c7;">Komponen Pendapatan</th>
                                <th style="padding:10px; border:1px solid #bdc3c7; text-align:right;">Nominal (Rp)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding:12px; border:1px solid #bdc3c7;"><strong>1. Pokok Fee Tindakan (40%)</strong><br><span style="font-size:12px; color:#7f8c8d;">Berdasarkan tarif bersih setelah potongan lab & diskon.</span></td>
                                <td style="padding:12px; border:1px solid #bdc3c7; text-align:right; font-weight:bold; color:#2c3e50;">${rp(dataArsip.pokokFee)}</td>
                            </tr>
                            <tr>
                                <td style="padding:12px; border:1px solid #bdc3c7;"><strong>2. Penambahan / Bonus</strong><br><span style="font-size:12px; color:#7f8c8d;">Keterangan: ${ketBonus}</span></td>
                                <td style="padding:12px; border:1px solid #bdc3c7; text-align:right; color:#27ae60;">${dataArsip.bonus > 0 ? "+ " + rp(dataArsip.bonus) : "-"}</td>
                            </tr>
                            <tr>
                                <td style="padding:12px; border:1px solid #bdc3c7;"><strong>3. Pemotongan</strong><br><span style="font-size:12px; color:#7f8c8d;">Keterangan: ${ketPotongan}</span></td>
                                <td style="padding:12px; border:1px solid #bdc3c7; text-align:right; color:#e74c3c;">${dataArsip.potongan > 0 ? "- " + rp(dataArsip.potongan) : "-"}</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr style="background:#2c3e50; color:white;">
                                <td style="padding:15px; border:1px solid #2c3e50; text-align:right; font-size:16px; font-weight:bold; text-transform:uppercase;">Total Take Home Pay :</td>
                                <td style="padding:15px; border:1px solid #2c3e50; text-align:right; font-size:18px; font-weight:bold; color:#2ecc71;">${rp(dataArsip.thp)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div style="display:flex; justify-content:space-between; margin-top:40px; font-size:14px; color:#2c3e50;">
                        <div style="text-align:center;">
                            <p style="margin-bottom:60px;">Penerima,</p>
                            <p style="font-weight:bold; border-bottom:1px solid #2c3e50; display:inline-block; padding:0 20px;">dr. ${dataArsip.namaDokter.replace(/^(dr\.|dr |drg\.|drg )/i, '')}</p>
                        </div>
                        <div style="text-align:center;">
                            <p style="margin-bottom:60px;">Manajemen / Keuangan,</p>
                            <p style="font-weight:bold; border-bottom:1px solid #2c3e50; display:inline-block; padding:0 20px;">Klinik Anvaya</p>
                        </div>
                    </div>
                </div>
                
                <style>
                    @media print {
                        body * { visibility: hidden; }
                        #areaPrintSlipDokter, #areaPrintSlipDokter * { visibility: visible; }
                        #areaPrintSlipDokter { position: absolute; left: 0; top: 0; margin:0; padding:0; box-shadow:none; width:100%; }
                        .no-print { display: none !important; }
                    }
                </style>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    window.renderTabelRincianDokter = function(listRincian) {
        let tbody = document.getElementById('tabelRincianDokterBody');
        if (!tbody) return;

        if (!listRincian || listRincian.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="padding:40px; text-align:center; color:#95a5a6; font-size:14px;">Belum ada tindakan tercatat pada periode ini.</td></tr>`;
            if (document.getElementById('cardDokJmlTindakan')) document.getElementById('cardDokJmlTindakan').innerText = "0";
            return;
        }

        if (document.getElementById('cardDokJmlTindakan')) {
            document.getElementById('cardDokJmlTindakan').innerText = listRincian.length;
        }

        let html = '';
        listRincian.forEach((rin, index) => {
            let hargaAsli = rin.hargaAsli || 0;
            let lab = rin.hargaLabVendor || 0;
            let diskon = rin.diskonProrata || 0;
            
            let dasarBagiHasil = hargaAsli - lab - diskon;
            let feeDokter = rin.feeFinal || (dasarBagiHasil * 0.4);

            let txtLab = lab > 0 ? `-${lab.toLocaleString('id-ID')}` : '-';
            let txtDiskon = diskon > 0 ? `-${diskon.toLocaleString('id-ID')}` : '-';

            html += `
                <tr style="border-bottom:1px solid #ecf0f1;">
                    <td style="padding:12px; text-align:center; color:#7f8c8d; font-size:13px;">${index + 1}</td>
                    <td style="padding:12px; color:#7f8c8d; font-size:13px;">${rin.tanggal}</td>
                    <td style="padding:12px; color:#2c3e50; font-weight:bold; font-size:13px;">${rin.pasien}</td>
                    <td style="padding:12px; color:#34495e; font-size:13px;">${rin.tindakan}</td>
                    
                    <td style="padding:12px; text-align:right; color:#7f8c8d; font-size:13px;">${hargaAsli.toLocaleString('id-ID')}</td>
                    <td style="padding:12px; text-align:right; color:#e74c3c; font-size:13px;">${txtLab}</td>
                    <td style="padding:12px; text-align:right; color:#e74c3c; font-size:13px;">${txtDiskon}</td>
                    
                    <td style="padding:12px; text-align:right; font-weight:bold; color:#2980b9; font-size:13px;">${dasarBagiHasil.toLocaleString('id-ID')}</td>
                    <td style="padding:12px; text-align:right; font-weight:bold; color:#27ae60; font-size:13px;">${feeDokter.toLocaleString('id-ID')}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    };

    // =====================================================================
    // 💼 3. FUNGSI SILENT MODE: TARIK DATA KOKPIT MANAJEMEN (OWNER VIEW)
    // =====================================================================
    window.currentPageBagiHasil = 1;
    window.itemsPerPageBagiHasil = 5; // Menampilkan 5 dokter per halaman agar nyaman

    window.muatDataBagiHasil = function() {
        const area = document.getElementById('areaBagiHasil');
        if (area) area.innerHTML = '<h4 style="text-align:center; padding:20px;">Memuat Kalkulasi Bagi Hasil... ⏳</h4>';
        
        fetch(window.WEB_APP_URL, { method: "POST", body: JSON.stringify({ action: "getBagiHasilDokter" }) })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                rawDataBagiHasil = res.data;
                window.kalkulasiDanRenderBagiHasil();
            } else {
                if (area) area.innerHTML = `<h4 style="text-align:center; color:red; padding:20px;">Gagal memuat data: ${res.message}</h4>`;
            }
        })
        .catch(err => {
            console.error("Error muatDataBagiHasil:", err);
            if (area) area.innerHTML = `<h4 style="text-align:center; color:red; padding:20px;">⚠️ Gangguan Jaringan Terdeteksi</h4>`;
        });
    };

    window.kalkulasiDanRenderBagiHasil = async function() {
        let tglMulai = document.getElementById('tglMulaiFinansial') ? document.getElementById('tglMulaiFinansial').value : "";
        let tglAkhir = document.getElementById('tglAkhirFinansial') ? document.getElementById('tglAkhirFinansial').value : "";
        window.periodeBagiHasilGlobal = tglMulai === tglAkhir ? tglMulai : `${tglMulai} s/d ${tglAkhir}`;

        if (!window.arsipGajiTerkunci) {
            try {
                let req = await fetch(window.WEB_APP_URL, { method: "POST", body: JSON.stringify({ action: "getDaftarSlipTerkunci" }) });
                let res = await req.json();
                window.arsipGajiTerkunci = (res.result === "success") ? res.data : [];
            } catch (err) {
                window.arsipGajiTerkunci = [];
            }
        }

        let defaultBulanFilter = tglAkhir ? tglAkhir.substring(0, 7) : "";
        let dataTerfilter = rawDataBagiHasil.filter(item => item.tanggal >= tglMulai && item.tanggal <= tglAkhir);

        let invoiceMap = {};
        dataTerfilter.forEach(item => {
            if (item.jenis !== "LAB") {
                if (!invoiceMap[item.invoice]) invoiceMap[item.invoice] = { subtotal: 0, diskon: item.diskonInvoice };
                invoiceMap[item.invoice].subtotal += (item.hargaAsli || 0);
            }
        });

        let doctorMap = {};
        const getDoctorKeyAndFormalize = (rawName) => {
            if (!rawName || rawName === "-") return { key: "umum", formal: "Umum" };
            let clean = rawName.toLowerCase().replace(/^(dr\.|dr |drg\.|drg )/i, '').trim();
            let matchedKey = clean;
            for (let existingKey in doctorMap) {
                if (existingKey === clean || existingKey.includes(clean) || clean.includes(existingKey)) {
                    matchedKey = existingKey; break;
                }
            }
            let formal = rawName.trim();
            if (!formal.toLowerCase().includes("dr.") && !formal.toLowerCase().includes("dr ") && formal.toLowerCase() !== "umum") {
                formal = "dr. " + formal.replace(/\b\w/g, l => l.toUpperCase());
            }
            return { key: matchedKey, formal: formal };
        };

        dataTerfilter.forEach(item => {
            if (item.jenis !== "LAB") {
                let docInfo = getDoctorKeyAndFormalize(item.dokterPelaksana);
                if (!doctorMap[docInfo.key]) {
                    doctorMap[docInfo.key] = { nama: docInfo.formal, jmlTindakan: 0, totalBagiHasil: 0, rincian: [] };
                } else if (docInfo.formal.length > doctorMap[docInfo.key].nama.length) {
                    doctorMap[docInfo.key].nama = docInfo.formal;
                }
                
                let inv = invoiceMap[item.invoice];
                let rasio = inv.subtotal > 0 ? (item.hargaAsli / inv.subtotal) : 0;
                let diskonProrataItem = rasio * inv.diskon;
                
                doctorMap[docInfo.key].jmlTindakan++;
                doctorMap[docInfo.key].rincian.push({
                    tanggal: item.tanggal, invoice: item.invoice, pasien: item.namaPasien, tindakan: item.namaTindakan,
                    hargaAsli: item.hargaAsli, diskonProrata: diskonProrataItem, hargaLabVendor: 0, feeFinal: 0 
                });
            }
        });

        dataTerfilter.forEach(item => {
            if (item.jenis === "LAB") {
                let docInfo = getDoctorKeyAndFormalize(item.dokterPelaksana);
                let doc = doctorMap[docInfo.key];
                if (doc) {
                    let namaTindakanAsli = item.namaTindakan.replace("Potongan Lab Vendor: ", "");
                    let match = doc.rincian.find(r => r.invoice === item.invoice && r.tindakan === namaTindakanAsli);
                    if (match) match.hargaLabVendor += (item.bebanPotongan / 0.4);
                }
            }
        });

        let totalDasarBagiHasil = 0; 
        Object.values(doctorMap).forEach(doc => {
            doc.rincian.forEach(r => {
                let dasarBagiHasil = r.hargaAsli - r.hargaLabVendor - r.diskonProrata;
                totalDasarBagiHasil += dasarBagiHasil; 
                r.feeFinal = dasarBagiHasil * 0.4;
                doc.totalBagiHasil += r.feeFinal;
            });
        });

        let arrayDokter = Object.values(doctorMap);
        arrayDokter.sort((a, b) => b.totalBagiHasil - a.totalBagiHasil);
        
        window.dataBagiHasilGlobal = arrayDokter; 
        window.bh_totalBagiHasilPeriode = arrayDokter.reduce((sum, d) => sum + d.totalBagiHasil, 0);
        window.bh_totalDokterAktif = arrayDokter.length;
        window.bh_defaultBulanFilter = defaultBulanFilter;

        let totalBonusTerkunci = 0;
        let totalPotonganTerkunci = 0;
        if (window.arsipGajiTerkunci) {
            arrayDokter.forEach(d => {
                let dataTerkunci = window.arsipGajiTerkunci.find(x => window.isDokterMatchGlobal(x.namaDokter, d.nama) && x.periode === defaultBulanFilter);
                if (dataTerkunci) {
                    totalBonusTerkunci += dataTerkunci.bonus;
                    totalPotonganTerkunci += dataTerkunci.potongan;
                }
            });
        }
        window.bh_profitKlinik = (totalDasarBagiHasil * 0.6) - totalBonusTerkunci + totalPotonganTerkunci;

        window.currentPageBagiHasil = 1;
        window.renderHalamanBagiHasil();
    };

    // =====================================================================
    // 🎨 3.1 MESIN RENDER HALAMAN HYBRID (PC & MOBILE)
    // =====================================================================
    window.renderHalamanBagiHasil = function() {
        const areaBagi = document.getElementById('areaBagiHasil');
        if (!areaBagi) return;

        let totalPages = Math.ceil(window.dataBagiHasilGlobal.length / window.itemsPerPageBagiHasil);
        if (window.currentPageBagiHasil > totalPages) window.currentPageBagiHasil = totalPages;
        if (window.currentPageBagiHasil < 1) window.currentPageBagiHasil = 1;

        const startIndex = (window.currentPageBagiHasil - 1) * window.itemsPerPageBagiHasil;
        const endIndex = startIndex + window.itemsPerPageBagiHasil;
        const dataHalamanIni = window.dataBagiHasilGlobal.slice(startIndex, endIndex);

        let htmlContent = `
            <style>
                .bh-pc { display: block; }
                .bh-mobile { display: none; }
                .bh-top-cards { display: flex; gap: 15px; margin-bottom: 20px; }
                @media(max-width: 768px) {
                    .bh-pc { display: none !important; }
                    .bh-mobile { display: flex !important; flex-direction: column; gap: 12px; }
                    .bh-top-cards { flex-direction: column; }
                }
                .btn-page-bh { padding: 6px 12px; margin: 0 3px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; border-radius: 4px; font-weight: bold; color: #334155; transition: 0.2s; }
                .btn-page-bh:hover:not(:disabled) { background: #f1f5f9; }
                .btn-page-bh.active { background: #9b59b6; color: white; border-color: #9b59b6; }
                .btn-page-bh:disabled { background: #f8fafc; color: #94a3b8; cursor: not-allowed; }
            </style>

            <div class="bh-top-cards">
                <div style="flex:1; background:#fff; padding:15px; border-radius:8px; border-left:5px solid #2ecc71; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                    <h4 style="margin:0 0 5px 0; color:#7f8c8d; font-size:12px; text-transform:uppercase; font-weight:bold;">Total Gaji Dokter</h4>
                    <h2 style="margin:0; color:#2c3e50; font-size:22px;">Rp ${window.bh_totalBagiHasilPeriode.toLocaleString('id-ID')}</h2>
                    <div style="font-size:11px; color:#95a5a6; margin-top:5px;">Pokok 40% (Belum termsk bonus)</div>
                </div>
                <div style="flex:1; background:#fff; padding:15px; border-radius:8px; border-left:5px solid #9b59b6; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                    <h4 style="margin:0 0 5px 0; color:#7f8c8d; font-size:12px; text-transform:uppercase; font-weight:bold;">Profit Hak Klinik</h4>
                    <h2 style="margin:0; color:#9b59b6; font-size:22px;">Rp ${window.bh_profitKlinik.toLocaleString('id-ID')}</h2>
                    <div style="font-size:11px; color:#95a5a6; margin-top:5px;">(Hak 60% Klinik - Bonus + Potongan)</div>
                </div>
                <div style="flex:1; background:#fff; padding:15px; border-radius:8px; border-left:5px solid #3498db; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                    <h4 style="margin:0 0 5px 0; color:#7f8c8d; font-size:12px; text-transform:uppercase; font-weight:bold;">Dokter Aktif</h4>
                    <h2 style="margin:0; color:#2c3e50; font-size:22px;">${window.bh_totalDokterAktif} Dokter</h2>
                    <div style="font-size:11px; color:#95a5a6; margin-top:5px;">Dalam rentang filter terpilih</div>
                </div>
            </div>
        `;

        // 💻 WUJUD 1: TABEL PC
        htmlContent += `<div class="bh-pc">`;
        htmlContent += `
            <table style="width:100%; border-collapse:collapse; background:white; box-shadow:0 1px 3px rgba(0,0,0,0.1); border-radius:8px; overflow:hidden;">
                <thead style="background-color:#34495e; color:white;">
                    <tr>
                        <th style="padding:15px; text-align:left; border:none; width:25%;">Nama Dokter</th>
                        <th style="padding:15px; text-align:center; border:none; width:15%;">Jml Tindakan</th>
                        <th style="padding:15px; text-align:center; border:none; width:35%;">Injeksi Manual & Keterangan</th>
                        <th style="padding:15px; background-color:#2c3e50; color:#2ecc71; text-align:right; border:none; width:25%;">Take Home Pay</th>
                    </tr>
                </thead>
                <tbody>
        `;
        if (dataHalamanIni.length === 0) {
            htmlContent += `<tr><td colspan="4" style="padding:20px; text-align:center;">Tidak ada data.</td></tr>`;
        }

        // 📱 WUJUD 2: MOBILE CARDS 
        let htmlMobile = `<div class="bh-mobile">`;
        if (dataHalamanIni.length === 0) {
            htmlMobile += `<div style="padding:20px; text-align:center; background:#fff; border-radius:8px;">Tidak ada data.</div>`;
        }

        dataHalamanIni.forEach((d, loopIndex) => {
            let idx = startIndex + loopIndex; 
            let rowId = `detail_dokter_${idx}`;
            
            // Inisialisasi Status State (Agar input manual kebal paginasi)
            if (d.ketBonus === undefined) {
                let dataTerkunci = window.arsipGajiTerkunci ? window.arsipGajiTerkunci.find(x => window.isDokterMatchGlobal(x.namaDokter, d.nama) && x.periode === window.bh_defaultBulanFilter) : null;
                d.isLocked = !!dataTerkunci;
                d.valBonus = d.isLocked && dataTerkunci.bonus > 0 ? dataTerkunci.bonus.toLocaleString('id-ID') : "";
                d.valPotongan = d.isLocked && dataTerkunci.potongan > 0 ? dataTerkunci.potongan.toLocaleString('id-ID') : "";
                d.valTHP = d.isLocked ? dataTerkunci.thp : d.totalBagiHasil;
                
                d.ketBonus = ""; d.ketPotongan = "";
                if (d.isLocked && dataTerkunci.teksKeterangan) {
                    let splitKet = dataTerkunci.teksKeterangan.split(" | Potongan: ");
                    if (splitKet.length === 2) {
                        d.ketBonus = splitKet[0].replace("Bonus: ", "") === "Injeksi Bonus / Insentif" ? "" : splitKet[0].replace("Bonus: ", "");
                        d.ketPotongan = splitKet[1] === "Pemotongan Lain (Kasbon dll)" ? "" : splitKet[1];
                    }
                }
            }

            let thpDitampilkan = d.valTHP_Dinamic !== undefined ? d.valTHP_Dinamic : d.valTHP;
            let btnCetakHtml = d.isLocked 
                ? `<button onclick="window.bukaPreviewSlip(${idx}, event)" style="margin-top:8px; background:#27ae60; color:white; border:none; padding:6px 12px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer;">✅ Terkunci (${window.bh_defaultBulanFilter})</button>`
                : `<button onclick="window.bukaPreviewSlip(${idx}, event)" style="margin-top:8px; background:#3498db; color:white; border:none; padding:6px 12px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.2);">👁️ Cek Slip</button>`;

            // -- HTML UNTUK PC --
            htmlContent += `
                <tr style="border-bottom:1px solid #ecf0f1;">
                    <td style="padding:15px; font-weight:bold; color:#2980b9; font-size:15px; cursor:pointer;" onclick="window.toggleAccordionBagiHasil(this, '${rowId}')">
                        <span class="acc-icon-bh-pc" style="display:inline-block; transition:transform 0.3s; margin-right:10px; font-size:12px; color:#7f8c8d;">▶</span>${d.nama}
                    </td>
                    <td style="padding:15px; text-align:center; font-weight:500;">${d.jmlTindakan}</td>
                    <td style="padding:15px; text-align:center;">
                        <div style="display:flex; flex-direction:column; gap:8px; align-items:center;">
                            <div style="display:flex; gap:5px;">
                                <input type="text" value="${d.ketBonus}" placeholder="Ket: THR, dll" oninput="window.updateInputManual(${idx}, 'ketBonus', this);" style="width:110px; padding:6px; border:1px solid #bdc3c7; border-radius:4px; font-size:11px;">
                                <input type="text" value="${d.valBonus}" placeholder="+ Rp Bonus" oninput="window.formatRupiahInput(this); window.updateInputManual(${idx}, 'valBonus', this); window.hitungRealtimeGaji(${idx});" style="width:100px; padding:6px; border:1px solid #2ecc71; border-radius:4px; font-size:12px; text-align:right;">
                            </div>
                            <div style="display:flex; gap:5px;">
                                <input type="text" value="${d.ketPotongan}" placeholder="Ket: Kasbon, dll" oninput="window.updateInputManual(${idx}, 'ketPotongan', this);" style="width:110px; padding:6px; border:1px solid #bdc3c7; border-radius:4px; font-size:11px;">
                                <input type="text" value="${d.valPotongan}" placeholder="- Rp Potong" oninput="window.formatRupiahInput(this); window.updateInputManual(${idx}, 'valPotongan', this); window.hitungRealtimeGaji(${idx});" style="width:100px; padding:6px; border:1px solid #e74c3c; border-radius:4px; font-size:12px; text-align:right;">
                            </div>
                        </div>
                    </td>
                    <td style="padding:15px; text-align:right; font-weight:bold; color:#27ae60; background-color:#fcfdfd; font-size:15px;">
                        <span id="lblGajiFinal_${idx}">Rp ${thpDitampilkan.toLocaleString('id-ID')}</span><br>${btnCetakHtml}
                    </td>
                </tr>
            `;

            let htmlDetailTindakanMobile = "";
            let htmlDetailTindakanPC = `
                <tr id="${rowId}" style="display:none; background-color:#f8f9fa;">
                    <td colspan="4" style="padding: 0;">
                        <div style="margin: 0 0 15px 40px; padding: 15px; border-left: 4px solid #3498db; background-color: white; box-shadow: -2px 2px 5px rgba(0,0,0,0.03); border-radius: 0 8px 8px 0;">
                            <h5 style="margin-top:0; color:#7f8c8d; font-size:12px; margin-bottom:10px; text-transform:uppercase; letter-spacing:1px;">📋 Detail Tindakan & Pemotongan</h5>
                            <table style="width:100%; border-collapse:collapse; font-size:12px;">
                                <tr style="background-color: #ecf0f1; color: #2c3e50;">
                                    <th style="padding:8px; text-align:left; border:none !important;">Tanggal</th>
                                    <th style="padding:8px; text-align:left; border:none !important;">Pasien</th>
                                    <th style="padding:8px; text-align:left; border:none !important;">Tindakan</th>
                                    <th style="padding:8px; text-align:right; border:none !important;">Tarif (Rp)</th>
                                    <th style="padding:8px; text-align:right; border:none !important;">Biaya Lab</th>
                                    <th style="padding:8px; text-align:right; border:none !important;">Diskon</th>
                                    <th style="padding:8px; text-align:right; border:none !important; color:#2980b9;">Dasar Fee</th>
                                    <th style="padding:8px; text-align:right; border:none !important;">Fee Bersih (40%)</th>
                                </tr>
            `;

            d.rincian.forEach(rin => {
                let labTxt = rin.hargaLabVendor > 0 ? `-${rin.hargaLabVendor.toLocaleString('id-ID')}` : '-';
                let diskonTxt = rin.diskonProrata > 0 ? `-${rin.diskonProrata.toLocaleString('id-ID')}` : '-';
                let dasarBagiHasil = rin.hargaAsli - rin.hargaLabVendor - rin.diskonProrata;

                // Loop Detail PC
                htmlDetailTindakanPC += `
                    <tr style="border-bottom:1px solid #f1f2f6;">
                        <td style="padding:8px; color:#7f8c8d;">${rin.tanggal}</td>
                        <td style="padding:8px; color:#2c3e50; font-weight:bold;">${rin.pasien}</td>
                        <td style="padding:8px; color:#7f8c8d;">${rin.tindakan}</td>
                        <td style="padding:8px; text-align:right; color:#7f8c8d;">${rin.hargaAsli.toLocaleString('id-ID')}</td>
                        <td style="padding:8px; text-align:right; color:#e74c3c;">${labTxt}</td>
                        <td style="padding:8px; text-align:right; color:#e74c3c;">${diskonTxt}</td>
                        <td style="padding:8px; text-align:right; font-weight:bold; color:#2980b9;">${dasarBagiHasil.toLocaleString('id-ID')}</td>
                        <td style="padding:8px; text-align:right; font-weight:bold; color:#27ae60;">${rin.feeFinal.toLocaleString('id-ID')}</td>
                    </tr>
                `;

                // Loop Detail Mobile
                htmlDetailTindakanMobile += `
                    <div style="padding:10px; border:1px solid #ecf0f1; border-radius:6px; margin-bottom:10px; background:#fbfcfc;">
                        <div style="font-weight:bold; color:#2c3e50; font-size:13px;">${rin.tanggal} - ${rin.pasien}</div>
                        <div style="color:#7f8c8d; font-size:12px; margin-bottom:6px; border-bottom:1px dashed #eee; padding-bottom:5px;">${rin.tindakan}</div>
                        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:3px;"><span style="color:#7f8c8d;">Tarif Dasar:</span> <span>Rp ${rin.hargaAsli.toLocaleString('id-ID')}</span></div>
                        <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:3px;"><span style="color:#7f8c8d;">Potong Lab/Diskon:</span> <span style="color:#e74c3c;">${labTxt} / ${diskonTxt}</span></div>
                        <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:bold; margin-top:5px; border-top:1px solid #eee; padding-top:5px;"><span>Fee Bersih (40%):</span> <span style="color:#27ae60;">Rp ${rin.feeFinal.toLocaleString('id-ID')}</span></div>
                    </div>
                `;
            });
            htmlDetailTindakanPC += `</table></div></td></tr>`;
            htmlContent += htmlDetailTindakanPC;

            // -- HTML UNTUK MOBILE --
            let btnCetakHtmlMobile = d.isLocked 
                ? `<button onclick="window.bukaPreviewSlip(${idx}, event)" style="width:100%; margin-top:10px; background:#27ae60; color:white; border:none; padding:12px; border-radius:6px; font-size:14px; font-weight:bold; cursor:pointer;">✅ Slip Terkunci</button>`
                : `<button onclick="window.bukaPreviewSlip(${idx}, event)" style="width:100%; margin-top:10px; background:#3498db; color:white; border:none; padding:12px; border-radius:6px; font-size:14px; font-weight:bold; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.1);">👁️ Cek & Terbitkan Slip</button>`;

            htmlMobile += `
                <div style="background:#fff; border:1px solid #e0e0e0; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.02); overflow:hidden;">
                    <div onclick="window.toggleAccordionBagiHasil(this)" style="padding:15px; background:#f8fafc; display:flex; justify-content:space-between; align-items:flex-start; cursor:pointer; border-bottom:1px solid transparent;">
                        <div>
                            <div style="font-weight:bold; color:#2980b9; font-size:16px; margin-bottom:4px;">${d.nama}</div>
                            <div style="font-size:12px; color:#7f8c8d; font-weight:bold;">${d.jmlTindakan} Tindakan</div>
                        </div>
                        <div style="display:flex; flex-direction:column; align-items:flex-end;">
                            <div id="lblGajiFinalMob_${idx}" style="color:#27ae60; font-weight:bold; font-size:16px;">Rp ${thpDitampilkan.toLocaleString('id-ID')}</div>
                            <span class="acc-icon-bh-mob" style="font-size:12px; color:#95a5a6; font-weight:bold; margin-top:5px;">▼ Detail</span>
                        </div>
                    </div>
                    
                    <div style="display:none; padding:15px; border-top:1px solid #ecf0f1; background:#fff;">
                        <!-- Blok Injeksi Manual HP -->
                        <div style="background:#f1f2f6; padding:12px; border-radius:6px; margin-bottom:15px;">
                            <div style="font-size:11px; font-weight:bold; color:#2c3e50; margin-bottom:10px; text-transform:uppercase;">📝 Injeksi Manual</div>
                            <div style="display:flex; gap:10px; margin-bottom:10px;">
                                <input type="text" value="${d.ketBonus}" placeholder="Ket: THR" oninput="window.updateInputManual(${idx}, 'ketBonus', this);" style="flex:1; padding:10px; border:1px solid #bdc3c7; border-radius:4px; font-size:13px;">
                                <input type="text" value="${d.valBonus}" placeholder="+ Bonus" oninput="window.formatRupiahInput(this); window.updateInputManual(${idx}, 'valBonus', this); window.hitungRealtimeGaji(${idx});" style="flex:1; padding:10px; border:1px solid #2ecc71; border-radius:4px; font-size:13px; text-align:right; font-weight:bold;">
                            </div>
                            <div style="display:flex; gap:10px;">
                                <input type="text" value="${d.ketPotongan}" placeholder="Ket: Kasbon" oninput="window.updateInputManual(${idx}, 'ketPotongan', this);" style="flex:1; padding:10px; border:1px solid #bdc3c7; border-radius:4px; font-size:13px;">
                                <input type="text" value="${d.valPotongan}" placeholder="- Potong" oninput="window.formatRupiahInput(this); window.updateInputManual(${idx}, 'valPotongan', this); window.hitungRealtimeGaji(${idx});" style="flex:1; padding:10px; border:1px solid #e74c3c; border-radius:4px; font-size:13px; text-align:right; font-weight:bold;">
                            </div>
                        </div>
                        
                        ${btnCetakHtmlMobile}

                        <h5 style="margin:20px 0 10px 0; color:#7f8c8d; font-size:12px; text-transform:uppercase; border-bottom:1px solid #eee; padding-bottom:5px;">Rincian Tindakan Pasien</h5>
                        ${htmlDetailTindakanMobile}
                    </div>
                </div>
            `;
        });
        
        htmlContent += `</tbody></table></div>`;
        htmlMobile += `</div>`;
        htmlContent += htmlMobile;
        
        htmlContent += `<div id="wadahPaginasiBagiHasil" style="display:flex; justify-content:center; align-items:center; margin-top:20px; flex-wrap:wrap; gap:5px;"></div>`;
        
        areaBagi.innerHTML = htmlContent;
        window.renderKontrolPaginasiBagiHasil(totalPages, window.currentPageBagiHasil);
    };

    // =====================================================================
    // 🖲️ 3.2 FUNGSI KONTROL PAGINASI & STATE INPUT
    // =====================================================================
    window.updateInputManual = function(idx, field, elem) {
        if (!window.dataBagiHasilGlobal[idx]) return;
        window.dataBagiHasilGlobal[idx][field] = elem.value;
    };

    window.hitungRealtimeGaji = function(idx) {
        let d = window.dataBagiHasilGlobal[idx];
        let nominalBonus = Number(String(d.valBonus || "0").replace(/[^0-9]/g, '')) || 0;
        let nominalPotongan = Number(String(d.valPotongan || "0").replace(/[^0-9]/g, '')) || 0;
        
        let finalGaji = (d.totalBagiHasil + nominalBonus) - nominalPotongan;
        d.valTHP_Dinamic = finalGaji; 
        
        let elPC = document.getElementById(`lblGajiFinal_${idx}`);
        let elMob = document.getElementById(`lblGajiFinalMob_${idx}`);
        if(elPC) elPC.innerText = "Rp " + finalGaji.toLocaleString('id-ID');
        if(elMob) elMob.innerText = "Rp " + finalGaji.toLocaleString('id-ID');
    };

    window.renderKontrolPaginasiBagiHasil = function(totalPages, currentPage) {
        const wadah = document.getElementById('wadahPaginasiBagiHasil');
        if (!wadah) return;
        wadah.innerHTML = '';
        if (totalPages <= 1) return; 

        const btnPrev = document.createElement('button');
        btnPrev.className = 'btn-page-bh';
        btnPrev.innerText = '« Prev';
        btnPrev.disabled = currentPage === 1;
        btnPrev.onclick = () => { window.currentPageBagiHasil--; window.renderHalamanBagiHasil(); };
        wadah.appendChild(btnPrev);

        for (let i = 1; i <= totalPages; i++) {
            const btnNum = document.createElement('button');
            btnNum.className = 'btn-page-bh' + (i === currentPage ? ' active' : '');
            btnNum.innerText = i;
            btnNum.onclick = () => { window.currentPageBagiHasil = i; window.renderHalamanBagiHasil(); };
            wadah.appendChild(btnNum);
        }

        const btnNext = document.createElement('button');
        btnNext.className = 'btn-page-bh';
        btnNext.innerText = 'Next »';
        btnNext.disabled = currentPage === totalPages;
        btnNext.onclick = () => { window.currentPageBagiHasil++; window.renderHalamanBagiHasil(); };
        wadah.appendChild(btnNext);
    };

    window.toggleAccordionBagiHasil = function(headerElement, rowIdPC) {
        // Logika Togel PC
        if (rowIdPC) {
            const detailRow = document.getElementById(rowIdPC);
            const icon = headerElement.querySelector('.acc-icon-bh-pc');
            if (detailRow) {
                if (detailRow.style.display === "none") {
                    detailRow.style.display = "table-row";
                    icon.style.transform = "rotate(90deg)";
                } else {
                    detailRow.style.display = "none";
                    icon.style.transform = "rotate(0deg)";
                }
            }
            return;
        }
        
        // Logika Togel Mobile
        const cardBody = headerElement.nextElementSibling;
        const icon = headerElement.querySelector('.acc-icon-bh-mob');
        if (cardBody.style.display === "none") {
            cardBody.style.display = "block";
            headerElement.style.borderBottom = "1px solid #ecf0f1";
            icon.innerText = "▲ Tutup";
        } else {
            cardBody.style.display = "none";
            headerElement.style.borderBottom = "1px solid transparent";
            icon.innerText = "▼ Detail";
        }
    };

    window.formatRupiahInput = function(inputElem) {
        let val = inputElem.value.replace(/[^0-9]/g, '');
        if (val !== "") {
            inputElem.value = parseInt(val, 10).toLocaleString('id-ID');
        } else {
            inputElem.value = "";
        }
    };

    // =====================================================================
    // 🔥 4. FUNGSI KUNCI & CETAK SLIP GAJI (MENGGUNAKAN DATA STATE)
    // =====================================================================
    window.bukaPreviewSlip = function(idx, event) {
        if (event) event.stopPropagation();
        if (!window.dataBagiHasilGlobal || !window.dataBagiHasilGlobal[idx]) { alert("⚠️ Data dokter tidak ditemukan."); return; }
        
        window.currentPreviewIdx = idx;
        let d = window.dataBagiHasilGlobal[idx];

        let nominalBonus = Number(String(d.valBonus || "0").replace(/[^0-9]/g, '')) || 0;
        let nominalPotongan = Number(String(d.valPotongan || "0").replace(/[^0-9]/g, '')) || 0;
        
        let teksBonus = (d.ketBonus && d.ketBonus.trim() !== "") ? d.ketBonus.trim() : "Injeksi Bonus / Insentif";
        let teksPotongan = (d.ketPotongan && d.ketPotongan.trim() !== "") ? d.ketPotongan.trim() : "Pemotongan Lain (Kasbon dll)";
        
        window.dataDraftSlip = {
            pokokGaji: d.totalBagiHasil,
            bonus: nominalBonus,
            potongan: nominalPotongan,
            finalGaji: (d.totalBagiHasil + nominalBonus) - nominalPotongan,
            teksBonus: teksBonus,
            teksPotongan: teksPotongan
        };
        
        let labMenggantung = d.rincian.filter(r => {
            let isButuhLab = false;
            if (String(r.tindakan).match(/\blab\b/i)) isButuhLab = true;
            if (window.masterTindakanGlobal && window.masterTindakanGlobal.length > 0) {
                let dataMaster = window.masterTindakanGlobal.find(m => String(m.nama).trim().toLowerCase() === String(r.tindakan).trim().toLowerCase());
                if (dataMaster && (dataMaster.Butuh_Lab == 1 || dataMaster.butuhLab == 1 || String(dataMaster.Butuh_Lab) === "1")) isButuhLab = true;
            }
            return isButuhLab && (r.hargaLabVendor === 0 || !r.hargaLabVendor);
        });

        let bannerPeringatanHtml = "";
        let isBlokirKunci = false;

        if (labMenggantung.length > 0) {
            isBlokirKunci = true;
            bannerPeringatanHtml = `
                <div class="no-print" style="background-color: #fff3cd; color: #856404; padding: 15px; border-left: 5px solid #e74c3c; margin-bottom: 20px; border-radius: 4px; font-weight: bold; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <span style="font-size:16px;">🚨</span> PERINGATAN AUDIT KEUANGAN!<br>
                    Terdapat <b>${labMenggantung.length} tindakan Lab</b> (Contoh pasien: ${labMenggantung[0].pasien}) yang belum diinput tagihan eksternalnya.<br>
                    <span style="color:#c0392b;">Sistem secara otomatis MEMBLOKIR penerbitan slip gaji ini untuk mencegah Klinik menanggung kerugian.</span>
                </div>
            `;
        }

        let htmlRincian = '';
        d.rincian.forEach((rin, urut) => {
            let labTxt = rin.hargaLabVendor > 0 ? `-${rin.hargaLabVendor.toLocaleString('id-ID')}` : '-';
            let diskonTxt = rin.diskonProrata > 0 ? `-${rin.diskonProrata.toLocaleString('id-ID')}` : '-';
            let dasarBagiHasil = rin.hargaAsli - rin.hargaLabVendor - rin.diskonProrata;

            htmlRincian += `
                <tr style="border-bottom: 1px dashed #e9ecef;">
                    <td style="padding:8px 5px; text-align:center; font-size:11px;">${urut + 1}</td>
                    <td style="padding:8px 5px; font-size:11px;">${rin.tanggal}</td>
                    <td style="padding:8px 5px; font-size:11px; font-weight:bold;">${rin.pasien}</td>
                    <td style="padding:8px 5px; font-size:11px;">${rin.tindakan}</td>
                    <td style="padding:8px 5px; text-align:right; font-size:11px;">${rin.hargaAsli.toLocaleString('id-ID')}</td>
                    <td style="padding:8px 5px; text-align:right; font-size:11px; color:#e74c3c;">${labTxt}</td>
                    <td style="padding:8px 5px; text-align:right; font-size:11px; color:#e74c3c;">${diskonTxt}</td>
                    <td style="padding:8px 5px; text-align:right; font-size:11px; font-weight:bold; color:#2c3e50;">${dasarBagiHasil.toLocaleString('id-ID')}</td>
                    <td style="padding:8px 5px; text-align:right; font-weight:bold; font-size:11px; color:#27ae60;">${rin.feeFinal.toLocaleString('id-ID')}</td>
                </tr>
            `;
        });

        const htmlSlip = `
                <style>
                    @media print {
                        @page { size: auto; margin: 15mm 20mm; }
                        body { visibility: hidden; background: white !important; }
                        #modalPreviewSlip, .modal-content, .modal-dialog { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; height: auto !important; display: block !important; overflow: visible !important; background: transparent !important; border: none !important; box-shadow: none !important; outline: none !important; }
                        #kertasPreviewPDF, #kertasPreviewPDF * { visibility: visible !important; }
                        #kertasPreviewPDF { position: absolute !important; left: 0 !important; top: 0 !important; margin: 0 !important; padding: 0 !important; width: 100% !important; border: none !important; box-shadow: none !important; }
                        #modalPreviewSlip button, .no-print { display: none !important; }
                        table { page-break-inside: auto; width: 100%; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                        thead { display: table-header-group; }
                        tfoot { display: table-footer-group; }
                        .hindari-terpotong { page-break-inside: avoid !important; break-inside: avoid !important; }
                    }
                    /* 🔥 CSS BARU: Mencegah Tabel Penyet di Layar HP */
                    .tabel-responsif-slip { overflow-x: auto; -webkit-overflow-scrolling: touch; margin-top: 15px; padding-bottom: 10px; border-bottom: 1px solid #eee; }
                    .tabel-responsif-slip table { min-width: 800px; /* Paksa lebar minimal agar tidak terjepit */ }
                    @media print {
                        .tabel-responsif-slip { overflow: visible !important; border-bottom: none !important; margin-top: 10px !important; }
                        .tabel-responsif-slip table { min-width: 100% !important; }
                    }
                </style>
            <div style="font-family: 'Segoe UI', Tahoma, sans-serif; color: #2c3e50; line-height: 1.5; position: relative;">
                <div class="no-print" style="text-align: right; margin-bottom: 20px; border-bottom: 1px dashed #bdc3c7; padding-bottom: 15px;">
                    <button onclick="window.print()" style="background:#3498db; color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:14px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: 0.3s;">🖨️ Cetak / Simpan PDF</button>
                </div>
                ${bannerPeringatanHtml}
                <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #2c3e50; padding-bottom: 10px;">
                    <h2 style="margin:0; letter-spacing: 2px;">KLINIK ANVAYA</h2>
                    <h3 style="margin:5px 0 0 0; color:#7f8c8d; font-weight:normal;">SLIP GAJI & RINCIAN TINDAKAN</h3>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px; background: #f8f9fa; padding: 15px; border-radius: 6px;">
                    <div><div style="font-size: 12px; color: #7f8c8d;">Nama Dokter</div><div style="font-weight: bold; font-size: 16px;">${d.nama}</div></div>
                    <div style="text-align: right;"><div style="font-size: 11px; margin-top: 3px; color:#95a5a6;">Dirender pada: ${new Date().toLocaleString('id-ID')}</div></div>
                </div>
                <div style="font-weight: bold; background: #34495e; color: white; padding: 5px 10px; font-size: 12px;">A. DETAIL TINDAKAN & PERHITUNGAN FEE (40%)</div>
                
                <!-- 🔥 WADAH SCROLL HORIZONTAL BARU -->
                <div class="tabel-responsif-slip">
                    <table style="width: 100%; border-collapse: collapse; table-layout: auto;">
                        <thead>
                            <tr>
                                <th style="background:#ecf0f1; padding:10px 5px; font-size:11px; border-bottom:2px solid #bdc3c7; width:4%;">No</th>
                                <th style="background:#ecf0f1; padding:10px 5px; font-size:11px; border-bottom:2px solid #bdc3c7; width:11%; text-align:left;">Tanggal</th>
                                <th style="background:#ecf0f1; padding:10px 5px; font-size:11px; border-bottom:2px solid #bdc3c7; width:15%; text-align:left;">Pasien</th>
                                <th style="background:#ecf0f1; padding:10px 5px; font-size:11px; border-bottom:2px solid #bdc3c7; width:20%; text-align:left;">Tindakan</th>
                                <th style="background:#ecf0f1; padding:10px 5px; font-size:11px; border-bottom:2px solid #bdc3c7; width:10%; text-align:right;">Tarif (Rp)</th>
                                <th style="background:#ecf0f1; padding:10px 5px; font-size:11px; border-bottom:2px solid #bdc3c7; width:10%; text-align:right;">Biaya Lab</th>
                                <th style="background:#ecf0f1; padding:10px 5px; font-size:11px; border-bottom:2px solid #bdc3c7; width:9%; text-align:right;">Diskon</th>
                                <th style="background:#ecf0f1; padding:10px 5px; font-size:11px; border-bottom:2px solid #bdc3c7; width:10%; text-align:right; color:#2980b9;">Dasar Fee</th>
                                <th style="background:#ecf0f1; padding:10px 5px; font-size:11px; border-bottom:2px solid #bdc3c7; width:11%; text-align:right;">Fee Bersih</th>
                            </tr>
                        </thead>
                        <tbody>${htmlRincian}</tbody>
                    </table>
                </div>

                <div style="text-align:right; font-weight:bold; padding: 10px 5px; border-top: 2px solid #2c3e50; margin-top:5px; font-size: 14px;">Total Fee Bersih: Rp ${window.dataDraftSlip.pokokGaji.toLocaleString('id-ID')}</div>
                <div class="hindari-terpotong" style="border: 2px solid #2ecc71; padding: 15px; margin-top: 25px; background: #f9fffb; border-radius: 6px;">
                    <div style="font-weight:bold; color:#2c3e50; margin-bottom:15px; border-bottom:1px solid #ccc; padding-bottom:5px;">B. KALKULASI FINAL (TAKE HOME PAY)</div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:15px;"><span>Total Pokok Fee Bersih (Dari Tindakan)</span><span>Rp ${window.dataDraftSlip.pokokGaji.toLocaleString('id-ID')}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:15px; color:#27ae60;"><span>(+) ${teksBonus}</span><span>Rp ${nominalBonus.toLocaleString('id-ID')}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:15px; color:#e74c3c;"><span>(-) ${teksPotongan}</span><span>(Rp ${nominalPotongan.toLocaleString('id-ID')})</span></div>
                    <div style="border-top:2px dashed #2ecc71; margin: 15px 0;"></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:20px; font-weight:bold; color:#27ae60;"><span>TOTAL DITERIMA</span><span>Rp ${window.dataDraftSlip.finalGaji.toLocaleString('id-ID')}</span></div>
                </div>
                <div class="hindari-terpotong" style="display:flex; justify-content:flex-end; margin-top:50px; text-align:center;">
                    <div><p style="margin-bottom:60px;">Manajemen Klinik Anvaya,</p><p style="font-weight:bold; border-bottom:1px solid #2c3e50; display:inline-block; padding:0 20px;">( ..................................... )</p></div>
                </div>
            </div>
        `;
        
        const divKertas = document.getElementById('kertasPreviewPDF');
        if (divKertas) divKertas.innerHTML = htmlSlip;
        
        let elInpBulan = document.getElementById('inpBulanGaji');
        if (elInpBulan) elInpBulan.value = window.bh_defaultBulanFilter;

        let btnKunci = document.getElementById('btnKunciSlip');
        if (btnKunci) {
            if (isBlokirKunci) {
                btnKunci.disabled = true;
                btnKunci.style.backgroundColor = "#95a5a6"; 
                btnKunci.style.cursor = "not-allowed";
                btnKunci.innerText = "🚫 TERKUNCI (BIAYA LAB MENGGANTUNG)";
            } else {
                btnKunci.disabled = false;
                btnKunci.style.backgroundColor = "#27ae60"; 
                btnKunci.style.cursor = "pointer";
                btnKunci.innerText = "🔒 KUNCI & TERBITKAN SLIP";
            }
        }
        let elModal = document.getElementById('modalPreviewSlip');
        if (elModal) elModal.style.display = 'flex';
    };

    window.kunciDanSimpanSlip = function() {
        let bulanGaji = document.getElementById('inpBulanGaji') ? document.getElementById('inpBulanGaji').value : ""; 
        if (!bulanGaji) { alert("⚠️ Harap pilih 'Gaji Bulan' terlebih dahulu sebelum mengunci!"); return; }

        let dataDokter = window.dataBagiHasilGlobal[window.currentPreviewIdx];
        let labMenggantung = dataDokter.rincian.filter(r => r.tindakan.match(/\blab\b/i) && r.hargaLabVendor === 0);
        if (labMenggantung.length > 0) {
            alert(`🚫 SISTEM MENOLAK (POTENSI KERUGIAN KLINIK)!\n\nDitemukan ${labMenggantung.length} tindakan Lab yang belum diinput tagihan eksternalnya (Contoh pasien: ${labMenggantung[0].pasien}).\n\nHarap instruksikan Perawat/Admin untuk melengkapi menu [Tagihan Eksternal / Lab] terlebih dahulu agar Klinik tidak nombok fee dokter!`);
            return; 
        }

        let isAlreadyLocked = window.arsipGajiTerkunci && window.arsipGajiTerkunci.some(x => window.isDokterMatchGlobal(x.namaDokter, dataDokter.nama) && x.periode === bulanGaji);
        if (isAlreadyLocked) {
            if (!confirm(`⚠️ PERHATIAN!\nSlip Gaji periode ${bulanGaji} untuk dr. ${dataDokter.nama} SUDAH PERNAH DITERBITKAN.\n\nApakah Anda yakin ingin MEREVISI (menimpa) data lama dengan angka yang baru ini?`)) return; 
        }

        let draft = window.dataDraftSlip;
        let btn = document.getElementById('btnKunciSlip');
        if (btn) { btn.disabled = true; btn.innerText = "⏳ MENGUNCI DATA..."; }

        let payload = {
            action: "kunciSlipGaji",
            namaDokter: dataDokter.nama,
            periodeBulan: bulanGaji,
            pokokFee: draft.pokokGaji,
            bonus: draft.bonus,
            potongan: draft.potongan,
            thp: draft.finalGaji,
            teksKeterangan: `Bonus: ${draft.teksBonus} | Potongan: ${draft.teksPotongan}`,
            rincianJson: JSON.stringify(dataDokter.rincian) 
        };

        fetch(window.WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
        .then(res => res.json())
        .then(res => {
            if (btn) { btn.disabled = false; btn.innerText = "🔒 KUNCI & TERBITKAN SLIP"; }
            if (res.result === "success") {
                alert("✅ BERHASIL: " + res.message);
                const mod = document.getElementById('modalPreviewSlip');
                if (mod) mod.style.display = 'none';
                
                if (!window.arsipGajiTerkunci) window.arsipGajiTerkunci = [];
                window.arsipGajiTerkunci = window.arsipGajiTerkunci.filter(x => !(window.isDokterMatchGlobal(x.namaDokter, dataDokter.nama) && x.periode === bulanGaji));
                window.arsipGajiTerkunci.push({ namaDokter: dataDokter.nama, periode: bulanGaji });
                
                // Minta sistem untuk me-render ulang halaman agar status kunci teraplikasikan!
                window.renderHalamanBagiHasil();
            } else { alert("❌ Gagal Mengunci: " + res.message); }
        })
        .catch(err => {
            if (btn) { btn.disabled = false; btn.innerText = "🔒 KUNCI & TERBITKAN SLIP"; }
            alert("⚠️ Terjadi gangguan koneksi jaringan.");
        });
    };

    window.hitungRealtimeGaji = function(idx, pokokGaji) {
        let elBonus = document.getElementById(`inpBonus_${idx}`);
        let elPotongan = document.getElementById(`inpPotongan_${idx}`);
        
        let strBonus = elBonus ? elBonus.value.replace(/[^0-9]/g, '') : "0";
        let strPotongan = elPotongan ? elPotongan.value.replace(/[^0-9]/g, '') : "0";
        
        let nominalBonus = Number(strBonus) || 0;
        let nominalPotongan = Number(strPotongan) || 0;
        
        let finalGaji = (pokokGaji + nominalBonus) - nominalPotongan;
        
        let elLabel = document.getElementById(`lblGajiFinal_${idx}`);
        if(elLabel) {
            elLabel.innerText = "Rp " + finalGaji.toLocaleString('id-ID');
        }
    };

    window.cetakSlipDokter = function(index, event) {
        if (event) event.stopPropagation(); 
        let btn = (window.event && window.event.target) ? window.event.target : null;
        const teksAsli = btn ? btn.innerText : "Mencetak...";
        if (btn) { btn.innerText = "⏳ Mencetak..."; btn.disabled = true; }

        const dataDokter = window.dataBagiHasilGlobal[index];
        
        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "cetakSlipBagiHasil", namaDokter: dataDokter.nama, periode: window.periodeBagiHasilGlobal, rincian: JSON.stringify(dataDokter.rincian) })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                window.open(res.pdfUrl, '_blank');
                if (btn) {
                    btn.innerHTML = "📂 Buka Slip"; btn.style.backgroundColor = "#27ae60"; btn.style.boxShadow = "0 1px 3px rgba(39, 174, 96, 0.4)"; btn.disabled = false;
                    btn.onclick = function(e) { if (e) e.stopPropagation(); window.open(res.pdfUrl, '_blank'); };
                }
            } else {
                if (btn) { btn.innerText = teksAsli; btn.disabled = false; }
                alert("Gagal mencetak: " + res.message);
            }
        })
        .catch(err => {
            if (btn) { btn.innerText = teksAsli; btn.disabled = false; }
            alert("Kesalahan jaringan saat mencetak slip.");
        });
    }

})();