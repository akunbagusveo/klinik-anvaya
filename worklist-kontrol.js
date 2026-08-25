// =========================================================================
// 🔔 MODUL WORKLIST PENGINGAT KONTROL (FOLLOW-UP PASIEN)
// =========================================================================
(function() {

    // 1. Variabel Privat untuk menampung data sementara (Super Cepat / Zero-Lag Filter)
    let rawDataKontrol = []; 

    // =====================================================================
    // 2. FUNGSI PENARIKAN DATA DARI SERVER
    // =====================================================================
    window.muatDataPengingat = function() {
        const tbody = document.getElementById('tabelPengingatBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Menarik data dari server... ⏳</td></tr>';
        }

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getJadwalKontrol" })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                rawDataKontrol = res.data || [];
                window.renderTabelPengingat(); // Lanjut merender tabel sesuai filter
            } else {
                if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Gagal: ${res.message}</td></tr>`;
            }
        })
        .catch(err => {
            console.error("Error muat pengingat:", err);
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Koneksi jaringan terputus.</td></tr>`;
        });
    };

    // =====================================================================
    // 3. FUNGSI PERENDER TABEL (DENGAN FILTER TANGGAL OTOMATIS)
    // =====================================================================
    window.renderTabelPengingat = function() {
        const filterEl = document.getElementById('filterWaktuKontrol');
        const filter = filterEl ? filterEl.value : "semua";
        const tbody = document.getElementById('tabelPengingatBody');
        
        if (!tbody) return;
        
        // Alat Bantu Pencetak Format Tanggal (YYYY-MM-DD)
        const formatYMD = (d) => {
            let month = '' + (d.getMonth() + 1), day = '' + d.getDate(), year = d.getFullYear();
            if (month.length < 2) month = '0' + month;
            if (day.length < 2) day = '0' + day;
            return [year, month, day].join('-');
        };

        const hariIni = new Date();
        const strHariIni = formatYMD(hariIni);
        
        const besok = new Date(hariIni);
        besok.setDate(besok.getDate() + 1);
        const strBesok = formatYMD(besok);
        
        const mingguDepan = new Date(hariIni);
        mingguDepan.setDate(mingguDepan.getDate() + 7);
        const strMingguDepan = formatYMD(mingguDepan);

        // 🔥 LOGIKA FILTER DINAMIS LOKAL (TANPA LOADING SERVER)
        let dataTerfilter = rawDataKontrol.filter(item => {
            let isSelesai = (item.status || "").toLowerCase() === "telah datang (selesai)";
            
            // 1. Jika pengguna memilih "Riwayat Kontrol Selesai", HANYA tampilkan yang sudah datang!
            if (filter === "selesai") return isSelesai;
            
            // 2. Untuk filter tugas lainnya (Hari Ini, Besok, dll), SEMBUNYIKAN yang sudah datang agar antrean kerja bersih!
            if (isSelesai) return false;
            
            if (filter === "hari_ini") return item.tanggal === strHariIni;
            if (filter === "besok") return item.tanggal === strBesok;
            if (filter === "minggu_depan") return item.tanggal >= strHariIni && item.tanggal <= strMingguDepan;
            return true; // Jika filter "semua"
        });

        if (dataTerfilter.length === 0) {
            let pesanKosong = filter === "selesai" ? 
                '📭 Belum ada riwayat pasien kontrol yang selesai/datang.' : 
                '🎉 Yeay! Tidak ada tugas pengingat kontrol untuk jadwal ini.';
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#7f8c8d; padding:30px;">${pesanKosong}</td></tr>`;
            return;
        }

        let html = "";
        dataTerfilter.forEach(item => {
            let bgRow = (item.tanggal === strHariIni && filter !== "selesai") ? "#fff3cd" : "transparent"; 
            
            // 🔥 VISUALISASI STATUS & TOMBOL AKSI PINTAR
            let badgeStatus, tombolAksi;
            let statusItem = (item.status || "").toLowerCase();
            
            if (statusItem === "telah datang (selesai)") {
                // Tampilan khusus untuk pasien yang sudah datang (Tombol WA dinonaktifkan)
                badgeStatus = `<span style="background:#2980b9; color:#fff; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:bold;">🏁 Telah Datang</span>`;
                tombolAksi = `<button disabled style="background:#bdc3c7; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-size:12px; font-weight:bold; cursor:not-allowed;">✔️ Selesai</button>`;
            } else if (item.status === "Menunggu") {
                badgeStatus = `<span style="background:#f39c12; color:#fff; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:bold;">⏳ Menunggu</span>`;
                let amanPesan = (item.pesan || "").replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/(\r\n|\n|\r)/gm, "\\n");
                let amanNama = (item.namaPasien || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
                tombolAksi = `<button onclick="window.kirimWaKontrol('${item.noWA}', '${amanNama}', '${item.tanggal}', '${amanPesan}', ${item.row})" style="background:#25D366; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><i style="font-style:normal;">📲</i> Hubungi via WA</button>`;
            } else {
                badgeStatus = `<span style="background:#27ae60; color:#fff; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:bold;">✅ Di-WA</span>`;
                let amanPesan = (item.pesan || "").replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/(\r\n|\n|\r)/gm, "\\n");
                let amanNama = (item.namaPasien || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");
                tombolAksi = `<button onclick="window.kirimWaKontrol('${item.noWA}', '${amanNama}', '${item.tanggal}', '${amanPesan}', ${item.row})" style="background:#25D366; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><i style="font-style:normal;">📲</i> Hubungi via WA</button>`;
            }

            let pesanTabel = (item.pesan || "").replace(/\n/g, '<br>');

            html += `
                <tr style="background-color: ${bgRow}; transition: 0.3s;">
                    <td style="font-weight:bold; color:#c0392b;">${item.tanggal}</td>
                    <td>${item.noRM || "-"}</td>
                    <td style="font-weight:bold; color:#2c3e50;">${item.namaPasien || "-"}</td>
                    <td>${item.noWA || "-"}</td>
                    <td style="color:#555;"><small>${pesanTabel}</small></td>
                    <td style="text-align:center;">${badgeStatus}</td>
                    <td style="text-align:center;">${tombolAksi}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    };

    // =====================================================================
    // 4. EKSEKUTOR MAGIC WHATSAPP & UPDATE STATUS 
    // =====================================================================
    window.kirimWaKontrol = function(noWA, namaPasien, tanggal, pesan, rowSheet) {
        if (!noWA || noWA === "-" || noWA === "") {
            alert("⚠️ Nomor WhatsApp pasien tidak ditemukan di database!");
            return;
        }

        // 1. Format Nomor Telepon Pintar (Anti-0-Hilang)
        let noWaBersih = noWA.toString().trim().replace(/\D/g, '');
        if (noWaBersih.startsWith('0')) {
            noWaBersih = '62' + noWaBersih.substring(1);
        } else if (noWaBersih.startsWith('8')) {
            noWaBersih = '62' + noWaBersih;
        }

        // 2. Merakit Template 
        let teksPesan = `Halo Kak ${namaPasien}, 👋\n\nIni dari *Klinik Anvaya*. Mengingatkan bahwa jadwal kontrol gigi kakak sudah dekat.\n\n${pesan}\n\nApakah kakak ingin dibantu reservasi jam kedatangannya? 😊`;
        
        // 3. Eksekusi Buka WhatsApp Web
        let linkWA = `https://api.whatsapp.com/send?phone=${noWaBersih}&text=${encodeURIComponent(teksPesan)}`;
        window.open(linkWA, '_blank');

        // 4. Diam-diam update status di Database
        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "updateStatusKontrol",
                row: rowSheet,
                statusBaru: "Sudah Di-WA"
            })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                setTimeout(() => {
                    window.muatDataPengingat(); // Refresh tabel setelah WA sukses diupdate
                }, 2000);
            }
        })
        .catch(err => console.error("Gagal update status otomatis", err));
    };

})();