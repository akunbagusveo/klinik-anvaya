// =========================================================================
// 🗂️ MODUL PENCARIAN & MANAJEMEN DATABASE PASIEN (TERKONSOLIDASI)
// =========================================================================
(function() {

    // =====================================================================
    // 1. VARIABEL PRIVAT MODUL
    // =====================================================================
    // Variabel Tab 1 (Pencarian Riwayat Global)
    window.cacheRiwayatGlobal = [];
    let currentRiwayatPage = 1;
    const riwayatPageSize = 10; // 🔥 UPGRADE: Disamakan menjadi 10 agar proporsi tabel seimbang
    let totalRiwayatPages = 1;

    // Variabel Tab 2 (Database Utama)
    let halamanSekarangPasien = 1;
    const ukuranHalamanPasien = 10; 
    let kataKunciPasien = "";

    // =====================================================================
    // 2. FUNGSI TAB 1: PENCARIAN RIWAYAT GLOBAL
    // =====================================================================
    window.cariPasienGlobal = function() {
        const elInput = document.getElementById('txtCariRiwayatGlobal');
        if (!elInput) return;

        const keyword = elInput.value.trim().toLowerCase();
        
        if (!keyword || keyword.length < 1) {
            alert("Silakan ketik minimal 1 huruf/angka nama atau No RM pasien yang ingin dicari.");
            return;
        }

        const boxDaftar = document.getElementById('boxDaftarPasienGlobal');
        if (boxDaftar) boxDaftar.style.display = 'block';
        
        const tbody = document.getElementById('tabelDaftarPasienBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; font-weight: bold; color: #0369a1;">⏳ Mengambil data dari Master Pasien...</td></tr>';
        }

        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Mencari Pasien di Database...");

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getDaftarPasien" })
        })
        .then(res => res.json())
        .then(res => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();

            if (res.result === "success" && res.data && res.data.length > 0) {
                
                // OMNI-FILTER: Saring data pasien berdasarkan kata kunci
                const hasilFilter = res.data.filter(p => {
                    const teksPasien = `${p.noRM || ''} ${p.namaPasien || ''} ${p.noWA || ''} ${p.noKTP || ''}`.toLowerCase();
                    return teksPasien.includes(keyword);
                });

                if (hasilFilter.length > 0) {
                    window.cacheRiwayatGlobal = hasilFilter; 
                    currentRiwayatPage = 1;        
                    window.tampilkanRiwayatGlobal();     
                } else {
                    window.cacheRiwayatGlobal = [];
                    window.tampilkanRiwayatGlobal();
                    
                    if (tbody) {
                        tbody.innerHTML = `
                            <tr>
                                <td colspan="6" style="text-align:center; padding: 30px; background: #fef2f2; color: #991b1b; border-radius: 6px;">
                                    ❌ Pasien dengan kata kunci <strong>"${elInput.value}"</strong> tidak ditemukan di Master Pasien.<br>
                                    <small style="color:#7f1d1d; font-weight:normal; margin-top:5px; display:block;">
                                        💡 Tips: Coba ketik angkanya saja (misal: <strong>0003</strong>) atau potongan nama (misal: <strong>ayam</strong>).
                                    </small>
                                </td>
                            </tr>
                        `;
                    }
                }
            } else {
                window.cacheRiwayatGlobal = [];
                window.tampilkanRiwayatGlobal();
                if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#e74c3c; padding: 20px;">❌ Data Master Pasien di server kosong.</td></tr>';
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#e74c3c; padding: 20px;">⚠️ Gagal terhubung ke server. Periksa koneksi internet Anda.</td></tr>';
            console.error("Error cariPasienGlobal:", err);
        });
    };

    window.tampilkanRiwayatGlobal = function() {
        const tbody = document.getElementById('tabelDaftarPasienBody');
        if (!tbody) return;
        tbody.innerHTML = "";
        
        if (!window.cacheRiwayatGlobal || window.cacheRiwayatGlobal.length === 0) {
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
            setVal('lblTotalDataMasterRiwayat', "0");
            setVal('lblTotalDataTampilRiwayat', "0");
            setVal('lblHalamanRiwayat', "Halaman 0 dari 0");
            
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#e74c3c; font-weight:bold; padding: 20px;">❌ Pasien tidak ditemukan dalam database.</td></tr>';
            return;
        }

        let headerMaster = [];
        let dataPasienMurni = window.cacheRiwayatGlobal;

        if (window.cacheRiwayatGlobal.length > 0 && Array.isArray(window.cacheRiwayatGlobal[0])) {
            const cekBarisPertama = window.cacheRiwayatGlobal[0].map(h => h.toString().toLowerCase().trim());
            if (cekBarisPertama.includes("no rm") || cekBarisPertama.includes("nama pasien")) {
                headerMaster = cekBarisPertama;
                dataPasienMurni = window.cacheRiwayatGlobal.slice(1); 
            }
        }

        if (headerMaster.length === 0 && typeof window.cacheMasterPasien !== "undefined" && window.cacheMasterPasien && window.cacheMasterPasien.length > 0 && Array.isArray(window.cacheMasterPasien[0])) {
            headerMaster = window.cacheMasterPasien[0].map(h => h.toString().toLowerCase().trim());
        }

        if (headerMaster.length === 0) {
            headerMaster = ["no rm", "nama pasien", "tempat lahir", "tanggal lahir", "gender", "whatsapp", "pekerjaan", "email", "alamat lengkap", "ktp", "status"];
        }

        const totalData = dataPasienMurni.length;
        totalRiwayatPages = Math.ceil(totalData / riwayatPageSize) || 1;
        
        if (currentRiwayatPage > totalRiwayatPages) currentRiwayatPage = totalRiwayatPages;
        if (currentRiwayatPage < 1) currentRiwayatPage = 1;
        
        const start = (currentRiwayatPage - 1) * riwayatPageSize;
        const end = Math.min(start + riwayatPageSize, totalData);
        const dataHalaman = dataPasienMurni.slice(start, end);
        
        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
        setVal('lblTotalDataMasterRiwayat', totalData);
        setVal('lblTotalDataTampilRiwayat', dataHalaman.length);
        setVal('lblHalamanRiwayat', `Halaman ${currentRiwayatPage} dari ${totalRiwayatPages}`);
        
        const btnPrev = document.getElementById('btnPrevRiwayat');
        const btnNext = document.getElementById('btnNextRiwayat');
        if (btnPrev) {
            btnPrev.disabled = (currentRiwayatPage === 1);
            btnPrev.style.opacity = btnPrev.disabled ? "0.5" : "1";
        }
        if (btnNext) {
            btnNext.disabled = (currentRiwayatPage === totalRiwayatPages);
            btnNext.style.opacity = btnNext.disabled ? "0.5" : "1";
        }

        if (dataHalaman.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#e74c3c; font-weight:bold; padding: 20px;">❌ Pasien tidak ditemukan dalam database.</td></tr>';
            return;
        }

        const idxNoRM   = headerMaster.indexOf("no rm") !== -1 ? headerMaster.indexOf("no rm") : 0;
        const idxNama   = headerMaster.indexOf("nama pasien") !== -1 ? headerMaster.indexOf("nama pasien") : 1;
        const idxGender = headerMaster.findIndex(h => h.includes("gender") || h.includes("kelamin") || h.includes("l/p"));
        const idxWA     = headerMaster.findIndex(h => h.includes("whatsapp") || h.includes("wa") || h.includes("hp"));
        const idxAlamat = headerMaster.indexOf("alamat lengkap") !== -1 ? headerMaster.indexOf("alamat lengkap") : (headerMaster.indexOf("alamat") !== -1 ? headerMaster.indexOf("alamat") : 8);
        const idxStatus = headerMaster.indexOf("status") !== -1 ? headerMaster.indexOf("status") : 10;

        dataHalaman.forEach(p => {
            const noRM       = p.noRM || p[idxNoRM] || p[0] || "-";
            const namaPasien = p.namaPasien || p.nama || p[idxNama] || p[1] || "-";
            const gender     = p.gender || p[idxGender !== -1 ? idxGender : 4] || "-";
            const noWA       = p.noWA || p.whatsapp || p.phone || p[idxWA !== -1 ? idxWA : 5] || "-";
            const alamat     = p.alamat || p.alamatLengkap || p[idxAlamat !== -1 ? idxAlamat : 8] || "-";
            const statusAkun = (p.status || p[idxStatus !== -1 ? idxStatus : 10] || "aktif").toString().trim().toLowerCase();
            
            let namaTampil = `<strong>${namaPasien}</strong>`;
            if (statusAkun === "nonaktif") {
                namaTampil += ` <span style="background:#e74c3c; color:white; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold; margin-left:6px; display:inline-block; vertical-align:middle;">Akun Nonaktif / Terarsip</span>`;
            }

            const tr = document.createElement('tr');
            // 🔥 UPGRADE: Menambahkan pembatas lebar maksimal alamat (ellipsis)
            tr.innerHTML = `
                <td style="font-weight:bold; color:#2c3e50; padding: 10px;">${noRM}</td>
                <td style="padding: 10px;">${namaTampil}</td>
                <td style="padding: 10px;"><span style="background: #eccc68; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; color: #2c3e50;">${gender}</span></td> 
                <td style="padding: 10px;">${noWA}</td> 
                <td style="padding: 10px; max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${alamat}">${alamat}</td> 
                <td style="padding: 10px; text-align: center;">
                    <button class="btn-action btn-rme" style="background-color: #27ae60; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size:13px; font-weight: bold;" onclick="window.bukaModalRiwayatFull('${noRM}', '${namaPasien.replace(/'/g, "\\'")}', 'view')">👁️ Lihat RME</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    };

    window.halamanSebelumnyaRiwayat = function() {
        if (currentRiwayatPage > 1) {
            currentRiwayatPage--; 
            window.tampilkanRiwayatGlobal(); 
        }
    };

    window.halamanBerikutnyaRiwayat = function() {
        if (currentRiwayatPage < totalRiwayatPages) {
            currentRiwayatPage++; 
            window.tampilkanRiwayatGlobal(); 
        }
    };

    // =====================================================================
    // 3. FUNGSI TAB 2: DATABASE PASIEN UTAMA
    // =====================================================================
    window.cariDaftarPasien = function(resetHalaman = true) {
        if (resetHalaman) { halamanSekarangPasien = 1; }
        
        const elCari = document.getElementById('txtCariDaftar');
        kataKunciPasien = elCari ? elCari.value.trim() : "";
        
        const elStatus = document.getElementById('filterStatusPasien');
        const statusFilterVal = elStatus ? elStatus.value : "Semua";

        const tbody = document.getElementById('tabelSemuaPasienBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; font-weight: bold; color: #0369a1;">Memuat database dari server... ⏳</td></tr>';

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ 
                action: "getPasienPaginated", 
                keyword: kataKunciPasien,
                statusFilter: statusFilterVal, 
                page: halamanSekarangPasien,
                pageSize: ukuranHalamanPasien
            })
        })
        .then(res => res.json())
        .then(res => {
            tbody.innerHTML = "";
            if (res.result === "success" && res.data.length > 0) {
                window.dataPasienHalamanIni = res.data;
                window.headersPasien = res.headers;

                const headersMuda = res.headers.map(h => h.toLowerCase().trim());
                const idxRM = headersMuda.indexOf("no rm") !== -1 ? headersMuda.indexOf("no rm") : 0;
                const idxNama = headersMuda.indexOf("nama pasien") !== -1 ? headersMuda.indexOf("nama pasien") : 1;
                const idxGender = headersMuda.findIndex(h => h.includes("gender") || h.includes("kelamin") || h.includes("l/p"));
                const idxWA = headersMuda.findIndex(h => h.includes("whatsapp") || h.includes("wa") || h.includes("hp") || h.includes("telepon"));
                const idxAlamat = headersMuda.findIndex(h => h.includes("alamat"));
                const idxStatus = headersMuda.indexOf("status") !== -1 ? headersMuda.indexOf("status") : 10;

                const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
                const perms = sessionData.permissions || {};
                const role = (sessionData.role || '').toLowerCase();
                const username = (sessionData.username || '').toLowerCase();

                const isSuperAdmin = role === 'owner' || role === 'super admin' || role === 'rol-01' || username === 'owner';

                const punyaAksesEdit = isSuperAdmin || perms.akseseditpasien === 1 || perms.Akses_EditPasien === 1 || perms.editPasien === 1;
                const punyaAksesHapus = isSuperAdmin || perms.akseshapuspasien === 1 || perms.Akses_HapusPasien === 1 || perms.hapusPasien === 1;

                res.data.forEach((p, index) => {
                    const noRMPasien = p[idxRM] || "-";
                    const namaPasien = p[idxNama] || "-";
                    const statusPasienAktif = p[idxStatus] ? p[idxStatus].toString().trim().toLowerCase() : "aktif";

                    let tombolAksi = `<button type="button" class="btn-action btn-detail" style="background-color: #2980b9; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size:13px; font-weight: bold;" onclick="window.bukaAksiPasien('${noRMPasien}', 'detail', ${index})">🔍 Detail</button>`;

                    if (statusPasienAktif === "nonaktif") {
                        if (punyaAksesEdit) {
                            tombolAksi += `<button type="button" class="btn-action btn-restore" style="background-color: #2ecc71; color:white; margin-left:5px; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size:13px; font-weight: bold;" onclick="window.aktifkanPasien('${noRMPasien}', '${namaPasien.replace(/'/g, "\\'")}')">🔄 Aktifkan</button>`;
                        }
                    } else {
                        if (punyaAksesEdit) {
                            tombolAksi += `<button type="button" class="btn-action btn-edit" style="background-color: #e67e22; color:white; margin-left:5px; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size:13px; font-weight: bold;" onclick="window.bukaAksiPasien('${noRMPasien}', 'edit', ${index})">📝 Edit</button>`;
                        }
                        if (punyaAksesHapus) {
                            tombolAksi += `<button type="button" class="btn-action btn-delete" style="background-color: #e74c3c; color:white; margin-left:5px; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size:13px; font-weight: bold;" onclick="window.pemicuHapusPasien('${noRMPasien}', '${namaPasien.replace(/'/g, "\\'")}')">🗑️ Hapus</button>`;
                        }
                    }

                    let styleStatusRM = (statusPasienAktif === "nonaktif") ? 'style="font-weight:bold; color:#7f8c8d; text-decoration: line-through;"' : 'style="font-weight:bold; color:#2c3e50;"';

                    tbody.innerHTML += `<tr>
                            <td ${styleStatusRM}>${noRMPasien}</td>
                            <td><strong>${namaPasien}</strong> ${(statusPasienAktif === 'nonaktif' ? '<span style="color:red; font-size:11px; margin-left:4px;">(Nonaktif)</span>' : '')}</td>
                            <td><span style="background: #eccc68; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; color: #2c3e50;">${idxGender !== -1 ? (p[idxGender] || "-") : "-"}</span></td>
                            <td>${idxWA !== -1 ? (p[idxWA] || "-") : "-"}</td>
                            <td style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${idxAlamat !== -1 ? (p[idxAlamat] || "-") : "-"}">${idxAlamat !== -1 ? (p[idxAlamat] || "-") : "-"}</td>
                            <td style="white-space: nowrap !important; width: 1%; vertical-align: middle;">
                                <div style="display: inline-flex !important; gap: 6px; align-items: center; flex-wrap: nowrap !important;">
                                    ${tombolAksi}
                                </div>
                            </td>
                        </tr>`;  
                });

                const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
                setVal('lblHalamanPasien', `Halaman ${res.currentPage} dari ${res.totalPages}`);
                setVal('lblTotalDataTampil', res.data.length);
                setVal('lblTotalDataMaster', res.totalRecords);

                const btnPrev = document.getElementById('btnPrevPasien');
                const btnNext = document.getElementById('btnNextPasien');
                if (btnPrev) {
                    btnPrev.disabled = (res.currentPage <= 1);
                    btnPrev.style.opacity = btnPrev.disabled ? "0.5" : "1";
                }
                if (btnNext) {
                    btnNext.disabled = (res.currentPage >= res.totalPages);
                    btnNext.style.opacity = btnNext.disabled ? "0.5" : "1";
                }

            } else {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color:#e74c3c; font-weight: bold;">❌ Data tidak ditemukan dalam database.</td></tr>';
                const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
                setVal('lblHalamanPasien', "Halaman 1 dari 1");
                setVal('lblTotalDataTampil', "0");
                setVal('lblTotalDataMaster', "0");
                
                if (document.getElementById('btnPrevPasien')) document.getElementById('btnPrevPasien').disabled = true;
                if (document.getElementById('btnNextPasien')) document.getElementById('btnNextPasien').disabled = true;
            }
        })
        .catch(err => {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color:red; font-weight: bold;">⚠️ Gagal terhubung dengan server database.</td></tr>';
        });
    };

    window.halamanSebelumnyaPasien = function() {
        if (halamanSekarangPasien > 1) {
            halamanSekarangPasien--;
            window.cariDaftarPasien(false); 
        }
    };   

    window.halamanBerikutnyaPasien = function() {
        halamanSekarangPasien++;
        window.cariDaftarPasien(false); 
    };

    // =====================================================================
    // 4. MANAJEMEN AKUN PASIEN (CRUD)
    // =====================================================================
    window.aktifkanPasien = function(noRM, namaPasien) {
        if (!confirm(`Apakah Anda yakin ingin mengaktifkan kembali akun pasien bernama "${namaPasien}" (${noRM})?`)) return;

        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        const usernameAktif = sessionData.username || "Anonymous";
        const roleAktif     = sessionData.role || "Staff";

        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Mengaktifkan Pasien...");

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "aktifkanPasien",
                noRM: noRM,
                operatorUsername: usernameAktif,
                operatorRole: roleAktif
            })
        })
        .then(res => res.json())
        .then(res => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            if (res.result === "success") {
                alert(res.message);
                window.cariDaftarPasien(false); 
            } else {
                alert("Gagal mengaktifkan data: " + res.message);
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            console.error(err);
            alert("Gagal menghubungi server untuk mengaktifkan pasien.");
        });
    };

    window.simpanKoreksiPasien = function(e) {
        e.preventDefault();
        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        const usernameAktif = sessionData.username || "Anonymous";
        const roleAktif     = sessionData.role || "Staff";
        
        let btn = (e.target && e.target.querySelector('button[type="submit"]')) || document.getElementById('btnSimpanEditPasien');
        if (btn) {
            btn.disabled = true; 
            btn.innerText = "Menyimpan... ⏳";
        }
        
        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Menyimpan Perubahan Data...");

        const payload = {
            action: "updatePasien",
            noRM: document.getElementById('editNoRM').value,
            nama: document.getElementById('editNama').value,
            tempatLahir: document.getElementById('editTempatLahir').value,
            tanggalLahir: document.getElementById('editTanggalLahir').value,
            gender: document.getElementById('editGender').value,
            phone: document.getElementById('editPhone').value,
            pekerjaan: document.getElementById('editPekerjaan').value,
            email: document.getElementById('editEmail').value,
            noKTP: document.getElementById('editNoKTP').value,
            status: document.getElementById('txtStatusPasienModal') ? document.getElementById('txtStatusPasienModal').value : "Aktif",
            alamat: document.getElementById('editAlamat').value,
            kecamatan: document.getElementById('editKecamatan').value,
            kota: document.getElementById('editKota').value,
            operatorUsername: usernameAktif,
            operatorRole: roleAktif
        };
        
        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
        .then(res => res.json())
        .then(res => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            if(res.result === "success") {
                alert("Data profil pasien sukses diperbarui!");
                window.tutupModalDetailPasien();
                window.cariDaftarPasien(false); 
            } else {
                alert("Gagal update data: " + res.message);
                if (btn) { btn.disabled = false; btn.innerText = "💾 Simpan Perubahan"; }
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            alert("Gangguan jaringan terdeteksi.");
            if (btn) { btn.disabled = false; btn.innerText = "💾 Simpan Perubahan"; }
        });
    };

    window.pemicuHapusPasien = function(noRM, namaPasien) {
        const konfirmasi = confirm(`Apakah Anda yakin ingin menghapus data pasien bernama "${namaPasien}" (${noRM})?\n\nSistem akan mendeteksi riwayat transaksi medis sebelum mengeksekusi.`);
        if(!konfirmasi) return;
        
        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        const usernameAktif = sessionData.username || "Anonymous";
        const roleAktif     = sessionData.role || "Staff";

        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Menghapus Data Pasien...");

        const payloadData = { 
            action: "deletePasien", 
            noRM: noRM,
            operatorUsername: usernameAktif,
            operatorRole: roleAktif
        };
        
        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payloadData) })
        .then(res => res.json())
        .then(res => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            if(res.result === "success") {
                alert(res.message); 
                window.cariDaftarPasien(false); 
            } else {
                alert("Gagal memproses hapus data: " + res.message);
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            console.error(err);
            alert("Gagal terhubung ke database untuk memproses penghapusan.");
        });
    };

    // =====================================================================
    // 5. KONTROL POP-UP (MODAL) PASIEN
    // =====================================================================
    window.tutupModalDetailPasien = function() {
        const modal = document.getElementById('modalDetailPasien');
        if (modal) modal.style.display = 'none';
    };

    window.bukaAksiPasien = function(noRM, mode, index) {
        const wadahModal = document.getElementById('modalDetailPasien');
        const containerIsi = document.getElementById('isiDetailPasien');
        
        if (!wadahModal || !containerIsi) return;

        wadahModal.style.display = 'flex';
        containerIsi.innerHTML = '<p style="text-align:center; padding:20px;">Menghubungkan ke server... ⏳</p>';

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getDetailPasien", noRM: noRM })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                const p = res.data;
                
                if (mode === 'detail') {
                    // Panggil fungsi modal detail profil yang sudah disempurnakan (bila ada index-nya)
                    if (index !== undefined && window.dataPasienHalamanIni) {
                         window.bukaModalDetailPasien(index);
                         return; // Jika sukses memanggil versi array, hentikan render manual di bawah
                    }
                    
                    // Fallback render detail manual jika index tidak ada
                    containerIsi.innerHTML = `
                        <table class="table-detail-view" style="width:100%; border-collapse:collapse; font-size: 14px;">
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding:10px; font-weight:bold; width:35%;">Nomor RM</td><td>: ${p.noRM}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding:10px; font-weight:bold;">Nama Lengkap</td><td>: ${p.nama}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding:10px; font-weight:bold;">No. KTP / NIK</td><td>: ${p.noKTP}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding:10px; font-weight:bold;">Tempat Lahir</td><td>: ${p.tempatLahir}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding:10px; font-weight:bold;">Tanggal Lahir</td><td>: ${p.tanggalLahir}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding:10px; font-weight:bold;">Jenis Kelamin</td><td>: ${p.gender}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding:10px; font-weight:bold;">No. WhatsApp</td><td>: ${p.phone}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding:10px; font-weight:bold;">Pekerjaan</td><td>: ${p.pekerjaan}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding:10px; font-weight:bold;">Email Pasien</td><td>: ${p.email}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding:10px; font-weight:bold;">Alamat Lengkap</td><td>: ${p.alamat}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding:10px; font-weight:bold;">Kecamatan</td><td>: ${p.kecamatan}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding:10px; font-weight:bold;">Kota</td><td>: ${p.kota}</td></tr>
                            <tr style="border-bottom: 1px solid #eee;"><td style="padding:10px; font-weight:bold;">Status Akun</td><td>: <span style="background:#2ecc71; color:white; padding:2px 6px; border-radius:4px; font-size:12px; font-weight:bold;">${p.status}</span></td></tr>
                        </table>
                    `;
                } else if (mode === 'edit') {
                    containerIsi.innerHTML = `
                        <form id="formKoreksiPasien" onsubmit="window.simpanKoreksiPasien(event)">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 14px;">
                                
                                <div style="grid-column: span 2;">
                                    <label style="font-weight:bold; display:block; margin-bottom:4px;">Nomor RM (Kunci Sistem)</label>
                                    <input type="text" id="editNoRM" value="${p.noRM}" readonly style="width:100%; padding:8px; background:#e9ecef; border:1px solid #ccc; border-radius:4px; font-weight:bold;">
                                </div>
                                
                                <div style="grid-column: span 2;">
                                    <label style="font-weight:bold; display:block; margin-bottom:4px;">Nama Lengkap Pasien</label>
                                    <input type="text" id="editNama" value="${p.nama}" required style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                                </div>
                                
                                <div>
                                    <label style="font-weight:bold; display:block; margin-bottom:4px;">Tempat Lahir</label>
                                    <input type="text" id="editTempatLahir" value="${p.tempatLahir || '-'}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                                </div>
                                
                                <div>
                                    <label style="font-weight:bold; display:block; margin-bottom:4px;">Tanggal Lahir</label>
                                    <input type="text" id="editTanggalLahir" value="${p.tanggalLahir || '-'}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                                </div>
                                
                                <div>
                                    <label style="font-weight:bold; display:block; margin-bottom:4px;">Jenis Kelamin</label>
                                    <select id="editGender" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                                        <option value="Laki-laki" ${p.gender === 'Laki-laki' ? 'selected' : ''}>Laki-laki</option>
                                        <option value="Perempuan" ${p.gender === 'Perempuan' ? 'selected' : ''}>Perempuan</option>
                                    </select>
                                </div>
                                
                                <div>
                                    <label style="font-weight:bold; display:block; margin-bottom:4px;">No. WhatsApp</label>
                                    <input type="text" id="editPhone" value="${p.phone}" required style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                                </div>
                                
                                <div>
                                    <label style="font-weight:bold; display:block; margin-bottom:4px;">Pekerjaan</label>
                                    <input type="text" id="editPekerjaan" value="${p.pekerjaan || '-'}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                                </div>
                                
                                <div>
                                    <label style="font-weight:bold; display:block; margin-bottom:4px;">Email Pasien</label>
                                    <input type="email" id="editEmail" value="${p.email || '-'}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                                </div>
                                
                                <div>
                                    <label style="font-weight:bold; display:block; margin-bottom:4px;">No. KTP / NIK</label>
                                    <input type="text" id="editNoKTP" value="${p.noKTP || '-'}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                                </div>
                                
                                <div>
                                    <label style="font-weight:bold; display:block; margin-bottom:4px;">Status Akun Pasien</label>
                                    <select id="txtStatusPasienModal" disabled style="background-color: #f5f5f5; cursor: not-allowed; font-weight: bold;">
                                            <option value="Aktif">Aktif</option>
                                            <option value="Nonaktif">Nonaktif</option>
                                    </select>
                                </div>

                                <div>
                                    <label style="font-weight:bold; display:block; margin-bottom:4px;">Kecamatan</label>
                                    <input type="text" id="editKecamatan" value="${p.kecamatan || '-'}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                                </div>

                                <div>
                                    <label style="font-weight:bold; display:block; margin-bottom:4px;">Kota</label>
                                    <input type="text" id="editKota" value="${p.kota || '-'}" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px;">
                                </div>
                                
                                <div style="grid-column: span 2;">
                                    <label style="font-weight:bold; display:block; margin-bottom:4px;">Alamat Lengkap</label>
                                    <textarea id="editAlamat" required style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; height:60px;">${p.alamat}</textarea>
                                </div>    
                                
                            </div>
                            <div style="text-align:right; margin-top:20px; border-top:1px solid #eee; padding-top:12px;">
                                <button type="submit" id="btnSimpanEditPasien" style="padding:10px 20px; border:none; background-color:#e67e22; color:white; border-radius:4px; cursor:pointer; font-weight:bold;">💾 Simpan Perubahan</button>
                            </div>
                        </form>
                    `;
                }
            } else {
                containerIsi.innerHTML = `<p style="text-align:center; color:red; padding:20px;">Error: ${res.message}</p>`;
            }
        })
        .catch(err => {
            console.error(err);
            containerIsi.innerHTML = '<p style="text-align:center; color:red; padding:20px;">Gangguan koneksi server.</p>';
        });
    };

    window.bukaModalDetailPasien = function(index) {
        const pasien = window.dataPasienHalamanIni ? window.dataPasienHalamanIni[index] : null;
        const headers = window.headersPasien || [];
        const container = document.getElementById('isiDetailPasien');
        const modal = document.getElementById('modalDetailPasien');

        if (!pasien || !container || !modal) {
            alert("Gagal memuat detail: Data halaman belum siap atau elemen modal hilang.");
            return;
        }

        container.innerHTML = ""; 

        headers.forEach((header, idx) => {
            let nilai = pasien[idx] !== undefined && pasien[idx] !== null && String(pasien[idx]).trim() !== "" ? pasien[idx] : "-";
            
            const namaHeaderKecil = header.toLowerCase();
            if (namaHeaderKecil.includes('tanggal lahir') || namaHeaderKecil.includes('tgl lahir')) {
                if (nilai !== "-" && typeof window.formatTanggalIndo === "function") {
                   nilai = window.formatTanggalIndo(nilai);
                }
            } else if (typeof nilai === "string" && nilai.includes("T00:00:00")) {
                nilai = nilai.split("T")[0]; 
            }

            container.innerHTML += `
                <div style="margin-bottom: 14px; border-bottom: 1px solid #f1f2f6; padding-bottom: 8px;">
                    <label style="font-weight: bold; color: #7f8c8d; display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">${header}</label>
                    <div style="font-size: 15px; color: #2c3e50; font-weight: 500; margin-top: 4px; word-break: break-word;">${nilai}</div>
                </div>
            `;
        });

        modal.style.display = 'block';
    };

    // =====================================================================
    // 6. PENGAMANAN EVENT LISTENER (Saat HTML Selesai Dimuat)
    // =====================================================================
    window.addEventListener('load', function() {
        // Event Listener Pencarian Enter
        const txtCari = document.getElementById('txtCariRiwayatGlobal');
        if (txtCari) {
            txtCari.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') { window.cariPasienGlobal(); }
            });
        }

        // Event Listener Tutup Modal Saat Klik Area Kosong
        const modalDetail = document.getElementById('modalDetailPasien');
        if (modalDetail) {
            window.addEventListener('click', function(event) {
                if (event.target === modalDetail) { modalDetail.style.display = 'none'; }
            });
        }
    });

    // =====================================================================
    // 🔥 SENSOR ACCORDION PENCARIAN RIWAYAT (GLOBAL DELEGATION)
    // =====================================================================
    document.addEventListener('click', function(e) {
        // 1. Cek apakah yang diklik berada di dalam tabel daftar pencarian riwayat
        const tr = e.target.closest('#tabelDaftarPasienBody tr');
        
        // Jika bukan area tabel pencarian, hentikan perintah
        if (!tr) return;
        
        // 2. Abaikan jika yang diklik adalah Tombol Aksi (agar fungsinya aman)
        if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
        
        // 3. Abaikan jika yang diklik adalah teks placeholder "Memuat hasil..."
        if (tr.querySelector('td[colspan="6"]')) return; 
        
        // 4. Buka/Tutup laci informasi hanya jika diakses dari layar HP
        if (window.innerWidth <= 768) {
            tr.classList.toggle('expanded');
        }
    });

})();