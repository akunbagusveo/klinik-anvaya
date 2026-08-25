// =========================================================================
// 👥 MODUL MANAJEMEN USER (PENGGUNA & HAK AKSES)
// =========================================================================
(function() {

    // 1. Memuat data dari sheet Users ke tabel HTML
    window.muatDataUser = function() {
        const tbody = document.getElementById('bodyUsers');
        if (!tbody) return; // Mencegah error jika elemen tidak ditemukan
        
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Memuat data pengguna... ⏳</td></tr>`;

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getUsers" })
        })
        .then(res => {
            if (!res.ok) throw new Error("Respon server bermasalah (Status: " + res.status + ")");
            return res.json();
        })
        .then(res => {
            if (res.result === "success") {
                tbody.innerHTML = "";
                if (!res.data || res.data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Belum ada pengguna.</td></tr>`;
                    return;
                }

                const rolesMap = res.rolesMap || {};

                res.data.forEach(user => {
                    let idRoleRaw = user.idRole ? user.idRole.toString().trim() : "";
                    let idRoleLower = idRoleRaw.toLowerCase();
                    let namaRole = rolesMap[idRoleLower] || idRoleRaw || "Tanpa Role";
                    
                    let statusUser = user.status || "Aktif";
                    let warnaStatus = statusUser === "Aktif" ? "green" : "red";

                    let row = `<tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 8px;">${user.username || '-' } <br><small style="color:gray;">${user.idUser || '-'}</small></td>
                        <td style="padding: 8px;"><strong>${namaRole}</strong></td>
                        <td style="padding: 8px;"><span style="color: ${warnaStatus}; font-weight: bold;">${statusUser}</span></td>
                        <td style="padding: 8px; text-align: center;">
                            <button onclick="bukaFormEdit('${user.username || ''}', '${idRoleRaw}', ${user.barisSheet}, '${statusUser}')" style="background:#ffc107; color:black; border:none; padding:5px 10px; border-radius:3px; cursor:pointer; margin-right:5px;">Edit</button>
                            <button onclick="hapusUser('${user.username || ''}', ${user.barisSheet})" style="background:#dc3545; color:white; border:none; padding:5px 10px; border-radius:3px; cursor:pointer;">Hapus</button>
                        </td>
                    </tr>`;
                    tbody.innerHTML += row;
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Gagal dari Server: ${res.message || 'Terjadi kesalahan sistem'}</td></tr>`;
            }
        })
        .catch(err => {
            console.error("Gagal memuat pengguna:", err);
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Gagal memuat data.<br><small style="color:gray;">Detail: ${err.message}</small></td></tr>`;
        });
    };

    // 2. Fungsi untuk menyimpan User Baru
    window.tambahUserBaru = function() {
        const username = document.getElementById('inputUsernameBaru').value.trim();
        const password = document.getElementById('inputPasswordBaru').value.trim();
        const role = document.getElementById('inputRoleBaru').value;

        if (!username || !password || !role) {
            alert("Kolom Username, Password, dan Role wajib diisi semua!");
            return;
        }

        // 🔥 FIX BROWSER EVENT: Mengambil tombol yang diklik dengan aman
        let btn = (window.event && window.event.target) ? window.event.target : null;
        if (!btn || btn.tagName !== 'BUTTON') {
            btn = document.querySelector('#formTambahUser button');
        }

        const teksAsli = btn ? btn.innerText : "Simpan";
        if (btn) {
            btn.innerText = "Menyimpan... ⏳";
            btn.disabled = true;
        }

        if (!window.tokenUserBaru) window.tokenUserBaru = "USR-" + new Date().getTime();

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ 
                action: "simpanUser", 
                username: username, 
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
    window.bukaFormEdit = function(username, idRole, barisSheet, status) {
        const formEdit = document.getElementById('formEditUser');
        if (formEdit) formEdit.style.display = 'flex'; 
        
        document.getElementById('lblEditUsername').innerText = username;
        document.getElementById('editUsername').value = username;
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
        const payload = {
            action: "updateUser",
            barisSheet: document.getElementById('editBarisSheet').value,
            newUsername: document.getElementById('editUsername').value,
            newRole: document.getElementById('editRole').value,
            newStatus: document.getElementById('editStatus').value, 
            newPassword: document.getElementById('editPassword').value,
            tokenId: "UPD-" + new Date().getTime() 
        };

        // Panggil layar loading global jika ada
        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("Menyimpan Perubahan...");

        fetch(WEB_APP_URL, {
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

        fetch(WEB_APP_URL, {
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