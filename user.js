// =========================================================================
// 👥 MODUL MANAJEMEN USER (PENGGUNA & HAK AKSES)
// =========================================================================
(function() {

    // 1. Memuat data dari sheet Users ke tabel HTML
   // =====================================================================
    // 1. MEMUAT DATA USER (DENGAN SISTEM PAGINASI & HYBRID RENDER)
    // =====================================================================
    window.dataUsersGlobal = [];
    window.rolesMapGlobal = {};
    window.currentPageUser = 1;
    window.itemsPerPageUser = 10; // Tampilkan 10 staf per halaman

    window.muatDataUser = function() {
        const wadahPC = document.getElementById('bodyUsersPC');
        const wadahMobile = document.getElementById('bodyUsersMobile');
        
        if (wadahPC) wadahPC.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px;">⏳ Memuat data pengguna...</td></tr>`;
        if (wadahMobile) wadahMobile.innerHTML = `<div style="text-align:center; padding: 20px; background:#fff; border-radius:8px;">⏳ Memuat data pengguna...</div>`;

        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getUsers" })
        })
        .then(res => {
            if (!res.ok) throw new Error("Respon server bermasalah (Status: " + res.status + ")");
            return res.json();
        })
        .then(res => {
            if (res.result === "success") {
                window.dataUsersGlobal = res.data || [];
                window.rolesMapGlobal = res.rolesMap || {};
                window.renderTabelUser(); // Panggil mesin render Paginasi
            } else {
                if (wadahPC) wadahPC.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">❌ Gagal: ${res.message}</td></tr>`;
                if (wadahMobile) wadahMobile.innerHTML = `<div style="text-align:center; color:red; padding: 20px; background:#fff;">❌ Gagal: ${res.message}</div>`;
            }
        })
        .catch(err => {
            console.error("Gagal memuat pengguna:", err);
            if (wadahPC) wadahPC.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">⚠️ Gangguan Koneksi Sistem.</td></tr>`;
        });
    };

    window.renderTabelUser = function() {
        const wadahPC = document.getElementById('bodyUsersPC');
        const wadahMobile = document.getElementById('bodyUsersMobile');
        const paginationDiv = document.getElementById('paginationControlsUser');
        
        if (wadahPC) wadahPC.innerHTML = "";
        if (wadahMobile) wadahMobile.innerHTML = "";

        if (!window.dataUsersGlobal || window.dataUsersGlobal.length === 0) {
            if (wadahPC) wadahPC.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 20px; color:gray;">Belum ada pengguna.</td></tr>`;
            if (wadahMobile) wadahMobile.innerHTML = `<div style="text-align:center; padding: 20px; background:#fff; border-radius:8px; color:gray;">Belum ada pengguna.</div>`;
            if (paginationDiv) paginationDiv.innerHTML = '';
            return;
        }

        // --- Logika Pemotongan Data (Paginasi) ---
        const totalPages = Math.ceil(window.dataUsersGlobal.length / window.itemsPerPageUser) || 1;
        if (window.currentPageUser > totalPages) window.currentPageUser = totalPages;
        if (window.currentPageUser < 1) window.currentPageUser = 1;

        const startIndex = (window.currentPageUser - 1) * window.itemsPerPageUser;
        const endIndex = startIndex + window.itemsPerPageUser;
        const paginatedItems = window.dataUsersGlobal.slice(startIndex, endIndex);

        paginatedItems.forEach(user => {
            let idRoleRaw = user.idRole ? user.idRole.toString().trim() : "";
            let idRoleLower = idRoleRaw.toLowerCase();
            let namaRole = window.rolesMapGlobal[idRoleLower] || idRoleRaw || "Tanpa Role";
            
            let statusUser = user.status || "Aktif";
            let badgeStatus = statusUser === "Aktif" 
                ? `<span style="background:#d4efdf; color:#27ae60; padding:4px 10px; border-radius:12px; font-size:11px; font-weight:bold;">Aktif</span>` 
                : `<span style="background:#fadbd8; color:#c0392b; padding:4px 10px; border-radius:12px; font-size:11px; font-weight:bold;">Nonaktif</span>`;

            let namaLengkapTampil = user.namaLengkap || user.nama || user.username || "-";

            // 💻 WUJUD PC: TABEL KLASIK 
            if (wadahPC) {
                wadahPC.innerHTML += `
                <tr style="border-bottom: 1px solid #eee; transition: background 0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 12px 15px;">
                        <strong style="color:#2c3e50; font-size:14px;">${namaLengkapTampil}</strong> <br>
                        <small style="color:#7f8c8d;">ID: ${user.idUser || '-'} | User: <span style="color:#2980b9; font-weight:bold;">${user.username || '-'}</span></small>
                    </td>
                    <td style="padding: 12px 15px; color:#34495e; font-weight:bold; font-size:13px;">${namaRole}</td>
                    <td style="padding: 12px 15px;">${badgeStatus}</td>
                    <td style="padding: 12px 15px; text-align: center;">
                        <button onclick="window.bukaFormEdit('${user.username || ''}', '${namaLengkapTampil}', '${idRoleRaw}', ${user.barisSheet}, '${statusUser}')" style="background:#f39c12; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px; margin-right:5px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">✏️ Edit</button>
                        <button onclick="window.hapusUser('${user.username || ''}', ${user.barisSheet})" style="background:#e74c3c; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">🗑️ Hapus</button>
                    </td>
                </tr>`;
            }

            // 📱 WUJUD MOBILE: CARD ACCORDION
            if (wadahMobile) {
                let card = document.createElement('div');
                card.style.cssText = "background:#fff; border:1px solid #e0e0e0; border-radius:8px; box-shadow:0 2px 4px rgba(0,0,0,0.02); overflow:hidden;";
                card.innerHTML = `
                    <div onclick="window.toggleAccordionUser(this)" style="padding:15px; background:#fbfcfc; display:flex; justify-content:space-between; align-items:flex-start; cursor:pointer; border-bottom:1px solid transparent;">
                        <div>
                            <div style="font-weight:bold; color:#2c3e50; font-size:15px; margin-bottom:4px;">${namaLengkapTampil}</div>
                            <div style="font-size:12px; color:#7f8c8d; font-weight:bold;">User: <span style="color:#2980b9;">${user.username || '-'}</span> • ${badgeStatus}</div>
                        </div>
                        <div style="display:flex; align-items:center; padding-top: 5px;">
                            <span class="acc-icon-usr" style="font-size:16px; color:#95a5a6; transition: transform 0.3s; font-weight:bold;">▼</span>
                        </div>
                    </div>
                    <div style="display:none; padding:15px; border-top:1px solid #ecf0f1; background:#fff;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; font-size:13px; background:#f9f9f9; padding:10px; border-radius:6px;">
                            <span style="color:#7f8c8d;">Role Sistem:</span> 
                            <strong style="color:#34495e; font-size:14px;">${namaRole}</strong>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <!-- Tombol Edit & Hapus Menggunakan Parameter Presisi Original -->
                            <button onclick="window.bukaFormEdit('${user.username || ''}', '${namaLengkapTampil}', '${idRoleRaw}', ${user.barisSheet}, '${statusUser}')" style="flex:1; background:#f39c12; color:white; border:none; padding:10px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:13px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">✏️ Edit Akun</button>
                            <button onclick="window.hapusUser('${user.username || ''}', ${user.barisSheet})" style="flex:1; background:#e74c3c; color:white; border:none; padding:10px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:13px; box-shadow:0 2px 4px rgba(0,0,0,0.1);">🗑️ Hapus Akun</button>
                        </div>
                    </div>
                `;
                wadahMobile.appendChild(card);
            }
        });

        window.renderKontrolPaginasiUser(totalPages, window.currentPageUser);
    };

    // --- KONTROL PAGINASI & ANIMASI CARD ---
    window.renderKontrolPaginasiUser = function(totalPages, currentPage) {
        const wadah = document.getElementById('paginationControlsUser');
        if (!wadah) return;
        wadah.innerHTML = '';
        if (totalPages <= 1) { wadah.style.display = 'none'; return; }
        
        wadah.style.display = 'flex';

        const btnPrev = document.createElement('button');
        btnPrev.className = 'btn-page-usr';
        btnPrev.innerText = '« Prev';
        btnPrev.disabled = currentPage === 1;
        btnPrev.onclick = () => { window.currentPageUser--; window.renderTabelUser(); };
        wadah.appendChild(btnPrev);

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
                const btnNum = document.createElement('button');
                btnNum.className = 'btn-page-usr' + (i === currentPage ? ' active' : '');
                btnNum.innerText = i;
                btnNum.onclick = () => { window.currentPageUser = i; window.renderTabelUser(); };
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
        btnNext.className = 'btn-page-usr';
        btnNext.innerText = 'Next »';
        btnNext.disabled = currentPage === totalPages;
        btnNext.onclick = () => { window.currentPageUser++; window.renderTabelUser(); };
        wadah.appendChild(btnNext);
    };

    window.toggleAccordionUser = function(headerElement) {
        const cardBody = headerElement.nextElementSibling;
        const icon = headerElement.querySelector('.acc-icon-usr');
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

    // 2. Fungsi untuk menyimpan User Baru
    window.tambahUserBaru = function() {
        const username = document.getElementById('inputUsernameBaru').value.trim();
        const password = document.getElementById('inputPasswordBaru').value.trim();
        const role = document.getElementById('inputRoleBaru').value;
        // 🔥 TANGKAP NAMA LENGKAP
        const namaLengkap = document.getElementById('inputNamaLengkapBaru') ? document.getElementById('inputNamaLengkapBaru').value.trim() : "";

        if (!username || !password || !role) {
            alert("Kolom Username, Password, dan Role wajib diisi semua!");
            return;
        }

        let btn = (window.event && window.event.target) ? window.event.target : null;
        if (!btn || btn.tagName !== 'BUTTON') {
            btn = document.querySelector('#manajemenUser button');
        }

        const teksAsli = btn ? btn.innerText : "Simpan";
        if (btn) {
            btn.innerText = "Menyimpan... ⏳";
            btn.disabled = true;
        }

        if (!window.tokenUserBaru) window.tokenUserBaru = "USR-" + new Date().getTime();

        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ 
                action: "simpanUser", 
                username: username, 
                namaLengkap: namaLengkap, // 🔥 KIRIM NAMA LENGKAP KE SERVER
                password: password, 
                role: role,
                tokenId: window.tokenUserBaru 
            })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                alert("Pengguna baru berhasil ditambahkan!");
                window.tokenUserBaru = null; 
                document.getElementById('inputUsernameBaru').value = "";
                if(document.getElementById('inputNamaLengkapBaru')) document.getElementById('inputNamaLengkapBaru').value = "";
                document.getElementById('inputPasswordBaru').value = "";
                document.getElementById('inputRoleBaru').value = "";
                window.muatDataUser(); 
            } else {
                alert("Gagal menyimpan: " + res.message);
            }
        })
        .catch(err => {
            alert("⚠️ KONEKSI TERPUTUS!\n\nSistem mungkin sudah mencatat user ini. Tabel akan dimuat ulang.");
            window.muatDataUser();
        })
        .finally(() => { 
            setTimeout(() => { 
                if (btn) {
                    btn.innerText = teksAsli; 
                    btn.disabled = false; 
                }
            }, 3000); 
        });
    };

    // 3. Membuka form edit dan mengisi datanya otomatis
    window.bukaFormEdit = function(username, namaLengkap, idRole, barisSheet, status) {
        const formEdit = document.getElementById('formEditUser');
        if (formEdit) formEdit.style.display = 'flex'; 
        
        document.getElementById('lblEditUsername').innerText = username;
        document.getElementById('editUsername').value = username;
        
        // 🔥 ISI KOTAK EDIT NAMA LENGKAP
        const elEditNama = document.getElementById('editNamaLengkap');
        if (elEditNama) {
            elEditNama.value = namaLengkap !== "-" ? namaLengkap : "";
        }

        document.getElementById('editRole').value = idRole;
        document.getElementById('editBarisSheet').value = barisSheet;
        document.getElementById('editPassword').value = ""; 
        document.getElementById('editStatus').value = status || "Aktif"; 
    };

    // 4. Menutup form edit
    window.batalEditUser = function() {
        const formEdit = document.getElementById('formEditUser');
        if (formEdit) formEdit.style.display = 'none';
    };

    // 5. Mengirim data perubahan ke server
    window.simpanEditUser = function() {
        const elEditNama = document.getElementById('editNamaLengkap');
        
        const payload = {
            action: "updateUser",
            barisSheet: document.getElementById('editBarisSheet').value,
            newUsername: document.getElementById('editUsername').value,
            newNamaLengkap: elEditNama ? elEditNama.value.trim() : "", // 🔥 KIRIM NAMA BARU
            newRole: document.getElementById('editRole').value,
            newStatus: document.getElementById('editStatus').value, 
            newPassword: document.getElementById('editPassword').value,
            tokenId: "UPD-" + new Date().getTime() 
        };

        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("Menyimpan Perubahan...");

        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(res => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            if(res.result === "success") {
                alert("Data pengguna berhasil diperbarui!");
                window.batalEditUser();
                window.muatDataUser();
            } else {
                alert("Gagal: " + res.message);
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            alert("⚠️ KONEKSI TERPUTUS!\n\nPerubahan mungkin sudah tersimpan. Tabel akan dimuat ulang.");
            window.batalEditUser();
            window.muatDataUser();
        });
    };

    // 6. Menghapus akun pengguna dari database
    window.hapusUser = function(username, barisSheet) {
        if (!confirm(`Peringatan: Apakah Anda yakin ingin MENGHAPUS akun [ ${username} ] secara permanen?`)) {
            return;
        }

        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("Menghapus Akun...");

        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "hapusUser", barisSheet: barisSheet })
        })
        .then(res => res.json())
        .then(res => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            if (res.result === "success") {
                alert(`Akun ${username} berhasil dihapus.`);
                window.muatDataUser(); 
            } else {
                alert("Gagal menghapus: " + res.message);
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            alert("Terjadi kesalahan sistem.");
        });
    };

})();