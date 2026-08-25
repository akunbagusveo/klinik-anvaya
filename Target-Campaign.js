// =========================================================================
// 🎂 MODUL TARGET CAMPAIGN ULANG TAHUN (KHUSUS DIGITAL MARKETING)
// =========================================================================
(function() {

    // Variabel global untuk menyimpan cache data ulang tahun agar bisa diekspor ke CSV tanpa fetch ulang
    window.cacheDataUlangTahun = [];

    /**
     * 1. FUNGSI MUAT DATA: Menarik data pasien ulang tahun bulan ini dari server
     */
    window.muatDataUlangTahun = function() {
        const tbody = document.getElementById('bodyTabelUlangTahun');
        const lblBulan = document.getElementById('lblBulanUlangTahun');
        const btnRefresh = document.getElementById('btnRefreshUlangTahun');

        if (!tbody) return;

        // --- PROTEKSI RBAC (Cek Hak Akses Analisis Bisnis) ---
        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        const perms = sessionData.permissions || {};
        const role = (sessionData.role || '').toLowerCase();
        
        const punyaAkses = perms.aksesanalisisbisnis === 1 || 
                        perms.Akses_AnalisisBisnis === 1 || 
                        perms.analisisBisnis === 1 || 
                        role === 'owner' || 
                        role === 'super admin' ||
                        role === 'admin';

        if (!punyaAkses) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 30px; background: #fef2f2; color: #991b1b; font-weight: bold;">🔒 Akses Ditolak: Fitur ini khusus untuk peran yang memiliki izin Analisis Bisnis / Digital Marketing.</td></tr>';
            return;
        }

        // Ubah status tombol dan tabel menjadi loading
        if (btnRefresh) btnRefresh.innerHTML = '⏳ Memuat...';
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 35px 20px; color: #0ea5e9; font-weight: bold;">⏳ Mengambil data pasien ulang tahun bulan ini dari Master Pasien...</td></tr>';

        // 🔥 UPGRADE: Sinkronisasi visual dengan Layar Hitam Loading
        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Menarik Target Campaign Ulang Tahun...");

        // Nama-nama bulan dalam bahasa Indonesia
        const namaBulanIndo = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const bulanSekarangIdx = new Date().getMonth() + 1;
        if (lblBulan) lblBulan.innerText = namaBulanIndo[bulanSekarangIdx] || "Bulan Ini";

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getPasienUlangTahunBulanIni" })
        })
        .then(res => res.json())
        .then(res => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            if (btnRefresh) btnRefresh.innerHTML = '🔄 Refresh Data';
            
            tbody.innerHTML = '';

            if (res.result === "success" && res.data && res.data.length > 0) {
                // Simpan ke cache global untuk fitur Ekspor CSV
                window.cacheDataUlangTahun = res.data;

                console.log(`🎉 [CAMPAIGN ULANG TAHUN] Berhasil memuat ${res.data.length} pasien!`);

                res.data.forEach((p, idx) => {
                    const noRM = p.noRM || "-";
                    const nama = p.namaPasien || "Pasien";
                    const tglLahir = p.tanggalLahirTampil || "-";
                    const umur = p.umur && p.umur !== "-" ? `${p.umur} Thn` : "-";
                    const noWA = p.noWA && p.noWA !== "-" ? p.noWA : "Tidak Ada";

                    let tombolActionHtml = `<span style="color: #94a3b8; font-size: 11px;">WA Tidak Ada</span>`;
                    if (noWA !== "Tidak Ada" && noWA.length >= 8) {
                        // Gunakan replace karakter kutip agar aman saat dimasukkan ke parameter fungsi
                        const namaAman = nama.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        
                        // 🔥 UPGRADE: Prefix window. ditambahkan pada tombol onclick HTML
                        tombolActionHtml = `
                            <button onclick="window.kirimWAUlangTahun('${noWA}', '${namaAman}')" style="background: #25d366; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; font-size: 12px; box-shadow: 0 2px 4px rgba(37, 211, 102, 0.2); transition: 0.2s;">
                                📲 Kirim Voucher WA
                            </button>
                        `;
                    }

                    const tr = document.createElement('tr');
                    tr.style.cssText = "border-bottom: 1px solid #e2e8f0; transition: background 0.2s;";
                    tr.onmouseover = function() { this.style.background = '#f8fafc'; };
                    tr.onmouseout = function() { this.style.background = 'transparent'; };

                    tr.innerHTML = `
                        <td style="padding: 12px 10px; font-weight: bold; color: #1e3c72; border-right: 1px solid #e2e8f0;">${noRM}</td>
                        <td style="padding: 12px 10px; font-weight: 600; color: #0f172a; border-right: 1px solid #e2e8f0;">${nama}</td>
                        <td style="padding: 12px 10px; color: #334155; border-right: 1px solid #e2e8f0;">${tglLahir}</td>
                        <td style="padding: 12px 10px; text-align: center; font-weight: bold; color: #d97706; border-right: 1px solid #e2e8f0;">${umur}</td>
                        <td style="padding: 12px 10px; color: #334155; border-right: 1px solid #e2e8f0;">${noWA}</td>
                        <td style="padding: 12px 10px; text-align: center;">${tombolActionHtml}</td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                window.cacheDataUlangTahun = [];
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align:center; padding: 40px; background: #f8fafc; color: #64748b; font-weight: bold; border-radius: 6px;">
                            🎂 Belum ada data pasien aktif yang tercatat berulang tahun di bulan ini (${namaBulanIndo[bulanSekarangIdx]}).
                        </td>
                    </tr>
                `;
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            if (btnRefresh) btnRefresh.innerHTML = '🔄 Refresh Data';
            console.error("❌ Gagal memuat data ulang tahun:", err);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 30px; color: #c0392b; font-weight: bold;">⚠️ Terjadi kesalahan koneksi saat memuat data dari server. Silakan coba lagi.</td></tr>';
        });
    };

    /**
     * 2. FUNGSI KIRIM WA: Membuka WhatsApp Web/App dengan template ucapan + voucher
     */
    window.kirimWAUlangTahun = function(noWA, namaPasien) {
        if (!noWA || noWA === "-" || noWA === "Tidak Ada") {
            alert("⚠️ Nomor WhatsApp pasien ini tidak valid atau tidak tercatat di database.");
            return;
        }

        let waBersih = String(noWA).replace(/[^0-9]/g, '');
        
        if (waBersih.startsWith('0')) {
            waBersih = '62' + waBersih.slice(1);
        } else if (!waBersih.startsWith('62')) {
            waBersih = '62' + waBersih; 
        }

        const namaBulanIndo = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const bulanSekarang = namaBulanIndo[new Date().getMonth() + 1] || "bulan ini";

        const pesan = `Halo Kak *${namaPasien}*! 🎉\n\n` +
                    `Segenap manajemen dan tim medis *Klinik Anvaya* mengucapkan *Selamat Ulang Tahun*! 🎂✨ Semoga Kakak senantiasa diberikan kesehatan, kebahagiaan, dan kelancaran dalam setiap aktivitas.\n\n` +
                    `🎁 *KADO SPESIAL ULANG TAHUN UNTUK KAKAK*\n` +
                    `Sebagai bentuk apresiasi kami, Kakak mendapatkan *Voucher Diskon 20%* untuk perawatan elektif / estetika di Klinik Anvaya!\n\n` +
                    `📌 *Cara Klaim:* Cukup tunjukkan pesan WhatsApp ini kepada kasir kami saat kunjungan.\n` +
                    `⏳ *Masa Berlaku:* Selama bulan *${bulanSekarang}* ini.\n\n` +
                    `Yuk, reservasi jadwal perawatan Kakak sekarang dan rayakan hari spesial dengan senyuman yang lebih sehat dan cerah! 🏥💖\n\n` +
                    `Salam sehat,\n` +
                    `*Customer Relationship - Klinik Anvaya*`;

        const urlWA = `https://api.whatsapp.com/send?phone=${waBersih}&text=${encodeURIComponent(pesan)}`;
        window.open(urlWA, '_blank');
    };

    /**
     * 3. FUNGSI EKSPOR CSV (VERSI UPGRADE BLOB & URL.createObjectURL ANTI CRASH)
     */
    window.eksporUlangTahunCSV = function() {
        if (!window.cacheDataUlangTahun || window.cacheDataUlangTahun.length === 0) {
            alert("⚠️ Belum ada data pasien ulang tahun yang ditampilkan. Silakan klik tombol [🔄 Refresh Data] terlebih dahulu.");
            return;
        }

        const namaBulanIndo = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const bulanSekarang = namaBulanIndo[new Date().getMonth() + 1] || "Bulan_Ini";
        const tahunSekarang = new Date().getFullYear();

        // 🔥 UPGRADE: Menggunakan Array.join() yang jauh lebih aman & hemat memori untuk file Excel (CSV)
        let csv = [];
        csv.push("No RM,Nama Pasien,Tanggal Lahir,Umur,No WhatsApp");

        window.cacheDataUlangTahun.forEach(p => {
            const rm = `"${String(p.noRM || '').replace(/"/g, '""')}"`;
            const nama = `"${String(p.namaPasien || '').replace(/"/g, '""')}"`;
            const tgl = `"${String(p.tanggalLahirTampil || '').replace(/"/g, '""')}"`;
            const umur = `"${String(p.umur || '').replace(/"/g, '""')}"`;
            
            let wa = p.noWA && p.noWA !== "-" ? String(p.noWA).replace(/[^0-9]/g, '') : "";
            if (wa.startsWith('0')) wa = '62' + wa.slice(1);
            const waCsv = `"${wa}"`;

            csv.push(`${rm},${nama},${tgl},${umur},${waCsv}`);
        });

        // 🔥 UPGRADE: Konversi string CSV ke Blob Object agar kebal crash meskipun berisi 10.000 data
        let csvString = csv.join("\n");
        let blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        let link = document.createElement("a");
        let url = URL.createObjectURL(blob);
        
        link.setAttribute("href", url);
        link.setAttribute("download", `Target_Campaign_Ulang_Tahun_${bulanSekarang}_${tahunSekarang}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log("✔️ [EKSPOR CSV] Berhasil mengunduh data campaign ulang tahun.");
    };

})();