// =========================================================================
// 📈 MODUL DASHBOARD UTAMA, ANALISIS BISNIS, & GRAFIK KEUANGAN
// =========================================================================
(function() {

    // 1. Variabel Privat untuk Menyimpan Instansi Grafik (Mencegah Memory Leak)
    let chartHarianInst = null;
    let chartTindakanInst = null;

    // =====================================================================
    // 2. FUNGSI MUAT STATISTIK DASHBOARD (BERANDA UTAMA)
    // =====================================================================
    window.muatDashboardStatistik = function() {
        const tbodyKasus = document.getElementById('dashBodyTopKasus');
        const tbodyJam = document.getElementById('dashBodyJamSibuk');

        if (tbodyKasus) tbodyKasus.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 15px;">⏳ Mengkalkulasi data medis...</td></tr>`;
        if (tbodyJam) tbodyJam.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 15px;">⏳ Memetakan kepadatan jam...</td></tr>`;

        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getDashboardStats" })
        })
        .then(res => {
            if (!res.ok) throw new Error("Koneksi server bermasalah.");
            return res.json();
        })
        .then(res => {
            if (res.result === "success") {
                const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
                
                setVal('dashTotalKunjungan', res.totalKunjungan);
                setVal('dashTotalKunjunganTahun', res.totalKunjunganTahunIni);
                setVal('dashPasienBaru', res.pasienBaru);
                setVal('dashRasioPasien', res.rasioPasien);
                setVal('dashTingkatBatal', res.tingkatBatal);
                setVal('dashRasioGender', res.rasioGender);

                if (tbodyKasus) {
                    tbodyKasus.innerHTML = "";
                    if (res.topKasus.length === 0) {
                        tbodyKasus.innerHTML = `<tr><td colspan="2" style="text-align:center; padding:12px; color:gray;">Belum ada riwayat kasus bulan ini.</td></tr>`;
                    } else {
                        res.topKasus.forEach((item, index) => {
                            const medali = ["🥇", "🥈", "🥉"][index] || "•";
                            tbodyKasus.innerHTML += `<tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 10px; font-weight:500;">${medali} ${item.nama}</td>
                                <td style="padding: 10px; text-align: center; font-weight: bold; color: #2980b9;">${item.jumlah} Pasien</td>
                            </tr>`;
                        });
                    }
                }

                if (tbodyJam) {
                    tbodyJam.innerHTML = "";
                    let adaDataJam = false;
                    
                    for (let slot in res.jamSibuk) {
                        if (res.jamSibuk[slot] > 0) adaDataJam = true;
                        
                        tbodyJam.innerHTML += `<tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px; font-weight:500;">📅 ${slot}</td>
                            <td style="padding: 10px; text-align: center; font-weight: bold; color: #27ae60;">${res.jamSibuk[slot]} Pasien</td>
                        </tr>`;
                    }
                    if (!adaDataJam) {
                        tbodyJam.innerHTML = `<tr><td colspan="2" style="text-align:center; padding:12px; color:gray;">Belum ada kunjungan tercatat bulan ini.</td></tr>`;
                    }
                }

            } else {
                console.error("Gagal memuat analitik dashboard:", res.message);
                if (tbodyKasus) tbodyKasus.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 15px; color:red;">❌ Gagal memuat data</td></tr>`;
                if (tbodyJam) tbodyJam.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 15px; color:red;">❌ Gagal memuat data</td></tr>`;
            }
        })
        .catch(err => {
            console.error("Error network dashboard stats:", err);
            if (tbodyKasus) tbodyKasus.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 15px; color:red;">⚠️ Gangguan Koneksi</td></tr>`;
            if (tbodyJam) tbodyJam.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 15px; color:red;">⚠️ Gangguan Koneksi</td></tr>`;
        });
    };

    // =====================================================================
    // 3. FUNGSI FETCH DATA ANALISIS MARKETING
    // =====================================================================
    window.muatAnalisisBisnis = function() {
        const tbodyRetensi = document.getElementById('mktBodyRetensi');
        const tbodyZonasi = document.getElementById('mktBodyZonasi');
        const tbodyHari = document.getElementById('mktBodyHariSibuk');

        if (tbodyRetensi) tbodyRetensi.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px;">⏳ Mengaudit database rekam medis...</td></tr>`;
        if (tbodyZonasi) tbodyZonasi.innerHTML = `<tr><td colspan="2" style="text-align:center; padding:15px;">⏳ Mengelompokkan alamat...</td></tr>`;
        if (tbodyHari) tbodyHari.innerHTML = `<tr><td colspan="2" style="text-align:center; padding:15px;">⏳ Menghitung kepadatan hari...</td></tr>`;

        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getMarketingAnalytics" })
        })
        .then(res => {
            if (!res.ok) throw new Error("Koneksi server bermasalah.");
            return res.json();
        })
        .then(res => {
            if (res.result === "success") {
                
                if (tbodyRetensi) {
                    tbodyRetensi.innerHTML = "";
                    if (res.retensiPasien.length === 0) {
                        tbodyRetensi.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:green; font-weight:bold;">✔️ Semua pasien aktif berkunjung dalam 6 bulan terakhir!</td></tr>`;
                    } else {
                        res.retensiPasien.forEach(pasien => {
                            tbodyRetensi.innerHTML += `<tr style="border-bottom:1px solid #eee;">
                                <td style="padding:8px; font-weight:bold;">${pasien.noRM}</td>
                                <td style="padding:8px;"><strong>${pasien.nama}</strong></td>
                                <td style="padding:8px; color:#27ae60; font-weight:500;">📞 ${pasien.whatsapp}</td>
                                <td style="padding:8px; color:#e74c3c; font-weight:500;">⏱️ ${pasien.kunjunganTerakhir}</td>
                            </tr>`;
                        });
                    }
                }

                if (tbodyZonasi) {
                    tbodyZonasi.innerHTML = "";
                    res.zonasiAlamat.forEach(item => {
                        tbodyZonasi.innerHTML += `<tr style="border-bottom:1px solid #eee;">
                            <td style="padding:8px; font-weight:500;">📍 ${item.wilayah}</td>
                            <td style="padding:8px; text-align:center; font-weight:bold; color:#2980b9;">${item.total} Pasien</td>
                        </tr>`;
                    });
                }

                if (tbodyHari) {
                    tbodyHari.innerHTML = "";
                    res.analisisHari.forEach(item => {
                        tbodyHari.innerHTML += `<tr style="border-bottom:1px solid #eee;">
                            <td style="padding:8px; font-weight:500;">📅 ${item.hari}</td>
                            <td style="padding:8px; text-align:center; font-weight:bold; color:#27ae60;">${item.jumlah} Kunjungan</td>
                        </tr>`;
                    });
                }

            } else {
                alert("Gagal memuat analisis marketing: " + res.message);
            }
        })
        .catch(err => {
            console.error("Error marketing analysis:", err);
            if (tbodyRetensi) tbodyRetensi.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:red;">⚠️ Gangguan Koneksi Jaringan</td></tr>`;
        });
    };

    // =====================================================================
    // 4. KONTROL TAMPILAN PILLS LAPORAN KEUANGAN
    // =====================================================================
    window.switchPillFinansial = function(targetPill, btnElement) {
        document.querySelectorAll('.pill-btn').forEach(btn => btn.classList.remove('active'));
        if (btnElement) btnElement.classList.add('active');

        document.querySelectorAll('.pill-content').forEach(content => content.style.display = 'none');

        let idKonten = '';
        if (targetPill === 'grafik') idKonten = 'pillGrafik';
        if (targetPill === 'kinerja') idKonten = 'pillKinerja';
        if (targetPill === 'tabel') idKonten = 'pillTabel';
        
        if (idKonten) {
            const el = document.getElementById(idKonten);
            if (el) el.style.display = 'block';
        }
    };

    // =====================================================================
    // 5. MESIN PENGGAMBAR GRAFIK (CHART.JS)
    // =====================================================================
    window.renderGrafikFinansial = function(chartData) {
        if (typeof Chart === 'undefined') {
            console.error("❌ Library Chart.js gagal dimuat! Grafik tidak dapat dirender.");
            return;
        }

        if(chartHarianInst) chartHarianInst.destroy();
        if(chartTindakanInst) chartTindakanInst.destroy();

        const canvasHarian = document.getElementById('canvasChartHarian');
        if (canvasHarian) {
            const ctxHarian = canvasHarian.getContext('2d');
            chartHarianInst = new Chart(ctxHarian, {
                type: 'line',
                data: {
                    labels: chartData.harian.labels,
                    datasets: [
                        {
                            label: 'Omzet (Rp)',
                            data: chartData.harian.omzet,
                            borderColor: '#2ecc71', backgroundColor: 'rgba(46, 204, 113, 0.1)',
                            borderWidth: 3, fill: true, tension: 0.3, yAxisID: 'y'
                        },
                        {
                            label: 'ATV / Rata-rata Trx (Rp)',
                            data: chartData.harian.atv,
                            borderColor: '#3498db', borderWidth: 2, borderDash: [5, 5],
                            type: 'line', tension: 0.3, yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { tooltip: { callbacks: { label: function(context) { return context.dataset.label + ': Rp ' + context.raw.toLocaleString('id-ID'); } } } },
                    scales: {
                        y: { type: 'linear', display: true, position: 'left', ticks: { callback: function(val) { return 'Rp ' + (val/1000000).toFixed(1) + ' Jt'; } } },
                        y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: function(val) { return 'Rp ' + (val/1000).toLocaleString('id-ID') + 'k'; } } }
                    }
                }
            });
        }

        let labelTindakanRupiah = chartData.tindakan.labels.map((namaTindakan, index) => {
            let nilaiRupiah = chartData.tindakan.omzet[index];
            return `${namaTindakan} (Rp ${nilaiRupiah.toLocaleString('id-ID')})`;
        });

        const canvasTindakan = document.getElementById('canvasChartTindakan');
        if (canvasTindakan) {
            const ctxTindakan = canvasTindakan.getContext('2d');
            chartTindakanInst = new Chart(ctxTindakan, {
                type: 'doughnut',
                data: {
                    labels: labelTindakanRupiah, 
                    datasets: [{
                        data: chartData.tindakan.omzet,
                        backgroundColor: ['#e74c3c', '#f1c40f', '#3498db', '#9b59b6', '#34495e', '#1abc9c', '#e67e22', '#d35400', '#c0392b', '#7f8c8d'],
                        borderWidth: 2, hoverOffset: 5
                    }]
                },
                options: { 
                    responsive: true, maintainAspectRatio: false,
                    plugins: { 
                        legend: { position: 'right', labels: { font: { size: 11, weight: '500' }, padding: 15 } },
                        tooltip: { callbacks: { label: function(context) { return ' Kontribusi: Rp ' + context.raw.toLocaleString('id-ID'); } } }
                    } 
                }
            });
        }
    };

    // =========================================================================
    // 🔒 NAVIGASI SUB-TAB ANALISIS BISNIS (ANTI-REKURSI & AUTO-REDIRECT)
    // =========================================================================
    window.switchSubTabAnalisis = function(targetTab, btnElement) {
        let tabAman = targetTab;

        if (targetTab === 'finansial') {
            const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
            const perms = sessionData.permissions || {};
            const role = (sessionData.role || '').toLowerCase();
            
            const punyaAksesFinansial = perms.akseskokpitfinansial === 1 || 
                                        perms.Akses_KokpitFinansial === 1 || 
                                        perms.kokpitFinansial === 1 || 
                                        role === 'owner' || 
                                        role === 'super admin';

            if (!punyaAksesFinansial) {
                console.warn("🔒 [RBAC] Akses Kokpit Finansial ditolak. Mengalihkan otomatis ke Operasional...");
                tabAman = 'operasional'; 
            }
        }

        document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active'));
        
        if (btnElement && tabAman === targetTab) {
            btnElement.classList.add('active'); 
        } else {
            const autoBtn = tabAman === 'finansial' 
                ? document.getElementById('btnSubTabFinansial') 
                : (document.querySelector('.sub-tab-btn[onclick*="operasional"]') || document.getElementById('btnSubTabDemografi'));
            if (autoBtn) autoBtn.classList.add('active');
        }

        const kamarOperasional = document.getElementById('subTabOperasional');
        const kamarFinansial = document.getElementById('subTabFinansial');
        
        if (kamarOperasional) kamarOperasional.style.display = 'none';
        if (kamarFinansial) kamarFinansial.style.display = 'none';

        if (tabAman === 'operasional' && kamarOperasional) {
            kamarOperasional.style.display = 'block';
        }
        if (tabAman === 'finansial' && kamarFinansial) {
            kamarFinansial.style.display = 'block';
        }
    };

    window.formatRupiahFinansial = function(angka) {
        return new Intl.NumberFormat('id-ID', { 
            style: 'currency', 
            currency: 'IDR', 
            minimumFractionDigits: 0 
        }).format(angka);
    };

    // =====================================================================
    // 📊 FUNGSI MENARIK DATA KEUANGAN
    // =====================================================================
    window.muatDataFinansial = function() {
        const elTglMulai = document.getElementById('tglMulaiFinansial');
        const elTglAkhir = document.getElementById('tglAkhirFinansial');
        const tglMulai = elTglMulai ? elTglMulai.value : "";
        const tglAkhir = elTglAkhir ? elTglAkhir.value : "";
        
        const btnFilter = document.querySelector('button[onclick*="muatDataFinansial"]');
        let teksAsli = "Terapkan Filter";
        
        if (btnFilter) {
            teksAsli = btnFilter.innerText;
            btnFilter.innerText = "⏳ Menarik...";
            btnFilter.disabled = true;
        }

        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Menarik Data Laporan Finansial...");

        fetch(window.WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: "getLaporanFinansial", 
                startDate: tglMulai, 
                endDate: tglAkhir 
            })
        })
        .then(res => res.json())
        .then(res => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();

            if (btnFilter) {
                btnFilter.innerText = teksAsli;
                btnFilter.disabled = false;
            }

            if (res.result === "success") {
                const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
                const setHtml = (id, val) => { const el = document.getElementById(id); if (el) el.innerHTML = val; };

                setVal('valPendapatanBersih', window.formatRupiahFinansial(res.metrik.pendapatan));
                setHtml('valTotalTransaksi', `${res.metrik.transaksi} <span style="font-size:14px; font-weight:normal;">Nota</span>`);
                setVal('valRataTransaksi', window.formatRupiahFinansial(res.metrik.rataRata));
                setVal('valTotalDiskon', window.formatRupiahFinansial(res.metrik.diskon));

                const selectDokter = document.getElementById('filterSelectDokter');
                const selectTindakan = document.getElementById('filterSelectTindakan');
                const selectPembayaran = document.getElementById('filterSelectPembayaran');
                
                if (selectDokter && selectTindakan && selectPembayaran) {
                    const valDokter = selectDokter.value;
                    const valTindakan = selectTindakan.value;
                    const valPembayaran = selectPembayaran.value; 

                    selectDokter.innerHTML = '<option value="">👨‍⚕️ Semua Dokter</option>';
                    selectTindakan.innerHTML = '<option value="">🩺 Semua Tindakan</option>';
                    selectPembayaran.innerHTML = '<option value="">💳 Semua Pembayaran</option>';
                    
                    if (res.opsiFilter) {
                        res.opsiFilter.dokter.forEach(d => selectDokter.innerHTML += `<option value="${d}">${d}</option>`);
                        res.opsiFilter.tindakan.forEach(t => selectTindakan.innerHTML += `<option value="${t}">${t}</option>`);
                        if(res.opsiFilter.pembayaran) {
                            res.opsiFilter.pembayaran.forEach(p => selectPembayaran.innerHTML += `<option value="${p}">${p}</option>`);
                        }
                    }
                    
                    selectDokter.value = valDokter;
                    selectTindakan.value = valTindakan;
                    selectPembayaran.value = valPembayaran; 
                }
                
                const divTumbuh = document.getElementById('valPertumbuhan');
                if (divTumbuh) {
                    if (res.metrik.pertumbuhan.arah === "naik") {
                        divTumbuh.innerHTML = `📈 Naik ${res.metrik.pertumbuhan.persen}% vs sblmnya`;
                        divTumbuh.style.color = "#a8ffc4";
                    } else if (res.metrik.pertumbuhan.arah === "turun") {
                        divTumbuh.innerHTML = `📉 Turun ${res.metrik.pertumbuhan.persen}% vs sblmnya`;
                        divTumbuh.style.color = "#ffcccc";
                    } else {
                        divTumbuh.innerHTML = `➖ Stabil (0%)`;
                        divTumbuh.style.color = "#ffffff";
                    }
                }

                if (typeof window.renderGrafikFinansial === "function") {
                    window.renderGrafikFinansial(res.chartData);
                }
                
                const tbody = document.getElementById('tbodyLaporanFinansial');
                if (tbody) {
                    tbody.innerHTML = ''; 
                    
                    if (res.dataTabel && res.dataTabel.length > 0) {
                        res.dataTabel.forEach(nota => {
                            let btnPdf = nota.linkPdf !== "#" 
                                ? `<a href="${nota.linkPdf}" target="_blank" style="background:#e74c3c; color:white; padding:5px 12px; border-radius:4px; text-decoration:none; font-size:11px; white-space: nowrap; display: inline-block; font-weight: bold; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">📄 Buka</a>` 
                                : `<span style="color:#bdc3c7; font-size:11px; white-space: nowrap;">Tidak Ada</span>`;

                            let strDokter = nota.dokter || "";
                            let arrDokter = strDokter.split(/<br\s*\/?>|,|\n/i);
                            let dokterBersih = arrDokter.map(d => d.trim()).filter(d => {
                                let textOnly = d.replace(/👨‍⚕️/g, "").trim(); 
                                return textOnly !== "" && textOnly !== "-"; 
                            });
                            let dokterUnik = [...new Set(dokterBersih)];
                            let dokterFinal = dokterUnik.length > 0 
                                ? dokterUnik.join('<br>') 
                                : `<span style="color:#bdc3c7; font-style:italic;">Tanpa Dokter</span>`;

                            tbody.innerHTML += `
                                <tr style="border-bottom: 1px solid #eee; vertical-align: top;">
                                    <td style="padding: 12px; font-family: monospace; color:#2980b9;"><b>${nota.noKuitansi}</b></td>
                                    <td style="padding: 12px;">${nota.tanggal}</td>
                                    <td style="padding: 12px; font-weight:bold;">${nota.namaPasien}</td>
                                    <td style="padding: 12px; font-size: 12px; line-height: 1.5;">${nota.tindakan}</td>
                                    <td style="padding: 12px; font-size: 12px; line-height: 1.5; color: #4b6584; font-weight: 500;">${dokterFinal}</td>
                                    <td style="padding: 12px; text-align:center;">
                                        <span style="background: #f1f2f6; border: 1px solid #dcdde1; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; color: #2f3640; display: inline-block;">
                                            ${nota.metodeBayar}
                                        </span>
                                    </td>
                                    <td style="padding: 12px; text-align:right; color:#e74c3c;">${nota.diskon > 0 ? window.formatRupiahFinansial(nota.diskon) : '-'}</td>
                                    <td style="padding: 12px; text-align:right; color:#27ae60; font-weight:bold;">${window.formatRupiahFinansial(nota.grandTotal)}</td>
                                    <td style="padding: 12px; text-align:center;">${btnPdf}</td>
                                </tr>
                            `;
                        });
                    } else {
                        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:gray;">Tidak ada transaksi di rentang tanggal tersebut.</td></tr>`;
                    }
                }

                if (typeof window.cariTabelFinansial === "function") {
                    setTimeout(window.cariTabelFinansial, 100);
                }

            } else {
                alert("⚠️ Gagal memuat laporan: " + res.message);
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            if (btnFilter) {
                btnFilter.innerText = teksAsli;
                btnFilter.disabled = false;
            }
            console.error("🚨 TERSANGKA ERROR DITEMUKAN:", err); 
            alert("⚠️ Terjadi kesalahan jaringan.");
        });
    };

    window.resetFilterFinansial = function() {
        const tglMulai = document.getElementById('tglMulaiFinansial');
        const tglAkhir = document.getElementById('tglAkhirFinansial');
        if (tglMulai) tglMulai.value = '';
        if (tglAkhir) tglAkhir.value = '';
        
        window.muatDataFinansial();
    };

    window.setPresetTanggal = function(tipe) {
        const today = new Date();
        let start = new Date(today);
        let end = new Date(today);

        if (tipe === 'hariIni') {
            // start & end sama-sama hari ini
        } 
        else if (tipe === 'mingguIni') {
            const day = today.getDay(); 
            const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diffToMonday);
            end = new Date(start);
            end.setDate(start.getDate() + 6);
        } 
        else if (tipe === 'bulanIni') {
            start = new Date(today.getFullYear(), today.getMonth(), 1); 
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0); 
        } 
        else if (tipe === 'tahunIni') {
            start = new Date(today.getFullYear(), 0, 1); 
            end = new Date(today.getFullYear(), 11, 31); 
        }

        const format = (d) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        const tglMulai = document.getElementById('tglMulaiFinansial');
        const tglAkhir = document.getElementById('tglAkhirFinansial');
        if (tglMulai) tglMulai.value = format(start);
        if (tglAkhir) tglAkhir.value = format(end);
        
        window.muatDataFinansial();
    };

    // OTOMATISASI SAAT HALAMAN DIMUAT (Event Listener Aman)
    window.addEventListener("load", function() {
        if (document.getElementById('tglMulaiFinansial')) {
            window.setPresetTanggal('bulanIni'); 
        }
    });

    window.cariTabelFinansial = function() {
        const inputEl = document.getElementById("inputCariFinansial");
        const filterDokterEl = document.getElementById("filterSelectDokter");
        const filterTindakanEl = document.getElementById("filterSelectTindakan");
        const filterPembayaranEl = document.getElementById("filterSelectPembayaran");

        const inputTeks = inputEl ? inputEl.value.toLowerCase() : "";
        const filterDokter = filterDokterEl ? filterDokterEl.value.toLowerCase() : "";
        const filterTindakan = filterTindakanEl ? filterTindakanEl.value.toLowerCase() : "";
        const filterPembayaran = filterPembayaranEl ? filterPembayaranEl.value.toLowerCase() : "";

        const barisTabel = document.querySelectorAll("#tbodyLaporanFinansial tr");

        barisTabel.forEach(baris => {
            if (baris.cells.length < 2) return; 
            
            const noNota = baris.cells[0].innerText.toLowerCase();
            const namaPasien = baris.cells[2].innerText.toLowerCase();
            const teksTindakan = baris.cells[3].innerText.toLowerCase(); 
            const teksDokter = baris.cells[4].innerText.toLowerCase();   
            const teksPembayaran = baris.cells[5].innerText.toLowerCase(); 

            let matchTeks = noNota.includes(inputTeks) || namaPasien.includes(inputTeks);
            let matchDokter = filterDokter === "" || teksDokter.includes(filterDokter);
            let matchTindakan = filterTindakan === "" || teksTindakan.includes(filterTindakan);
            let matchPembayaran = filterPembayaran === "" || teksPembayaran.includes(filterPembayaran); 

            if (matchTeks && matchDokter && matchTindakan && matchPembayaran) {
                baris.style.display = ""; 
            } else {
                baris.style.display = "none"; 
            }
        });
    };

    // ==========================================================
    // 🖨️ FITUR EXPORT: EXCEL (CSV) & CETAK PDF
    // ==========================================================
    window.exportKeCSV = function() {
        let csv = [];
        let header = ["No. Kuitansi", "Tanggal", "Nama Pasien", "Rincian Tindakan", "Dokter Pelaksana", "Pembayaran", "Diskon", "Grand Total"];
        csv.push(header.join(","));

        let barisTabel = document.querySelectorAll("#tbodyLaporanFinansial tr");
        
        barisTabel.forEach(row => {
            if (row.style.display !== "none" && row.cells.length > 1) { 
                let barisCsv = [];
                for (let i = 0; i < 8; i++) { 
                    let teks = "";
                    let spans = row.cells[i].querySelectorAll('span');
                    
                    if (spans.length > 0 && (i === 3 || i === 4)) {
                        let arrSpan = Array.from(spans).map(s => s.innerText.trim());
                        teks = arrSpan.join(", "); 
                    } else {
                        teks = row.cells[i].innerText.trim().replace(/(\r\n|\n|\r)/gm, " "); 
                    }

                    teks = teks.replace(/"/g, '""'); 
                    barisCsv.push(`"${teks}"`); 
                }
                csv.push(barisCsv.join(","));
            }
        });

        let csvString = csv.join("\n");
        let blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        let link = document.createElement("a");
        let url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "Laporan_Keuangan_Klinik.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    window.cetakTabelPDF = function() {
        let tableHtml = `<table border="1" cellpadding="8" style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; text-align: left;">`;
        tableHtml += `<thead style="background-color: #f2f2f2;"><tr>
            <th style="width: 12%;">No. Nota</th>
            <th style="width: 10%;">Tanggal</th>
            <th style="width: 14%;">Nama Pasien</th>
            <th style="width: 25%;">Rincian Tindakan</th>
            <th style="width: 15%;">Dokter</th>
            <th style="width: 7%; text-align:center;">Bayar</th>
            <th style="width: 8%; text-align:right;">Diskon</th>
            <th style="width: 9%; text-align:right;">Total</th>
        </tr></thead><tbody>`;

        let barisTabel = document.querySelectorAll("#tbodyLaporanFinansial tr");
        let adaData = false;

        barisTabel.forEach(row => {
            if (row.style.display !== "none" && row.cells.length > 1) {
                adaData = true;
                tableHtml += `<tr>`;
                for(let i = 0; i < 8; i++){
                    let align = (i === 6 || i === 7) ? 'text-align:right;' : (i === 5 ? 'text-align:center;' : '');
                    let teksBersih = "";
                    let spans = row.cells[i].querySelectorAll('span');
                    
                    if (spans.length > 0 && (i === 3 || i === 4)) {
                        let arrSpan = Array.from(spans).map(s => `<li style="margin-bottom: 2px;">${s.innerText.trim()}</li>`);
                        teksBersih = `<ul style="margin: 0; padding-left: 14px;">${arrSpan.join("")}</ul>`; 
                    } else {
                        teksBersih = row.cells[i].innerText.trim().replace(/(\r\n|\n|\r)/gm, "<br>");
                    }

                    tableHtml += `<td style="${align} vertical-align: top;">${teksBersih}</td>`;
                }
                tableHtml += `</tr>`;
            }
        });
        tableHtml += `</tbody></table>`;

        if(!adaData) {
            alert("⚠️ Tidak ada data untuk dicetak!"); return;
        }

        let jendelaCetak = window.open('', '_blank', 'width=900,height=600');
        jendelaCetak.document.write(`
            <html>
                <head>
                    <title>Cetak Laporan Keuangan</title>
                    <style>
                        tr { page-break-inside: avoid; }
                        @media print {
                            @page { margin: 1.5cm; } 
                        }
                    </style>
                </head>
                <body style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="text-align: center; margin-bottom: 5px; color: #2c3e50;">Laporan Keuangan Klinik</h2>
                    <p style="text-align: center; font-size: 12px; color: #7f8c8d; margin-top: 0; margin-bottom: 25px;">Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
                    
                    ${tableHtml}
                    
                    <div style="margin-top:40px; text-align:right; font-size:12px;">
                        <p>Mengetahui,</p><br><br><br><p><b>Bagian Keuangan</b></p>
                    </div>
                </body>
            </html>
        `);
        jendelaCetak.document.close();
        jendelaCetak.focus();
        
        setTimeout(() => { 
            jendelaCetak.print(); 
            jendelaCetak.close();
        }, 500);
    };

})();