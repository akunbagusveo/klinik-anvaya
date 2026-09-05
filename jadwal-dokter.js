// =========================================================================
// 📅 MODUL KELOLA JADWAL PRAKTIK DOKTER
// =========================================================================
(function() {

    // 1. Variabel Privat Modul untuk menampung data jadwal mentah
    let dataJadwalGlobal = [];

    // =====================================================================
    // 🔥 FUNGSI PEMBANTU: MUAT DROPDOWN DOKTER
    // Mengambil user dengan role Dokter untuk diisi ke opsi pilihan
    // =====================================================================
    window.muatDropdownDokterJadwal = function() {
        const selectDokterModal = document.getElementById('jadwalNamaDokter');
        const selectDokterFilter = document.getElementById('filterJadwalDokter');
        
        // BENTENG PENGAMAN: Jika dropdown filter belum ada di layar, hentikan proses
        if (!selectDokterFilter) return; 

        // 🔥 UX LOADING STATE: Tampilkan status memuat di dropdown
        if (selectDokterModal) selectDokterModal.innerHTML = '<option value="">⏳ Memuat...</option>';
        selectDokterFilter.innerHTML = '<option value="">⏳ Memuat...</option>';

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getUsers" })
        })
        .then(res => {
            // 🔥 LAPIS PROTEKSI: Cek jika server error/mati
            if (!res.ok) throw new Error("Gagal terhubung ke server (Status: " + res.status + ")");
            return res.json();
        })
        .then(res => {
            if (res.result === "success") {
                // Isi pilihan default
                if (selectDokterModal) selectDokterModal.innerHTML = '<option value="">-- Pilih Dokter --</option>';
                selectDokterFilter.innerHTML = '<option value="">Semua Dokter</option>';
                
                const rolesMap = res.rolesMap || {};
                let adaDokterAktif = false; // Penanda jika tidak ada dokter
                
                res.data.forEach(user => {
                    if (user.status === "Aktif") {
                        const roleKey = user.idRole ? user.idRole.toLowerCase() : "";
                        const namaRole = rolesMap[roleKey] || "";
                        
                        // Cek apakah rolenya adalah dokter
                        if (namaRole.toLowerCase().includes("dokter")) {
                            adaDokterAktif = true;
                            // Masukkan ke dropdown modal (tambah jadwal)
                            if (selectDokterModal) {
                                selectDokterModal.innerHTML += `<option value="${user.username}">${user.username} (${user.idUser})</option>`;
                            }
                            // Masukkan ke dropdown filter pencarian tabel
                            selectDokterFilter.innerHTML += `<option value="${user.username}">${user.username}</option>`;
                        }
                    }
                });

                // Jika belum ada user dokter yang terdaftar di sistem
                if (!adaDokterAktif) {
                    if (selectDokterModal) selectDokterModal.innerHTML = '<option value="">Kosong (Belum ada Akun Dokter)</option>';
                    selectDokterFilter.innerHTML = '<option value="">Kosong</option>';
                }

            } else {
                if (selectDokterModal) selectDokterModal.innerHTML = '<option value="">❌ Gagal memuat</option>';
                selectDokterFilter.innerHTML = '<option value="">❌ Gagal memuat</option>';
            }
        })
        .catch(err => {
            console.error("Gagal muat dropdown dokter:", err);
            if (selectDokterModal) selectDokterModal.innerHTML = '<option value="">⚠️ Gangguan koneksi</option>';
            selectDokterFilter.innerHTML = '<option value="">⚠️ Gangguan koneksi</option>';
        });
    };

    // =====================================================================
    // 2. PENARIKAN DATA MASTER JADWAL (DUAL RENDER READY)
    // =====================================================================
    window.currentPageJadwal = 1;
    window.itemsPerPageJadwal = 15; // 15 jadwal per halaman

    window.muatJadwalMaster = function() {
        const wadahPC = document.getElementById('bodyJadwalMasterPC');
        const wadahMobile = document.getElementById('bodyJadwalMasterMobile');
        
        if (wadahPC) wadahPC.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px;">⏳ Memuat seluruh jadwal dokter...</td></tr>`;
        if (wadahMobile) wadahMobile.innerHTML = `<div style="text-align:center; padding:20px; background:#fff; border-radius:8px;">⏳ Memuat jadwal...</div>`;

        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getJadwalMaster" })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                dataJadwalGlobal = res.data || [];
                window.aplikasikanFilterDanSortJadwal(true);
            } else {
                if(wadahPC) wadahPC.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">❌ Gagal memuat data jadwal.</td></tr>`;
                if(wadahMobile) wadahMobile.innerHTML = `<div style="text-align:center; color:red; background:#fff; padding:20px; border-radius:8px;">❌ Gagal memuat data.</div>`;
            }
        })
        .catch(err => {
            console.error(err);
            if(wadahPC) wadahPC.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">⚠️ Gangguan koneksi sistem.</td></tr>`;
        });
    };

    // =====================================================================
    // 3. MESIN PENYARINGAN, PENGURUTAN, & PAGINASI (HYBRID)
    // =====================================================================
    window.aplikasikanFilterDanSortJadwal = function(resetHalaman = false) {
        if (resetHalaman) window.currentPageJadwal = 1;
        if (!window.currentPageJadwal) window.currentPageJadwal = 1;

        const wadahPC = document.getElementById('bodyJadwalMasterPC');
        const wadahMobile = document.getElementById('bodyJadwalMasterMobile');
        const paginationDiv = document.getElementById('paginationControlsJadwal');
        
        if (wadahPC) wadahPC.innerHTML = "";
        if (wadahMobile) wadahMobile.innerHTML = "";

        const filterDokter = document.getElementById('filterJadwalDokter') ? document.getElementById('filterJadwalDokter').value : ""; 
        const filterHari = document.getElementById('filterJadwalHari') ? document.getElementById('filterJadwalHari').value : "";
        const filterSlot = document.getElementById('filterJadwalSlot') ? document.getElementById('filterJadwalSlot').value : "";
        const opsiUrutan = document.getElementById('urutJadwalMaster') ? document.getElementById('urutJadwalMaster').value : "hariUrut"; // Default urut hari

        // --- FILTER ---
        let dataHasilFilter = dataJadwalGlobal.filter(jdw => {
            const cocokNama = filterDokter === "" || (jdw.dokter || "") === filterDokter;
            const cocokHari = filterHari === "" || (jdw.hari || "") === filterHari;
            const cocokSlot = filterSlot === "" || (jdw.slot || "") === filterSlot;
            return cocokNama && cocokHari && cocokSlot;
        });

        // --- SORTING ---
        if (opsiUrutan === "namaAZ") {
            dataHasilFilter.sort((a, b) => (a.dokter || "").localeCompare(b.dokter || ""));
        } else if (opsiUrutan === "namaZA") {
            dataHasilFilter.sort((a, b) => (b.dokter || "").localeCompare(a.dokter || ""));
        } else if (opsiUrutan === "hariUrut") {
            dataHasilFilter.sort((a, b) => konversiHariKeAngka(a.hari || "") - konversiHariKeAngka(b.hari || ""));
        } else if (opsiUrutan === "jamKerja") {
            dataHasilFilter.sort((a, b) => (a.jamMulai || "").localeCompare(b.jamMulai || ""));
        }

        if (dataHasilFilter.length === 0) {
            if (wadahPC) wadahPC.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color:#7f8c8d; font-weight:bold;">Data jadwal tidak ditemukan.</td></tr>`;
            if (wadahMobile) wadahMobile.innerHTML = `<div style="text-align:center; padding: 20px; background:#fff; border-radius:8px; color:#7f8c8d; font-weight:bold;">Data tidak ditemukan.</div>`;
            if (paginationDiv) paginationDiv.innerHTML = '';
            return;
        }

        // --- PAGINATION SLICE ---
        const totalPages = Math.ceil(dataHasilFilter.length / window.itemsPerPageJadwal) || 1;
        if (window.currentPageJadwal > totalPages) window.currentPageJadwal = totalPages;
        
        const startIndex = (window.currentPageJadwal - 1) * window.itemsPerPageJadwal;
        const endIndex = startIndex + window.itemsPerPageJadwal;
        const paginatedItems = dataHasilFilter.slice(startIndex, endIndex);

        // --- RENDER KE PC & MOBILE ---
        paginatedItems.forEach(jdw => {
            let badgeSlot = `<span style="background:#e8f8f5; color:#1abc9c; padding:3px 8px; border-radius:10px; font-size:11px; font-weight:bold;">${jdw.slot || "-"}</span>`;
            if(jdw.slot === "Sore/Malam") badgeSlot = `<span style="background:#fef5e7; color:#e67e22; padding:3px 8px; border-radius:10px; font-size:11px; font-weight:bold;">${jdw.slot || "-"}</span>`;

            // Wujud PC
            if (wadahPC) {
                let row = `<tr style="border-bottom: 1px solid #eee; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px; font-weight:bold; color:#2c3e50;">👨‍⚕️ ${jdw.dokter || "-"}</td>
                    <td style="padding: 12px; color:#34495e; font-weight:500;">📅 ${jdw.hari || "-"}</td>
                    <td style="padding: 12px; color:#7f8c8d;">⏱️ ${jdw.jamMulai || ""} - ${jdw.jamSelesai || ""}</td>
                    <td style="padding: 12px;">${badgeSlot}</td>
                    <td style="padding: 12px; text-align: center;">
                        <button onclick="window.hapusJadwal('${jdw.idJadwal}', ${jdw.barisSheet})" style="background:#e74c3c; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.1);">🗑️ Hapus</button>
                    </td>
                </tr>`;
                wadahPC.innerHTML += row;
            }

            // Wujud Mobile (Accordion Card)
            if (wadahMobile) {
                let card = document.createElement('div');
                card.style.cssText = "background:#fff; border:1px solid #e0e0e0; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.02); overflow:hidden;";
                card.innerHTML = `
                    <div onclick="window.toggleAccordionJadwal(this)" style="padding:15px; background:#fbfcfc; display:flex; justify-content:space-between; align-items:flex-start; cursor:pointer; border-bottom:1px solid transparent;">
                        <div>
                            <div style="font-weight:bold; color:#2980b9; font-size:15px; margin-bottom:4px;">👨‍⚕️ ${jdw.dokter || "-"}</div>
                            <div style="font-size:12px; color:#7f8c8d; font-weight:bold;">${jdw.hari || "-"} • ${badgeSlot}</div>
                        </div>
                        <div style="display:flex; align-items:center; padding-top: 5px;">
                            <span class="acc-icon-jdw" style="font-size:16px; color:#95a5a6; transition: transform 0.3s; font-weight:bold;">▼</span>
                        </div>
                    </div>
                    <div style="display:none; padding:15px; border-top:1px solid #ecf0f1; background:#fff;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-size:13px;">
                            <span style="color:#7f8c8d;">Jam Kerja:</span> <strong style="color:#2c3e50;">⏱️ ${jdw.jamMulai || ""} - ${jdw.jamSelesai || ""}</strong>
                        </div>
                        <button onclick="window.hapusJadwal('${jdw.idJadwal}', ${jdw.barisSheet})" style="width:100%; background:#e74c3c; color:white; border:none; padding:12px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:14px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">🗑️ Hapus Jadwal</button>
                    </div>
                `;
                wadahMobile.appendChild(card);
            }
        });

        window.renderKontrolPaginasiJadwal(totalPages, window.currentPageJadwal);
    };

    // Fungsi Bantu (Privat) - Jangan diubah
    function konversiHariKeAngka(hari) {
        const daftarHari = { "Senin": 1, "Selasa": 2, "Rabu": 3, "Kamis": 4, "Jumat": 5, "Sabtu": 6, "Minggu": 7 };
        return daftarHari[hari] || 99; 
    }

    // =====================================================================
    // 3.1 KONTROL PAGINASI & ANIMASI KLIK
    // =====================================================================
    window.renderKontrolPaginasiJadwal = function(totalPages, currentPage) {
        const wadah = document.getElementById('paginationControlsJadwal');
        if (!wadah) return;
        wadah.innerHTML = '';
        if (totalPages <= 1) return; 

        const btnPrev = document.createElement('button');
        btnPrev.className = 'btn-page-jdw';
        btnPrev.innerText = '« Prev';
        btnPrev.disabled = currentPage === 1;
        btnPrev.onclick = () => { window.currentPageJadwal--; window.aplikasikanFilterDanSortJadwal(false); };
        wadah.appendChild(btnPrev);

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                const btnNum = document.createElement('button');
                btnNum.className = 'btn-page-jdw' + (i === currentPage ? ' active' : '');
                btnNum.innerText = i;
                btnNum.onclick = () => { window.currentPageJadwal = i; window.aplikasikanFilterDanSortJadwal(false); };
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
        btnNext.className = 'btn-page-jdw';
        btnNext.innerText = 'Next »';
        btnNext.disabled = currentPage === totalPages;
        btnNext.onclick = () => { window.currentPageJadwal++; window.aplikasikanFilterDanSortJadwal(false); };
        wadah.appendChild(btnNext);
    };

    window.toggleAccordionJadwal = function(headerElement) {
        const cardBody = headerElement.nextElementSibling;
        const icon = headerElement.querySelector('.acc-icon-jdw');
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
    // 4. PENAMBAHAN & PENGHAPUSAN JADWAL
    // =====================================================================
    window.simpanJadwalBaru = function() {
        if (!window.tokenJadwalDokter) {
            window.tokenJadwalDokter = "JDW-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000);
        }

        const payload = {
            action: "tambahJadwalDokter",
            tokenId: window.tokenJadwalDokter, 
            dokter: document.getElementById('jadwalNamaDokter').value.trim(),
            hari: document.getElementById('jadwalHari').value,
            jamMulai: document.getElementById('jadwalJamMulai').value.trim(),
            jamSelesai: document.getElementById('jadwalJamSelesai').value.trim(),
            slot: document.getElementById('jadwalSlot').value
        };

        if(!payload.dokter || !payload.jamMulai || !payload.jamSelesai) {
            alert("Semua data jadwal wajib diisi lengkap!");
            return;
        }

        // 🔥 FIX BROWSER EVENT: Menangkap tombol Submit dengan Aman
        let btnSubmit = (window.event && window.event.target) ? window.event.target : null;
        if (!btnSubmit || btnSubmit.tagName !== 'BUTTON') {
            btnSubmit = document.querySelector('#modalTambahJadwal button[onclick*="simpanJadwalBaru"]');
        }

        const teksAsli = btnSubmit ? btnSubmit.innerText : "Simpan";
        if (btnSubmit) {
            btnSubmit.innerText = "Menyimpan... ⏳";
            btnSubmit.disabled = true;
        }

        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
        .then(res => res.json())
        .then(res => {
            if(res.result === "success") {
                alert("🎉 Jadwal praktik dokter berhasil ditambahkan!");
                window.tokenJadwalDokter = null; 
                window.tutupModalJadwal(); 
                window.muatJadwalMaster(); 
            } else {
                alert("Gagal: " + res.message);
            }
        })
        .catch(err => {
            console.error(err);
            if (btnSubmit) btnSubmit.innerText = "Koneksi Terputus...";
            alert("⚠️ KONEKSI TERPUTUS!\n\nJadwal Anda kemungkinan sudah masuk. Sistem akan menutup formulir dan memuat ulang tabel untuk memastikannya.");
            window.tutupModalJadwal();
            window.muatJadwalMaster();
        })
        .finally(() => {
            setTimeout(() => {
                if (btnSubmit) {
                    btnSubmit.innerText = teksAsli;
                    btnSubmit.disabled = false;
                }
            }, 3000);
        });
    };

    window.hapusJadwal = function(idJdw, baris) {
        if(confirm(`Apakah Anda yakin ingin menghapus kode jadwal ${idJdw}?`)) {
            
            // 🔥 TAMBAHAN: Layar Hitam Loading
            if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Menghapus Jadwal...");

            fetch(WEB_APP_URL, {
                method: "POST",
                body: JSON.stringify({ action: "hapusJadwalDokter", barisSheet: baris })
            })
            .then(res => res.json())
            .then(res => {
                if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
                if(res.result === "success") {
                    alert("Jadwal telah berhasil dihapus dari sistem!");
                    window.muatJadwalMaster();
                } else {
                    alert("Gagal menghapus jadwal: " + (res.message || "Kesalahan sistem"));
                }
            })
            .catch(err => {
                if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
                alert("⚠️ Koneksi terputus. Tabel akan dimuat ulang.");
                window.muatJadwalMaster();
            });
        }
    };

    // =====================================================================
    // 5. KONTROL TAMPILAN MODAL
    // =====================================================================
    window.bukaModalJadwal = function() {
        const modal = document.getElementById('modalTambahJadwal');
        if (modal) modal.style.display = 'flex';
        
        // Peringatan Keamanan
        if (typeof window.muatDropdownDokterJadwal === "function") {
            window.muatDropdownDokterJadwal(); 
        } else {
            console.warn("⚠️ Fungsi muatDropdownDokterJadwal tidak ditemukan! Pastikan fungsi ini ada di file lain (misal: user.js atau app.js).");
        }
    };

    window.tutupModalJadwal = function() {
        const modal = document.getElementById('modalTambahJadwal');
        if (modal) modal.style.display = 'none';
    };

})();