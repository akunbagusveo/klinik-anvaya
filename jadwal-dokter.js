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
    // 2. PENARIKAN DATA MASTER JADWAL
    // =====================================================================
    window.muatJadwalMaster = function() {
        const tbody = document.getElementById('bodyJadwalMaster');
        
        if (!tbody) {
            console.warn("Elemen #bodyJadwalMaster belum dimuat atau tidak ditemukan di tab ini.");
            return; 
        }

        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">⏳ Memuat seluruh jadwal dokter...</td></tr>`;

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getJadwalMaster" })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                dataJadwalGlobal = res.data || [];
                window.aplikasikanFilterDanSortJadwal();
            } else {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">❌ Gagal memuat data jadwal.</td></tr>`;
            }
        })
        .catch(err => {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">⚠️ Gangguan koneksi sistem.</td></tr>`;
        });
    };

    // =====================================================================
    // 3. MESIN PENYARINGAN & PENGURUTAN (REAL-TIME FRONTEND)
    // =====================================================================
    window.aplikasikanFilterDanSortJadwal = function() {
        const tbody = document.getElementById('bodyJadwalMaster');
        if (!tbody) return;
        
        const filterDokter = document.getElementById('filterJadwalDokter') ? document.getElementById('filterJadwalDokter').value : ""; 
        const filterHari = document.getElementById('filterJadwalHari') ? document.getElementById('filterJadwalHari').value : "";
        const filterSlot = document.getElementById('filterJadwalSlot') ? document.getElementById('filterJadwalSlot').value : "";
        const opsiUrutan = document.getElementById('urutJadwalMaster') ? document.getElementById('urutJadwalMaster').value : "";

        // --- PROSES 1: PENYARINGAN (FILTER) DENGAN PROTEKSI DATA ---
        let dataHasilFilter = dataJadwalGlobal.filter(jdw => {
            const namaDokterJadwal = jdw.dokter || "";
            const hariJadwal = jdw.hari || "";
            const slotJadwal = jdw.slot || "";

            const cocokNama = filterDokter === "" || namaDokterJadwal === filterDokter;
            const cocokHari = filterHari === "" || hariJadwal === filterHari;
            const cocokSlot = filterSlot === "" || slotJadwal === filterSlot;

            return cocokNama && cocokHari && cocokSlot;
        });

        // --- PROSES 2: PENGURUTAN (SORTING) ---
        if (opsiUrutan === "namaAZ") {
            dataHasilFilter.sort((a, b) => (a.dokter || "").localeCompare(b.dokter || ""));
        } else if (opsiUrutan === "namaZA") {
            dataHasilFilter.sort((a, b) => (b.dokter || "").localeCompare(a.dokter || ""));
        } else if (opsiUrutan === "hariUrut") {
            dataHasilFilter.sort((a, b) => konversiHariKeAngka(a.hari || "") - konversiHariKeAngka(b.hari || ""));
        } else if (opsiUrutan === "jamKerja") {
            dataHasilFilter.sort((a, b) => (a.jamMulai || "").localeCompare(b.jamMulai || ""));
        }

        // --- PROSES 3: RENDERING DATA KE TABEL ---
        tbody.innerHTML = "";
        if (dataHasilFilter.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 15px;">Data jadwal tidak ditemukan.</td></tr>`;
            return;
        }

        dataHasilFilter.forEach(jdw => {
            let row = `<tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 8px;"><strong>${jdw.dokter || "-"}</strong></td>
                <td style="padding: 8px;">${jdw.hari || "-"}</td>
                <td style="padding: 8px;">${jdw.jamMulai || ""} - ${jdw.jamSelesai || ""}</td>
                <td style="padding: 8px;"><span style="background:#e2e3e5; padding:3px 8px; border-radius:10px; font-size:12px;">${jdw.slot || "-"}</span></td>
                <td style="padding: 8px; text-align: center;">
                    <button onclick="window.hapusJadwal('${jdw.idJadwal}', ${jdw.barisSheet})" style="background:#dc3545; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">Hapus</button>
                </td>
            </tr>`;
            tbody.innerHTML += row;
        });
    };

    // Fungsi Bantu (Privat) - Tidak perlu di-expose ke window
    function konversiHariKeAngka(hari) {
        const daftarHari = { "Senin": 1, "Selasa": 2, "Rabu": 3, "Kamis": 4, "Jumat": 5, "Sabtu": 6, "Minggu": 7 };
        return daftarHari[hari] || 99; 
    }

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