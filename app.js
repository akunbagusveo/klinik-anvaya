// =========================================================================
// ⚙️ CORE ENGINE: APLIKASI UTAMA, NAVIGASI, & AUTENTIKASI
// =========================================================================
(function() {

    // =====================================================================
    // 1. VARIABEL GLOBAL (HARUS ADA DI WINDOW AGAR TERBACA OLEH MODUL LAIN)
    // =====================================================================
    window.WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwtKbuvQhrLcVRaoo33z6MmV6oMRBK_ZGTkPFyNH5xNgAxG1j3H5GJAFuGW9WzzvKhS/exec"; 
    window.currentRole = "";
    window.cachePasienLama = []; 
    window.currentPagePasien = 1;
    window.totalPagesPasien = 1;
    window.currentKeywordPasien = "";
    window.dataAntreanGlobal = [];

    window.currentPage = 1;
    window.rowsPerPage = 10; 

    // =====================================================================
    // 2. UTILITAS & FUNGSI BANTUAN GLOBAL
    // =====================================================================
    window.resetDaftarPasien = function() {
        const txtCari = document.getElementById("txtCariDaftar");
        if (txtCari) txtCari.value = "";
        if (typeof window.cariDaftarPasien === "function") window.cariDaftarPasien(true); 
    };

    window.formatTanggalIndo = function(isoString) {
        if (!isoString) return "-"; 
        const date = new Date(isoString);
        const options = { day: '2-digit', month: 'long', year: 'numeric' };
        return date.toLocaleDateString('id-ID', options);
    };

    window.hitungUmur = function(tglLahir) {
        if (!tglLahir || tglLahir === "-") return "-";
        const dob = new Date(tglLahir);
        if (isNaN(dob)) return "-";
        const ageDifMs = Date.now() - dob.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    };

    window.formatKeBulletPoin = function(teks) {
        if (!teks || teks.trim() === "-" || teks.trim() === "") return "-";
        let kumpulanKalimat = teks.split(/\n|(?<=\S\.)\s+/);
        let hasilBullet = [];
        
        kumpulanKalimat.forEach(kalimat => {
            let kalimatBersih = kalimat.trim();
            if (kalimatBersih) {
                if (kalimatBersih.startsWith("•") || kalimatBersih.startsWith("-")) {
                    hasilBullet.push(kalimatBersih);
                } else {
                    hasilBullet.push("• " + kalimatBersih);
                }
            }
        });
        return hasilBullet.join("\n");
    };

    window.bacaFileKeBase64 = function(idElemenFile) {
        return new Promise((resolve) => {
            const fileInput = document.getElementById(idElemenFile);
            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                resolve(null); 
                return;
            }
            const file = fileInput.files[0];
            const reader = new FileReader();
            reader.onload = function(e) {
                resolve({
                    base64: e.target.result.split(',')[1],
                    mimeType: file.type,
                    namaFile: file.name
                });
            };
            reader.readAsDataURL(file);
        });
    };

    // =========================================================================
    // 3. REMOTE CONTROL: GLOBAL LOADING OVERLAY
    // =========================================================================
    window.tampilkanLoading = function(pesan = "⏳ Sedang Memproses Data...") {
        const overlay = document.getElementById('globalSpinnerOverlay');
        const teks = document.getElementById('globalSpinnerText');
        if (overlay && teks) {
            teks.innerText = pesan;
            overlay.style.display = 'flex'; 
        }
    };

    window.sembunyikanLoading = function() {
        const overlay = document.getElementById('globalSpinnerOverlay');
        if (overlay) overlay.style.display = 'none'; 
    };

    // =========================================================================
    // 4. AWAL MULAI (INITIALIZATION)
    // =========================================================================
    window.addEventListener("DOMContentLoaded", function() {
        
        // 1. Cek Sesi (Login Bypass)
        const sessionAktif = localStorage.getItem('anvaya_session');
        if (sessionAktif) {
            try {
                const dataUser = JSON.parse(sessionAktif);
                if (document.getElementById('loginPage')) document.getElementById('loginPage').style.display = 'none';
                if (document.getElementById('mainPage')) document.getElementById('mainPage').style.display = 'block';
                
                window.bukaAplikasi(dataUser.role, dataUser.username);
                if (dataUser.permissions && typeof window.aplikasikanHakAkses === "function") {
                    window.aplikasikanHakAkses(dataUser.permissions);
                }
            } catch (error) {
                console.error("Sesi rusak, membersihkan storage...", error);
                localStorage.removeItem('anvaya_session');
            }
        }

        // 2. Modul Autoload
        if (typeof window.muatPilihanRole === "function") window.muatPilihanRole();
        if (typeof window.muatMasterTindakan === "function") window.muatMasterTindakan();
        if (typeof window.jalankanRadarPing === "function") window.jalankanRadarPing();

        // 3. Batas Minimum Tanggal Kunjungan
        const inputTgl = document.getElementById('tglKunjungan');
        if (inputTgl) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            inputTgl.min = `${yyyy}-${mm}-${dd}`; 
        }

        // 4. Kunci Dropdown Pendaftaran
        const selectWaktu = document.getElementById('waktuKunjungan');
        const selectDokter = document.getElementById('pilihDokter');
        if (selectWaktu && selectDokter) {
            selectWaktu.disabled = true;
            selectDokter.disabled = true;
            selectWaktu.innerHTML = '<option value="">-- Pilih Tanggal Terlebih Dahulu --</option>';
            selectDokter.innerHTML = '<option value="">-- Pilih Waktu Terlebih Dahulu --</option>';
        }

        // 5. Sensor Draf RME
        const listIdInputRme = [
            'modalAnamnesa', 'modalObjektif', 'modalDiagnosa', 
            'modalResep', 'resep', 
            'modalProPerawatan', 'proPerawatan', 
            'modalProKontrol', 'proKontrol'
        ];
        listIdInputRme.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', function() {
                if (typeof window.simpanDraftRME === "function") window.simpanDraftRME();
            });
        });

        // 6. Listener Dropdown Pendaftaran (Rantai Otomatis)
        if (inputTgl) {
            inputTgl.addEventListener('change', function() {
                if (this.value) {
                    if (selectWaktu) {
                        selectWaktu.disabled = false;
                        selectWaktu.innerHTML = `
                            <option value="">-- Pilih Jam Kunjungan --</option>
                            <option value="11:00">11:00</option><option value="11:30">11:30</option>
                            <option value="12:00">12:00</option><option value="12:30">12:30</option>
                            <option value="13:00">13:00</option><option value="13:30">13:30</option>
                            <option value="14:00">14:00</option><option value="14:30">14:30</option>
                            <option value="15:00">15:00</option><option value="15:30">15:30</option>
                            <option value="16:00">16:00</option><option value="16:30">16:30</option>
                            <option value="17:00">17:00</option><option value="17:30">17:30</option>
                            <option value="18:00">18:00</option><option value="18:30">18:30</option>
                            <option value="19:00">19:00</option>
                        `;
                    }
                    if (selectDokter) {
                        selectDokter.value = '';
                        selectDokter.disabled = true;
                        selectDokter.innerHTML = '<option value="">-- Pilih Waktu Terlebih Dahulu --</option>';
                    }
                } else {
                    if (selectWaktu) {
                        selectWaktu.value = '';
                        selectWaktu.disabled = true;
                        selectWaktu.innerHTML = '<option value="">-- Pilih Tanggal Terlebih Dahulu --</option>';
                    }
                    if (selectDokter) {
                        selectDokter.value = '';
                        selectDokter.disabled = true;
                        selectDokter.innerHTML = '<option value="">-- Pilih Waktu Terlebih Dahulu --</option>';
                    }
                }
            });
        }

        if (selectWaktu) {
            selectWaktu.addEventListener('change', function() {
                if (this.value) {
                    window.updateDaftarDokter();
                } else {
                    if (selectDokter) {
                        selectDokter.value = '';
                        selectDokter.disabled = true;
                        selectDokter.innerHTML = '<option value="">-- Pilih Waktu Terlebih Dahulu --</option>';
                    }
                }
            });
        }

        // 7. Auto-Set Bulan Finansial
        const inputFinansial = document.getElementById('filterBulanFinansial');
        if (inputFinansial) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            inputFinansial.value = `${yyyy}-${mm}`;
        }
    });

    // =========================================================================
    // 5. UPDATE DAFTAR DOKTER (PENDAFTARAN)
    // =========================================================================
    window.updateDaftarDokter = function() {
        const tglInput = document.getElementById('tglKunjungan').value;
        const slotInput = document.getElementById('waktuKunjungan').value;
        const selectDokter = document.getElementById('pilihDokter');
        const selectWaktu = document.getElementById('waktuKunjungan');
        
        if (!tglInput || !slotInput || slotInput.includes("--") || slotInput.toLowerCase().includes("pilih")) {
            if (selectDokter) {
                selectDokter.innerHTML = '<option value="">-- Pilih Waktu Terlebih Dahulu --</option>';
                selectDokter.disabled = true;
            }
            return; 
        }

        const bagianTanggal = tglInput.split('-'); 
        const tanggalPilihan = new Date(bagianTanggal[0], bagianTanggal[1] - 1, bagianTanggal[2]);
        const daftarHari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const namaHari = daftarHari[tanggalPilihan.getDay()];
        
        if (namaHari === 'Minggu') {
            alert('Maaf, Klinik Anvaya tutup pada hari Minggu. Silakan pilih hari praktik lainnya.');
            document.getElementById('tglKunjungan').value = '';
            if (selectWaktu) {
                selectWaktu.value = '';
                selectWaktu.disabled = true;
                selectWaktu.innerHTML = '<option value="">-- Pilih Tanggal Terlebih Dahulu --</option>';
            }
            if (selectDokter) {
                selectDokter.innerHTML = '<option value="">-- Pilih Waktu Terlebih Dahulu --</option>';
                selectDokter.disabled = true;
            }
            return;
        }
        
        if (selectDokter) {
            selectDokter.innerHTML = '<option value="">⏳ Memuat dokter yang bertugas...</option>';
            selectDokter.disabled = true;
        }

        if (window.currentDokterFetch) window.currentDokterFetch.abort(); 
        window.currentDokterFetch = new AbortController();
        const signal = window.currentDokterFetch.signal;

        fetch(window.WEB_APP_URL, {
            method: "POST",
            signal: signal,
            body: JSON.stringify({ action: "getDokterTersedia", hari: namaHari, slot: slotInput, tanggal: tglInput })
        })
        .then(res => res.json())
        .then(res => {
            if (selectDokter) {
                if (res.result === "success") {
                    selectDokter.innerHTML = '<option value="">-- Pilih Dokter Bertugas --</option>';
                    if (res.data.length > 0) {
                        res.data.forEach(dok => {
                            selectDokter.innerHTML += `<option value="${dok.idDokter}">${dok.namaDokter} (${dok.jam})</option>`;
                        });
                        selectDokter.disabled = false;
                    } else {
                        selectDokter.innerHTML = '<option value="">❌ Tidak ada dokter/ Klinik tutup</option>';
                    }
                } else {
                    selectDokter.innerHTML = `<option value="">⚠️ Error System: ${res.message || 'Gagal mengambil data'}</option>`;
                }
            }
        })
        .catch(err => {
            if (err.name === 'AbortError') return; 
            console.error("Gagal memuat data dokter:", err);
            if (selectDokter) selectDokter.innerHTML = '<option value="">⚠️ Gagal memuat jadwal dokter</option>';
        });
    };

    // =========================================================================
    // 6. FUNGSI NAVIGASI & KONTROL UI TAMPILAN
    // =========================================================================
    window.toggleSidebar = function() {
        const sidebar = document.getElementById('appSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (!sidebar) return;
        sidebar.classList.toggle('open');
        if (overlay) {
            if (sidebar.classList.contains('open')) overlay.classList.add('show');
            else overlay.classList.remove('show');
        }
    };

    window.toggleDetailDokter = function(rowId, chevronId) {
        const row = document.getElementById(rowId);
        const chevron = document.getElementById(chevronId);
        if (!row || !chevron) return;
        if (row.style.display === "none") {
            row.style.display = "table-row";
            chevron.style.transform = "rotate(90deg)";
        } else {
            row.style.display = "none";
            chevron.style.transform = "rotate(0deg)";
        }
    };

    window.toggleHistoriRME = function() {
        const panelInput = document.getElementById('kolomInputRME');
        const panelHistori = document.getElementById('kolomHistoriRME');
        const btnToggle = document.getElementById('btnToggleHistori');
        if (!panelInput || !panelHistori || !btnToggle) return;
        
        const isHidden = panelHistori.style.display === 'none';
        
        if (isHidden) {
            panelHistori.style.display = 'block'; 
            panelInput.style.flex = '0 0 55%'; 
            panelInput.style.borderRight = '2px solid #bdc3c7'; 
            btnToggle.innerHTML = '👁️ Sembunyikan Histori';
            btnToggle.style.backgroundColor = '#34495e'; 
        } else {
            panelHistori.style.display = 'none';
            panelInput.style.flex = '1 1 100%'; 
            panelInput.style.borderRight = 'none'; 
            btnToggle.innerHTML = '📖 Tampilkan Histori';
            btnToggle.style.backgroundColor = '#2980b9'; 
        }
    };

    window.resetFormKePosisiNetral = function() {
        const radioBaru = document.querySelector('input[name="tipePasien"][value="baru"]');
        const radioLama = document.querySelector('input[name="tipePasien"][value="lama"]');
        if (radioBaru) radioBaru.checked = false;
        if (radioLama) radioLama.checked = false;

        const boxLama = document.getElementById('boxPasienLama');
        if (boxLama) boxLama.style.display = 'none';

        const txtRM = document.getElementById('txtNoRM');
        if (txtRM) {
            txtRM.value = "";
            txtRM.placeholder = "👈 Pilih Jenis Pasien (Baru / Lama) terlebih dahulu";
        }

        const daftarInput = ['nama', 'txtKTP', 'tempatLahir', 'tanggalLahir', 'pekerjaan', 'whatsapp', 'email', 'alamat', 'kecamatan', 'kota'];
        daftarInput.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.value = "";
                el.readOnly = false;
                el.style.backgroundColor = "#fff";
            }
        });
    };

    window.bersihkanSemuaStateUI = function() {
        document.querySelectorAll('select').forEach(sel => sel.selectedIndex = 0);

        document.querySelectorAll('input[type="text"], input[type="search"], input[type="date"], input[type="number"]').forEach(inp => {
            if (!inp.closest('#loginContainer') && !inp.closest('.login-form')) {
                inp.value = "";
            }
        });

        document.querySelectorAll('.tab-content input[type="checkbox"]').forEach(chk => chk.checked = false);

        const daftarTabelReset = [
            { id: 'tabelPengingatBody', pesan: 'Silakan klik "Refresh Data" untuk memuat tugas... ⏳', col: 7 },
            { id: 'tabelSemuaPasienBody', pesan: 'Memuat data pasien... ⏳', col: 6 },
            { id: 'tabelAntrianBody', pesan: 'Memuat data antrean... ⏳', col: 8 } 
        ];

        daftarTabelReset.forEach(tabel => {
            const tbody = document.getElementById(tabel.id);
            if (tbody) tbody.innerHTML = `<tr><td colspan="${tabel.col}" style="text-align:center; color:#7f8c8d; padding:25px;">${tabel.pesan}</td></tr>`;
        });

        if (typeof window.rawDataKontrol !== 'undefined') window.rawDataKontrol = [];
        if (typeof window.fullQueue !== 'undefined') window.fullQueue = [];
    };

    // =========================================================================
    // 7. SIKLUS HIDUP APLIKASI (LOGIN, BUKA APLIKASI, TAB, LOGOUT)
    // =========================================================================
    
    // Mencegah form login disubmit tanpa window
    window.addEventListener('load', function() {
        const formLogin = document.getElementById('formLogin');
        if (formLogin) {
            formLogin.addEventListener('submit', function(e) {
                e.preventDefault();
                const btn = document.getElementById('btnLogin');
                if(btn) { btn.disabled = true; btn.innerText = "Memverifikasi..."; }

                const payload = {
                    action: "login",
                    username: document.getElementById('loginUser').value,
                    password: document.getElementById('loginPass').value
                };

                fetch(window.WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
                .then(response => {
                    if (!response.ok) throw new Error("Status Respon API: " + response.status);
                    return response.json();
                })
                .then(data => {
                    if(btn) { btn.disabled = false; btn.innerText = "Masuk"; }

                    if (data && data.result === "success") {
                        window.currentRole = data.role;
                        
                        const dataSesi = { 
                            idUser: data.idUser, 
                            username: data.username, 
                            role: data.role,
                            namaRole: data.namaRole || data.role, 
                            permissions: data.permissions 
                        };
                        localStorage.setItem('anvaya_session', JSON.stringify(dataSesi));

                        const topNav = document.querySelector('.top-navbar');
                        const sidebar = document.getElementById('appSidebar');
                        if (topNav) topNav.style.display = 'flex'; 
                        if (sidebar) sidebar.style.display = 'block';
                        
                        try { window.bukaAplikasi(data.role, data.username); } catch (e) { console.error("Error UI bukaAplikasi:", e); }
                        try { if(typeof window.aplikasikanHakAkses === "function") window.aplikasikanHakAkses(data.permissions); } catch (e) { console.error("Error hak akses:", e); }

                    } else { 
                        let pesanEror = data.message || data.error || data.pesan || "Format dari server tidak sesuai.";
                        alert("⚠️ Gagal Masuk: " + pesanEror); 
                    }
                })
                .catch(err => {
                    if(btn) { btn.disabled = false; btn.innerText = "Masuk"; }
                    console.error("Koneksi gagal:", err);
                    alert("⚠️ Sistem Gagal Terhubung. Detail Error: " + err.message);
                });
            });
        }
    });

    window.bukaAplikasi = async function(role, username) {
        const setDisplayAman = (id, value) => { const el = document.getElementById(id); if (el) el.style.display = value; };
        const setTextAman = (id, text) => { const el = document.getElementById(id); if (el) el.innerText = text; };

        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        const kamusRoleCadangan = {
            'ROL-01': 'Super Admin', 'ROL-02': 'Admin', 'ROL-03': 'Dokter',
            'ROL-04': 'Perawat', 'ROL-05': 'Apoteker', 'ROL-06': 'Kasir',
            'ROL-07': 'Frontdesk', 'ROL-08': 'Digital Marketing'
        };

        // 🔥 PERBAIKAN BUG ROLE (Sangat Rapi): 
        let roleTampil = role;
        if (sessionData && sessionData.namaRole) {
            roleTampil = sessionData.namaRole;
        } else if (kamusRoleCadangan[role]) {
            roleTampil = kamusRoleCadangan[role];
        }

        setTextAman('txtUserStatus', `User: ${username} `);
        setTextAman('lblNamaUser', username);
        setTextAman('lblRoleUser', roleTampil); 
        
        setDisplayAman('loginPage', 'none');
        setDisplayAman('mainPage', 'block');

        const topNav = document.querySelector('.top-navbar');
        const sidebar = document.getElementById('appSidebar');
        if (topNav) topNav.style.display = 'flex'; 
        if (sidebar) sidebar.style.display = 'block';

        setDisplayAman('tabBerandaBtn', 'block');
        setDisplayAman('tabPendaftaranBtn', 'none');
        setDisplayAman('tabAntreanBtn', 'none'); 
        setDisplayAman('tabRiwayatMedisBtn', 'none'); 
        setDisplayAman('tabDaftarPasienBtn', 'none'); 
        setDisplayAman('tabKamusDikteBtn', 'none'); 
        setDisplayAman('tabBackendBtn', 'none');    
        setDisplayAman('tabAnalisisBisnisBtn', 'none');
        setDisplayAman('tabKasirBtn', 'none');

        setDisplayAman('menuPendaftaranCard', 'none');
        setDisplayAman('menuAntreanCard', 'none');
        setDisplayAman('menuRiwayatCard', 'none');
        setDisplayAman('menuDaftarPasienCard', 'none'); 

        const roleCek = role ? role.toString().trim().toLowerCase() : "";
        if (roleCek === "perawat" || roleCek === "rol-04") {
            if (typeof window.ambilNoRMOtomatis === "function") window.ambilNoRMOtomatis();
        } else if (roleCek === "dokter" || roleCek === "rol-03") {
            if (typeof window.muatJadwalDokter === "function") window.muatJadwalDokter(username);
        }

        window.switchTab('beranda');
        
        try { if (typeof window.muatAntreanHariIni === "function") window.muatAntreanHariIni(); } catch(e) {}
        await new Promise(resolve => setTimeout(resolve, 600));
        try { if (typeof window.cariDaftarPasien === "function") window.cariDaftarPasien(true); } catch(e) {}
    };

    window.muatJadwalDokter = function(namaDokter) {
        fetch(window.WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getJadwal', namaDokter: namaDokter })
        })
        .then(res => res.json())
        .then(res => {
            const list = document.getElementById('listJadwalDokter');
            const card = document.getElementById('cardJadwalDokter');
            if (!list) return; 
            
            list.innerHTML = '';
            if(res.result === 'success' && res.data.length > 0) {
                if (card) card.style.display = 'block';
                res.data.forEach(row => {
                    list.innerHTML += `<li><strong>${row[1]}</strong> : ${row[2]} - ${row[3]} (${row[4]})</li>`;
                });
            } else {
                list.innerHTML = '<li>Anda tidak memiliki jadwal terdaftar minggu ini atau login bukan sebagai Dokter.</li>';
            }
        })
        .catch(err => console.error("Error muat jadwal dokter:", err));
    };

    window.logout = function() {
        window.currentRole = ""; 
        localStorage.removeItem('anvaya_session');

        window.bersihkanSemuaStateUI();

        const topNav = document.querySelector('.top-navbar');
        const sidebar = document.getElementById('appSidebar');
        if (topNav) topNav.style.display = 'none';
        if (sidebar) sidebar.style.display = 'none';
        
        document.querySelectorAll('form').forEach(form => form.reset());
        
        const elemenTutup = ['sectionRME', 'mainPage', 'modalRiwayatFull', 'subTabFinansial', 'subTabOperasional'];
        elemenTutup.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        try {
            const elemenFinansial = ['pillGrafik', 'pillKinerja', 'pillTabel'];
            elemenFinansial.forEach(id => { const el = document.getElementById(id); if (el) el.style.display = 'none'; });
            document.querySelectorAll('#subTabFinansial tbody').forEach(tb => tb.innerHTML = '');
            
            window.cacheDataUlangTahun = [];
            if (typeof window.dataBagiHasil !== "undefined") window.dataBagiHasil = null;
            if (typeof window.dataOmzet !== "undefined") window.dataOmzet = null;
            window.arsipGajiTerkunci = null; 
            window.rawDataBagiHasil = null;
            window.dataBagiHasilGlobal = null;
            
        } catch (e) {
            console.error("Gagal melakukan sanitasi DOM finansial saat logout:", e);
        }

        const loginPage = document.getElementById('loginPage');
        if (loginPage) loginPage.style.display = 'block';
    };

    window.switchTab = function(tabId) {
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('appSidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('show');
        }

        document.querySelectorAll('.sidebar-menu .tab-link, .nav-tabs .tab-link').forEach(tombol => {
            tombol.classList.remove('active');
        });

        document.querySelectorAll('.tab-content').forEach(el => {
            el.classList.remove('active');
            el.style.display = 'none';
        });
        
        const targetTab = document.getElementById(tabId);
        if (targetTab) {
            targetTab.classList.add('active');
            targetTab.style.display = 'block';
        }
        
        const idTombolAktif = 'tab' + tabId.charAt(0).toUpperCase() + tabId.slice(1) + 'Btn';
        const tombolAktif = document.getElementById(idTombolAktif);
        if (tombolAktif) tombolAktif.classList.add('active');

        if (tabId === 'formPendaftaran' || tabId === 'pendaftaran') {
            window.resetFormKePosisiNetral();
            window.tokenPendaftaranUnik = "TX-" + new Date().getTime() + "-" + Math.floor(Math.random() * 10000);
        }

        if (tabId === 'dokter' || tabId === 'kalenderDokter') {
            if (typeof window.muatKalenderDokter === "function") window.muatKalenderDokter();
        }

        if (tabId === 'beranda' && typeof window.muatDashboardStatistik === "function") {
            window.muatDashboardStatistik();
        }
        
        if ((tabId === 'antrean' || tabId === 'pasien') && typeof window.muatAntreanHariIni === "function") {
            const btnAntrean = document.getElementById('tabAntreanBtn');
            if (btnAntrean) btnAntrean.classList.add('active');
            window.muatAntreanHariIni(1);
        }
        
        if (tabId === 'kamusDikte' && typeof window.muatKamusDikte === "function") window.muatKamusDikte();
        if (tabId === 'analisisBisnis' && typeof window.muatAnalisisBisnis === "function") window.muatAnalisisBisnis(); 
        if ((tabId === 'backend' || tabId === 'pengaturan') && typeof window.muatDataUser === "function") window.muatDataUser();
        if (tabId === 'kasir' && typeof window.muatAntreanKasir === "function") window.muatAntreanKasir();

        if (tabId === 'pengingatKontrol') {
            const sessionData = JSON.parse(localStorage.getItem('anvaya_session'));
            const roleAktif   = sessionData ? (sessionData.role || "").toLowerCase().trim() : "";
            if (roleAktif === "dokter" || roleAktif === "rol-03" || roleAktif.includes("dr.")) {
                alert("⚠️ AKSES DITOLAK: Menu Worklist Kontrol dikhususkan untuk Staf Pendaftaran / Perawat guna manajemen panggilan pasien.");
                window.switchTab('beranda');
                return; 
            }
        }
    };

    window.switchTabRME = function(tab) {
        const btnForm = document.getElementById('tabRmeFormBtn');
        const btnRiwayat = document.getElementById('tabRmeRiwayatBtn');
        
        if (btnForm) {
            btnForm.style.background = tab === 'form' ? '#9b59b6' : '#e0e0e0';
            btnForm.style.color = tab === 'form' ? 'white' : '#333';
        }
        if (btnRiwayat) {
            btnRiwayat.style.background = tab === 'riwayat' ? '#9b59b6' : '#e0e0e0';
            btnRiwayat.style.color = tab === 'riwayat' ? 'white' : '#333';
        }
    };

    window.bukaSubTab = function(subTabId) {
        document.querySelectorAll('.sub-tab-content').forEach(el => el.style.display = 'none');
        
        const tabMaster = document.getElementById('tabMasterTindakan');
        if (tabMaster) tabMaster.style.display = 'none';
        
        const target = document.getElementById(subTabId);
        if (target) target.style.display = 'block';
        
        const btnUser = document.getElementById('subTabUserBtn');
        const btnAkses = document.getElementById('subTabAksesBtn');
        const btnJadwal = document.getElementById('subTabJadwalBtn');
        const btnLog = document.getElementById('subTabLogBtn');
        const btnMaster = document.getElementById('subTabMasterTindakanBtn');

        if (btnUser) btnUser.style.backgroundColor = (subTabId === 'manajemenUser') ? '#ddd' : '';
        if (btnAkses) btnAkses.style.backgroundColor = (subTabId === 'manajemenAkses') ? '#ddd' : '';
        if (btnJadwal) btnJadwal.style.backgroundColor = (subTabId === 'manajemenJadwal') ? '#ddd' : '';
        if (btnLog) btnLog.style.backgroundColor = (subTabId === 'manajemenLog') ? '#ddd' : '';
        if (btnMaster) btnMaster.style.backgroundColor = (subTabId === 'masterTindakan') ? '#ddd' : '';

        if (subTabId === 'manajemenUser') {
            if (typeof window.muatDataUser === "function") window.muatDataUser();
            if (typeof window.muatPilihanRole === "function") window.muatPilihanRole(); 
        } else if (subTabId === 'manajemenAkses') {
            if (typeof window.muatMatriksAkses === "function") window.muatMatriksAkses();
        } else if (subTabId === 'manajemenJadwal') {
            if (typeof window.muatDropdownDokterJadwal === "function") window.muatDropdownDokterJadwal(); 
            if (typeof window.muatJadwalMaster === "function") window.muatJadwalMaster(); 
        } else if (subTabId === 'manajemenLog') {
            if (typeof window.muatLogAktivitas === "function") window.muatLogAktivitas(1);
        } else if (subTabId === 'masterTindakan') {
            if (tabMaster) tabMaster.style.display = 'block'; 
            if (typeof window.initMasterTindakan === "function") window.initMasterTindakan(); 
        }
    };

})();