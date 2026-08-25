// =========================================================================
// 📜 MODUL LOG AKTIVITAS SISTEM (AUDIT TRAIL)
// =========================================================================
(function() {

    // 1. Variabel Privat Modul (Aman dari bentrokan file lain)
    let currentLogPage = 1;
    const logLimit = 50; 

    // =====================================================================
    // 2. FUNGSI UTAMA PENARIKAN DATA LOG
    // =====================================================================
    window.muatLogAktivitas = function(page = 1) {
        currentLogPage = page; 
        
        const tbody = document.getElementById('bodyLogAktivitas');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 15px;">⏳ Membaca log aktivitas halaman ${page}...</td></tr>`;
        }

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ 
                action: "getLogAktivitas", 
                page: currentLogPage,
                limit: logLimit 
            })
        })
        .then(res => {
            // 🔥 LAPIS PROTEKSI: Cek jika server error/mati
            if (!res.ok) throw new Error("Gagal terhubung ke server (Status: " + res.status + ")");
            return res.json();
        })
        .then(res => {
            if (res.result === "success") {
                if (!tbody) return;
                tbody.innerHTML = "";
                
                // Jika data kosong
                if (!res.data || res.data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 15px;">Belum ada log aktivitas yang tercatat.</td></tr>`;
                    const infoPaging = document.getElementById('logPaginationInfo');
                    const btnPaging = document.getElementById('logPaginationButtons');
                    
                    if(infoPaging) infoPaging.innerText = "Menampilkan halaman 0 dari 0";
                    if(btnPaging) btnPaging.innerHTML = "";
                    return;
                }

                // Render isi baris log ke tabel secara dinamis
                res.data.forEach(log => {
                    let badgeColor = "#e9ecef";
                    let textColor = "#2c3e50";
                    
                    const aksiUpper = (log.aksi || "").toUpperCase();
                    if (aksiUpper.includes("CREATE") || aksiUpper.includes("TAMBAH") || aksiUpper.includes("SIMPAN")) {
                        badgeColor = "#d4edda"; textColor = "#155724";
                    } else if (aksiUpper.includes("UPDATE") || aksiUpper.includes("EDIT") || aksiUpper.includes("UBAH")) {
                        badgeColor = "#fff3cd"; textColor = "#856404";
                    } else if (aksiUpper.includes("DELETE") || aksiUpper.includes("HAPUS")) {
                        badgeColor = "#f8d7da"; textColor = "#721c24";
                    }

                    tbody.innerHTML += `<tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px; white-space: nowrap; color: #555;">${log.waktu || '-'}</td>
                        <td style="padding: 8px; font-weight: bold; color: #2c3e50;">${log.username || '-'}</td>
                        <td style="padding: 8px;">${log.role || '-'}</td>
                        <td style="padding: 8px;">${log.modul || '-'}</td>
                        <td style="padding: 8px;"><span style="background:${badgeColor}; color:${textColor}; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;">${log.aksi || '-'}</span></td>
                        <td style="padding: 8px; line-height: 1.4;">${log.detail || '-'}</td>
                    </tr>`;
                });

                // Sinkronisasi status info halaman
                const infoPaging = document.getElementById('logPaginationInfo');
                if(infoPaging) {
                    infoPaging.innerText = `Menampilkan halaman ${res.currentPage} dari ${res.totalPages}`;
                }
                
                // Panggil perender tombol navigasi (Fungsi Privat)
                renderLogPagination(res.totalPages, res.currentPage);

            } else {
                if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Gagal memuat log: ${res.message}</td></tr>`;
            }
        })
        .catch(err => {
            console.error("Error muat log:", err);
            if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Terjadi gangguan koneksi internet.</td></tr>`;
        });
    };

    // =====================================================================
    // 3. FUNGSI PRIVAT: RENDER TOMBOL PAGINATION
    // (Tidak diekspos ke window karena hanya dipanggil secara internal)
    // =====================================================================
    function renderLogPagination(totalPages, currentPage) {
        const container = document.getElementById('logPaginationButtons');
        
        // WAJIB dikosongkan agar tombol tidak bertumpuk/ganda saat pindah halaman
        if (!container) return; 
        container.innerHTML = ""; 
        
        if (totalPages === 0) return;

        const halAktif = currentLogPage;

        // ==========================================
        // TOMBOL PREVIOUS (MUNDUR 1 HALAMAN)
        // ==========================================
        const btnPrev = document.createElement('button');
        btnPrev.innerText = "◀ Prev";
        btnPrev.disabled = halAktif === 1;
        btnPrev.style.padding = "6px 12px";
        btnPrev.style.marginRight = "5px";
        btnPrev.style.borderRadius = "4px";
        btnPrev.style.border = "1px solid #ddd";
        btnPrev.style.cursor = halAktif === 1 ? "not-allowed" : "pointer";
        btnPrev.style.background = halAktif === 1 ? "#f5f5f5" : "white";
        btnPrev.style.color = halAktif === 1 ? "#ccc" : "#2c3e50"; 
        
        btnPrev.onclick = () => window.muatLogAktivitas(halAktif - 1); 
        container.appendChild(btnPrev);

        // ==========================================
        // RENDER ANGKA HALAMAN (MAKSIMAL 5 TOMBOL)
        // ==========================================
        let startPage = Math.max(1, halAktif - 2);
        let endPage = Math.min(totalPages, startPage + 4);
        if (endPage - startPage < 4) {
            startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            const btnPage = document.createElement('button');
            btnPage.innerText = i;
            btnPage.style.padding = "6px 12px";
            btnPage.style.marginRight = "5px";
            btnPage.style.borderRadius = "4px";
            btnPage.style.border = "1px solid #ddd";
            
            if (i === halAktif) {
                // Tampilan Tombol Halaman Aktif (Biru)
                btnPage.style.backgroundColor = "#3498db";
                btnPage.style.color = "white";
                btnPage.style.fontWeight = "bold";
                btnPage.style.cursor = "default";
                btnPage.disabled = true; 
            } else {
                // Tampilan Tombol Halaman Alternatif
                btnPage.style.backgroundColor = "white";
                btnPage.style.color = "#2c3e50"; 
                btnPage.style.cursor = "pointer";
                btnPage.onclick = () => window.muatLogAktivitas(i); 
            }
            container.appendChild(btnPage);
        }

        // ==========================================
        // TOMBOL NEXT (MAJU 1 HALAMAN)
        // ==========================================
        const btnNext = document.createElement('button');
        btnNext.innerText = "Next ▶";
        btnNext.disabled = halAktif === totalPages;
        btnNext.style.padding = "6px 12px";
        btnNext.style.borderRadius = "4px";
        btnNext.style.border = "1px solid #ddd";
        btnNext.style.cursor = halAktif === totalPages ? "not-allowed" : "pointer";
        btnNext.style.background = halAktif === totalPages ? "#f5f5f5" : "white";
        btnNext.style.color = halAktif === totalPages ? "#ccc" : "#2c3e50"; 
        btnNext.onclick = () => window.muatLogAktivitas(halAktif + 1); 
        container.appendChild(btnNext);
    }

})();