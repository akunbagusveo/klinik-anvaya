// =========================================================================
// 🔒 MODUL PENGATURAN HAK AKSES ROLE (MATRIKS & ROLE MANAGER)
// =========================================================================
(function() {

    const DAFTAR_MENU_AKSES = [
        { key: 'pendaftaran', label: 'Pendaftaran', class: 'chk-daftar' },
        { key: 'rekamMedis', label: 'Rekam Medis', class: 'chk-rm' },
        { key: 'databasePasien', label: 'Database Pasien', class: 'chk-db' },
        { key: 'antrian', label: 'Antrean', class: 'chk-antrian' },
        { key: 'kamusDikte', label: 'Kamus Dikte', class: 'chk-kamus' },
        { key: 'pengaturan', label: 'Pengaturan', class: 'chk-pengaturan' },
        { key: 'manajemenUser', label: 'Manajemen User', class: 'chk-mnguser' },
        { key: 'kelolaJadwal', label: 'Kelola Jadwal', class: 'chk-jadwal' },
        { key: 'editPasien', label: 'Edit Pasien', class: 'chk-edit-pasien' },
        { key: 'hapusPasien', label: 'Hapus Pasien', class: 'chk-hapus-pasien' },
        { key: 'editRME', label: 'Edit RME', class: 'chk-edit-rme' },
        { key: 'aksesInputRME', label: 'Input RME', class: 'chk-input-rme' },
        { key: 'aksesEditAntrean', label: 'Edit Antrean', class: 'chk-edit-antrean' },
        { key: 'analisisBisnis', label: 'Analisis Bisnis', class: 'chk-analisis-bisnis', fallbackKeys: ['aksesAnalisisBisnis'] },
        { key: 'kasir', label: 'Kasir', class: 'chk-kasir', fallbackKeys: ['aksesKasir'] },
        { key: 'logAktifitas', label: 'Log Aktifitas', class: 'chk-log-aktifitas', fallbackKeys: ['aksesLogAktifitas'] },
        { key: 'kokpitFinansial', label: 'Kokpit Finansial', class: 'chk-kokpit-finansial' },
        { key: 'worklistKontrol', label: 'Worklist Kontrol', class: 'chk-worklist-kontrol', fallbackKeys: ['worklist'] },
        { key: 'kalenderPraktik', label: 'Kalender Praktik', class: 'chk-kalender-praktik', fallbackKeys: ['aksesKalenderPraktik'] },
        { key: 'tagihanLab', label: 'Tagihan Lab', class: 'chk-tagihan-lab', fallbackKeys: ['aksesTagihanLab'] },
        { key: 'pendapatanDokter', label: 'Pendapatan Dokter', class: 'chk-pendapatan-dokter', fallbackKeys: ['aksesPendapatanDokter'] },
        { key: 'masterTindakan', label: 'Master Tindakan', class: 'chk-master-tindakan', fallbackKeys: ['aksesMasterTindakan'] }
    ];

    window.aplikasikanHakAkses = function(perms) {
        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        
        const roleId = sessionData && sessionData.role ? String(sessionData.role).toLowerCase().trim() : "";
        const roleName = sessionData && sessionData.namaRole ? String(sessionData.namaRole).toLowerCase().trim() : "";
        
        // 🔥 FIX UTAMA: Pengecekan Super Admin dipindah ke paling atas!
        const isSuperAdmin = roleId === "rol-01" || roleName === "super admin" || roleName === "owner" || roleId === "owner";
        const isDokter = roleId === "rol-03" || roleName.includes("dokter") || roleName.includes("dr");
        
        // 🔥 JARING PENGAMAN: Jika bukan Super Admin, baru cek permission
        if (!isSuperAdmin) {
            if (!perms) perms = sessionData.permissions || null;
            if (!perms) return; // Jika staff biasa dan perms kosong, hentikan proses!
        }

        const cekIzin = (kataKunci) => {
            if (isSuperAdmin) return true; // Owner langsung tembus tanpa cek perms
            if (!perms) return false;
            
            const kunciDicari = kataKunci.toLowerCase();
            for (let key in perms) {
                const keyAsli = key.toLowerCase().replace(/[^a-z0-9]/g, ''); 
                if (keyAsli.includes(kunciDicari)) return perms[key] === 1;
            }
            return false; 
        };

        const setMenuDisplay = (id, kataKunci) => {
            const el = document.getElementById(id);
            if (el) el.style.display = cekIzin(kataKunci) ? 'block' : 'none'; 
        };
        
        const setCardDisplay = (id, kataKunci) => {
            const el = document.getElementById(id);
            if (el) el.style.display = cekIzin(kataKunci) ? 'block' : 'none';
        };

        setMenuDisplay('tabPendaftaranBtn', 'pendaftaran');
        setMenuDisplay('tabRiwayatMedisBtn', 'rekammedis');
        setMenuDisplay('tabDaftarPasienBtn', 'databasepasien');
        setMenuDisplay('tabAntreanBtn', 'antrian');
        setMenuDisplay('tabKamusDikteBtn', 'kamusdikte');
        setMenuDisplay('tabBackendBtn', 'pengaturan');
        setMenuDisplay('tabKasirBtn', 'kasir');
        setMenuDisplay('tabPengingatKontrolBtn', 'worklistkontrol');
        setMenuDisplay('tabTagihanLabBtn', 'tagihanlab');
        setMenuDisplay('tabPendapatanDokterBtn', 'pendapatandokter');

        const elKalenderBtn = document.getElementById('tabDokterBtn') || document.getElementById('tabKalenderBtn');
        if (elKalenderBtn) {
            const punyaAksesKalender = isSuperAdmin || isDokter || cekIzin('kalenderpraktik') || cekIzin('kalender');
            elKalenderBtn.style.display = punyaAksesKalender ? 'block' : 'none';
        }

        const punyaAksesAnalisis = cekIzin('analisisbisnis') || cekIzin('kokpitfinansial');
        const elAnalisisBtn = document.getElementById('tabAnalisisBisnisBtn');
        if (elAnalisisBtn) elAnalisisBtn.style.display = punyaAksesAnalisis ? 'block' : 'none';

        setCardDisplay('menuPendaftaranCard', 'pendaftaran');
        setCardDisplay('menuAntreanCard', 'antrian');
        setCardDisplay('menuRiwayatCard', 'rekammedis');
        setCardDisplay('menuDaftarPasienCard', 'databasepasien');
        
        const menuKalenderCard = document.getElementById('menuKalenderCard') || document.getElementById('cardKalender');
        if (menuKalenderCard) {
            menuKalenderCard.style.display = (isSuperAdmin || isDokter || cekIzin('kalenderpraktik') || cekIzin('kalender')) ? 'block' : 'none';
        }

        const punyaAksesUser = cekIzin('manajemenuser');
        const elUserBtn = document.getElementById('subTabUserBtn');
        const elAksesBtn = document.getElementById('subTabAksesBtn');
        if (elUserBtn) elUserBtn.style.display = punyaAksesUser ? 'inline-block' : 'none';
        if (elAksesBtn) elAksesBtn.style.display = punyaAksesUser ? 'inline-block' : 'none';

        const punyaAksesJadwal = cekIzin('kelolajadwal');
        const elJadwalBtn = document.getElementById('subTabJadwalBtn');
        if (elJadwalBtn) elJadwalBtn.style.display = punyaAksesJadwal ? 'inline-block' : 'none';

        const punyaAksesLog = cekIzin('logaktifitas'); 
        const elLogBtn = document.getElementById('subTabLogBtn'); 
        if (elLogBtn) elLogBtn.style.display = punyaAksesLog ? 'inline-block' : 'none';

        const punyaAksesFinansial = cekIzin('kokpitfinansial');
        const btnSubTabFinansial = document.getElementById('btnSubTabFinansial');
        if (btnSubTabFinansial) btnSubTabFinansial.style.display = punyaAksesFinansial ? 'inline-block' : 'none';

        const punyaAksesMasterTindakan = cekIzin('mastertindakan');
        const elMasterTindakanBtn = document.getElementById('subTabMasterTindakanBtn'); 
        if (elMasterTindakanBtn) elMasterTindakanBtn.style.display = punyaAksesMasterTindakan ? 'inline-block' : 'none';
        
        setTimeout(() => {
            if (cekIzin('pengaturan')) {
                if (punyaAksesUser) {
                    if (typeof window.bukaSubTab === "function") window.bukaSubTab('manajemenUser');
                } else if (punyaAksesJadwal) {
                    if (typeof window.bukaSubTab === "function") window.bukaSubTab('manajemenJadwal');
                }
            }
        }, 1200); 
    };

    window.muatPilihanRole = function() {
        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getRoles" })
        })
        .then(res => {
            if (!res.ok) throw new Error("Status " + res.status);
            return res.json();
        })
        .then(res => {
            if (res.result === "success") {
                const selectTambah = document.getElementById('inputRoleBaru');
                const selectEdit = document.getElementById('editRole');
                
                if (selectTambah) selectTambah.innerHTML = '<option value="">-- Pilih Role --</option>';
                if (selectEdit) selectEdit.innerHTML = '';
                
                res.data.forEach(role => {
                    if (selectTambah) selectTambah.innerHTML += `<option value="${role.id}">${role.nama}</option>`;
                    if (selectEdit) selectEdit.innerHTML += `<option value="${role.id}">${role.nama}</option>`;
                });
            }
        })
        .catch(err => console.error("Gagal muat dropdown role:", err));
    };

    window.muatMatriksAkses = function() {
        const thead = document.getElementById('headMatriksAkses');
        const tbody = document.getElementById('bodyMatriksAkses');
        if (!thead || !tbody) return;
        
        const totalKolom = DAFTAR_MENU_AKSES.length + 2; 

        let headerHTML = `<tr><th style="padding: 10px;">Nama Role</th>`;
        DAFTAR_MENU_AKSES.forEach(menu => {
            headerHTML += `<th style="padding: 10px; text-align: center;">${menu.label}</th>`;
        });
        headerHTML += `<th style="padding: 10px; text-align: center;">Aksi</th></tr>`;
        thead.innerHTML = headerHTML;

        tbody.innerHTML = `<tr><td colspan="${totalKolom}" style="text-align:center; color: #555; padding: 15px;">⏳ Memuat konfigurasi hak akses dari database...</td></tr>`;

        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getMatrixRole" })
        })
        .then(res => {
            if (!res.ok) throw new Error("Gagal terhubung ke server");
            return res.json();
        })
        .then(res => {
            if (res.result === "success") {
                tbody.innerHTML = "";
                
                res.data.forEach(role => {
                    const isSuperAdmin = role.idRole.toLowerCase() === 'rol-01' || role.namaRole.toLowerCase() === 'owner';
                    const disabledAttr = isSuperAdmin ? 'disabled checked' : '';

                    let tdCheckboxes = DAFTAR_MENU_AKSES.map(menu => {
                        let val = role[menu.key];
                        if (val === undefined && menu.fallbackKeys) {
                            for (let fk of menu.fallbackKeys) {
                                if (role[fk] !== undefined) {
                                    val = role[fk];
                                    break;
                                }
                            }
                        }
                        const isChecked = (val == 1 || val === true) ? 'checked' : '';
                        return `<td style="padding: 12px; text-align: center;">
                            <input type="checkbox" class="${menu.class}" data-key="${menu.key}" ${isChecked} ${disabledAttr}>
                        </td>`;
                    }).join('');

                    const roleInti = ["rol-01", "rol-02", "rol-03", "rol-04", "rol-05", "rol-06", "rol-07"];
                    const isRoleInti = roleInti.includes(role.idRole.toLowerCase());
                    let btnHapus = "";
                    
                    if (isRoleInti) {
                        btnHapus = `<button disabled style="background-color: #e0e0e0; color: #888; border: 1px solid #ccc; padding: 5px 10px; border-radius: 4px; cursor: not-allowed; font-size: 12px;">Bawaan Sistem</button>`;
                    } else {
                        btnHapus = `<button onclick="window.hapusRole('${role.idRole}', '${role.namaRole}')" style="background-color: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">🗑️ Hapus</button>`;
                    }

                    let row = `<tr class="baris-akses-role" data-baris="${role.barisSheet}" style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px;"><strong>${role.namaRole}</strong> <br><small style="color:gray;">${role.idRole}</small></td>
                        ${tdCheckboxes}
                        <td style="padding: 12px; text-align: center;">${btnHapus}</td>
                    </tr>`;
                    
                    tbody.innerHTML += row;
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="${totalKolom}" style="text-align:center; color:red; padding: 15px;">Gagal memuat: ${res.message}</td></tr>`;
            }
        })
        .catch(err => {
            console.error("Error matriks:", err);
            tbody.innerHTML = `<tr><td colspan="${totalKolom}" style="text-align:center; color:red; padding: 15px;">Gagal menyambungkan data ke database.</td></tr>`;
        });
    };

    window.simpanMatriksAkses = function() {
        const btn = document.getElementById('btnSimpanAkses');
        if (btn) {
            btn.disabled = true;
            btn.innerText = "⏳ Menyimpan Perubahan...";
        }

        const matrixPayload = [];
        const rows = document.querySelectorAll('.baris-akses-role');

        rows.forEach(row => {
            const barisNum = row.getAttribute('data-baris');
            const rowData = { barisSheet: parseInt(barisNum) };

            DAFTAR_MENU_AKSES.forEach(menu => {
                const chk = row.querySelector(`.${menu.class}`);
                rowData[menu.key] = chk ? chk.checked : false;
            });

            matrixPayload.push(rowData);
        });

        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "simpanMatrixRole",
                matrix: matrixPayload
            })
        })
        .then(res => res.json())
        .then(res => {
            if (btn) {
                btn.disabled = false;
                btn.innerText = "💾 Simpan Perubahan Hak Akses";
            }
            if (res.result === "success") {
                alert("🎉 Hak akses role berhasil diperbarui!");
                window.muatMatriksAkses(); 
            } else {
                alert("❌ Gagal menyimpan perubahan: " + res.message);
            }
        })
        .catch(err => {
            if (btn) {
                btn.disabled = false;
                btn.innerText = "💾 Simpan Perubahan Hak Akses";
            }
            console.error("Gagal mengirim data matrix:", err);
            alert("⚠️ Terjadi gangguan koneksi sistem saat menyimpan data.");
        });
    };

    window.prosesTambahRoleBaru = function() {
        const inputRole = document.getElementById('inputNamaRoleBaru');
        const namaRoleValue = inputRole.value.trim();

        if (!namaRoleValue) {
            alert("Silakan ketik nama role terlebih dahulu!");
            return;
        }

        if (!window.tokenTambahRole) {
            window.tokenTambahRole = "ROL-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000);
        }

        let btn = (window.event && window.event.target) ? window.event.target : null;
        if (!btn || btn.tagName !== 'BUTTON') {
            btn = inputRole.parentElement.querySelector('button'); 
        }

        const teksAsli = btn ? btn.innerText : "Tambah Role";
        if (btn) {
            btn.innerText = "Menyimpan... ⏳";
            btn.disabled = true;
        }

        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "tambahRole",
                namaRole: namaRoleValue,
                tokenId: window.tokenTambahRole
            })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                alert(`🎉 Role "${namaRoleValue}" berhasil didaftarkan ke sistem Klinik Anvaya!`);
                window.tokenTambahRole = null; 
                inputRole.value = ""; 
                
                if(typeof window.muatMatriksAkses === "function") window.muatMatriksAkses(); 
                if(typeof window.muatPilihanRole === "function") window.muatPilihanRole();  
            } else {
                alert("Gagal menambahkan role: " + res.message);
            }
        })
        .catch(err => {
            console.error("Error tambah role:", err);
            alert("⚠️ KONEKSI TERPUTUS!\n\nRole mungkin sudah ditambahkan. Sistem akan memuat ulang tabel.");
            if(typeof window.muatMatriksAkses === "function") window.muatMatriksAkses();
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

    window.hapusRole = function(idRole, namaRole) {
        const roleInti = ["rol-01", "rol-02", "rol-03", "rol-04", "rol-05", "rol-06", "rol-07"];
        if (roleInti.includes(idRole.toLowerCase())) {
            alert(`⚠️ DITOLAK: Role bawaan sistem (${namaRole}) tidak boleh dihapus!`);
            return;
        }

        if (!confirm(`TINDAKAN FATAL ⚠️\n\nApakah Anda yakin ingin menghapus role "${namaRole}" secara permanen?\n\n(Pastikan tidak ada staf User yang sedang menggunakan role ini di menu Manajemen Pengguna!)`)) {
            return;
        }

        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("Menghapus Role...");

        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "hapusRole", idRole: idRole })
        })
        .then(res => res.json())
        .then(res => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            if (res.result === "success") {
                alert(`✅ Role "${namaRole}" berhasil dihapus dari sistem!`);
                if(typeof window.muatMatriksAkses === "function") window.muatMatriksAkses(); 
                if(typeof window.muatPilihanRole === "function") window.muatPilihanRole(); 
            } else {
                alert("Gagal menghapus: " + res.message);
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            alert("⚠️ KONEKSI TERPUTUS!\n\nProses penghapusan mungkin sudah berhasil. Tabel akan dimuat ulang.");
            if(typeof window.muatMatriksAkses === "function") window.muatMatriksAkses();
        });
    };

})();