const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwtKbuvQhrLcVRaoo33z6MmV6oMRBK_ZGTkPFyNH5xNgAxG1j3H5GJAFuGW9WzzvKhS/exec"; 
    let currentRole = "";
    let cachePasienLama = []; 
    let currentPagePasien = 1;
    let totalPagesPasien = 1;
    let currentKeywordPasien = "";
    let dataAntreanGlobal = [];
    
    let currentPage = 1;
    const rowsPerPage = 10; // Jumlah baris yang ingin ditampilkan per halaman
    
    // Variabel Global Penampung Master Tindakan
    window.masterTindakanGlobal = [];
    // 🔥 PENANDA GLOBAL INFORMED CONSENT
    window.consentSudahDisimpanHariIni = false;

    



    // --- FITUR: FILTER ANTREAN DOKTER ---
    function terapkanFilterAntrean() {
        const statusDipilih = document.getElementById("filterStatusAntrean").value;
        renderTabelAntrean(statusDipilih);
    }

    function formatTanggalIndo(isoString) {
    if (!isoString) return "-"; // Jika datanya kosong, tampilkan strip
    
        const date = new Date(isoString);
        
        // Opsi pengaturan format: "02 Februari 2002"
        const options = { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
        };
        
        return date.toLocaleDateString('id-ID', options);
    }

    function renderTabelAntrean(filterStatus = "Semua") {
        const tbody = document.getElementById('tabelAntreanBody');
        tbody.innerHTML = '';

        // A. AMBIL DATA HAK AKSES OPERATOR DARI STORAGE
        const sessionData = JSON.parse(localStorage.getItem('anvaya_session'));
        const perms = sessionData ? sessionData.permissions : {};
        
        const bolehInputRME   = perms.aksesInputRME === 1;
        const bolehEditAntrean = perms.aksesEditAntrean === 1;

        if (!dataAntreanGlobal || dataAntreanGlobal.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Tidak ada antrean pasien untuk rentang tanggal ini.</td></tr>`;
            return;
        }

        // 🔥 FIX 1: FILTER DROPDOWN DINAMIS (Menggunakan includes agar Rujukan tidak hilang)
        let dataTerfilter = dataAntreanGlobal;
        if (filterStatus === "Semua") {
            dataTerfilter = dataAntreanGlobal.filter(pasien => !pasien.status.includes("Dibatalkan") && !pasien.status.includes("Tidak Datang"));
        } else if (["Belum Diperiksa", "Sedang Diperiksa", "Sudah Diperiksa", "Tidak Datang"].includes(filterStatus)) {
            dataTerfilter = dataAntreanGlobal.filter(pasien => pasien.status.includes(filterStatus));
        } else if (filterStatus === "Perlu Input RME") {
            dataTerfilter = dataAntreanGlobal.filter(pasien => pasien.status.includes("Sudah Diperiksa") && !pasien.isRmeFilled);
        }

        if (dataTerfilter.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#7f8c8d; padding: 20px;">Tidak ada data pasien untuk kategori <b>${filterStatus}</b>.</td></tr>`;
            return;
        }

        const h = new Date();
        const formatHariIni = `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;

        dataTerfilter.forEach(pasien => {
            
            let statusEfektif = pasien.status;
            // 🔥 FIX 2: PENENTUAN STATUS DINAMIS
            if (pasien.status.includes("Sudah Diperiksa") && !pasien.isRmeFilled) {
                statusEfektif = "Sedang Diperiksa";
            }

            let badgeClass = "badge-belum";
            if(statusEfektif.includes("Sedang Diperiksa")) badgeClass = "badge-sedang";
            if(statusEfektif.includes("Sudah Diperiksa")) badgeClass = "badge-sudah";

            let rmeStatusIndicator = pasien.isRmeFilled ? 
                '<br><span style="color: #2ecc71; font-size: 11px;">✔️ RME Tersimpan</span>' : 
                '<br><span style="color: #e74c3c; font-size: 11px;">❌ RME Kosong</span>';

            let tombolAksi = "";
            
            // 🔥 FIX 3: LOGIKA TOMBOL DINAMIS & INJEKSI ROW NUMBER
            if (statusEfektif.includes("Belum Diperiksa")) {
                
                let btnMulai = bolehInputRME ? `<button class="btn-action btn-start" onclick="gantiStatusPasien(${pasien.rowNumber}, 'Sedang Diperiksa', '${pasien.noRM}', '${pasien.nama}', '${pasien.tanggalDaftar}')">▶️ Mulai</button>` : '';
                let btnEdit  = bolehEditAntrean ? `<button class="btn-action" style="background-color: #f39c12; color: white;" onclick="bukaModalEditAntrean(${pasien.rowNumber}, '${pasien.tanggalDaftar}', '${pasien.waktu}', '${pasien.tujuan}', '${pasien.namaDokter || ''}')">📝 Edit</button>` : '';
                let btnBatal = bolehEditAntrean ? `<button class="btn-action" style="background-color: #e74c3c; color: white;" onclick="gantiStatusPasien(${pasien.rowNumber}, 'Dibatalkan')">❌ Batal</button>` : '';
                let btnAbsen = bolehEditAntrean ? `<button class="btn-action" style="background-color: #95a5a6; color: white;" onclick="gantiStatusPasien(${pasien.rowNumber}, 'Tidak Datang')">🕒 Absen</button>` : '';

                tombolAksi = `<div style="display: flex; gap: 5px; flex-wrap: wrap;">${btnMulai} ${btnEdit} ${btnBatal} ${btnAbsen}</div>`;
                if (!tombolAksi.trim()) tombolAksi = '<span style="color:#7f8c8d; font-size:12px;">Tidak ada akses</span>';

            } else if (statusEfektif.includes("Sedang Diperiksa")) {
                
                // ⚠️ KUNCI IDENTITAS: Variabel '${pasien.rowNumber}' ditambahkan di akhir parameter!
                tombolAksi = bolehInputRME ? `<button class="btn-action" style="background-color: #3498db; color: white; font-weight: bold;" onclick="bukaModalRiwayatFull('${pasien.noRM}', '${pasien.nama}', 'input', '${pasien.tanggalDaftar}', '${pasien.rowNumber}')">✍️ Lanjut Input RME</button>` : '<span style="color:#7f8c8d; font-size:12px;">Menunggu Dokter</span>';
            
            } else if (statusEfektif.includes("Sudah Diperiksa")) {
                
                // ⚠️ KUNCI IDENTITAS: Variabel '${pasien.rowNumber}' ditambahkan di akhir parameter!
                if (pasien.tanggalDaftar === formatHariIni && perms.editRME === 1) {
                    tombolAksi = `<button class="btn-action btn-rme" style="background-color: #3498db;" onclick="bukaModalRiwayatFull('${pasien.noRM}', '${pasien.nama}', 'view', '${pasien.tanggalDaftar}', '${pasien.rowNumber}')">👁️ Buka RME</button>`;
                } else {
                    tombolAksi = `<button class="btn-action btn-rme" style="background-color: #7f8c8d;" onclick="bukaModalRiwayatFull('${pasien.noRM}', '${pasien.nama}', 'view', '${pasien.tanggalDaftar}', '${pasien.rowNumber}')">👁️ Lihat RME</button>`;
                }
            }
            else if (pasien.status.includes("Tidak Datang")) {
                tombolAksi = bolehEditAntrean ? `<button class="btn-action" style="background-color: #2ecc71; color: white; font-weight: bold;" onclick="gantiStatusPasien(${pasien.rowNumber}, 'Belum Diperiksa')">🔄 Kembalikan ke Antrean</button>` : '-';
            }

            tbody.innerHTML += `<tr>
                <td><strong>${pasien.nama}</strong><br><small>RM: ${pasien.noRM}</small></td>
                <td>${pasien.tanggalDaftar}</td> 
                <td>${pasien.waktu}</td>
                <td>${pasien.tujuan}</td>
                <td style="font-weight:bold; color:#2c3e50;">${pasien.namaDokter || '-'}</td>
                <td>
                    <span class="badge ${badgeClass}">${statusEfektif}</span> 
                    ${statusEfektif.includes("Sudah Diperiksa") ? rmeStatusIndicator : ""}
                </td>
                <td>${tombolAksi}</td>
            </tr>`;
        });
    }

    // --- FITUR: LIHAT DETAIL PASIEN ---
    function lihatDetailPasien(noRM) {
        console.log("Memuat detail untuk No RM:", noRM);

        const modal = document.getElementById('modalDetailPasien');
        if (!modal) {
            console.warn("Modal dengan ID 'modalDetailPasien' tidak ditemukan.");
            return;
        }

        // Tampilkan modal terlebih dahulu dengan tulisan loading
        modal.style.display = 'block';
        
        // Sembunyikan konten utama modal sebentar untuk loading (opsional jika ada id nya)
        // atau biarkan sistem melakukan fetch data berikut:

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "getDetailPasien", // 🔥 Memanggil aksi di kode.gs
                noRM: noRM
            })
        })
        .then(response => response.json())
        .then(res => {
            if(res.result === 'success' && res.data) {
                // 🔥 SESUAIKAN ID BERIKUT DENGAN ID YANG ADA DI HTML MODAL ANDA
                if(document.getElementById('modalNoRM')) document.getElementById('modalNoRM').value = res.data.noRM || "-";
                if(document.getElementById('modalNama')) document.getElementById('modalNama').value = res.data.nama || "-";
                if(document.getElementById('modalGender')) document.getElementById('modalGender').value = res.data.gender || "-";
                if(document.getElementById('modalPhone')) document.getElementById('modalPhone').value = res.data.phone || "-";
                if(document.getElementById('modalAlamat')) document.getElementById('modalAlamat').value = res.data.alamat || "-";
                
                // Jika modal Anda menggunakan teks biasa (bukan input field), ganti .value menjadi .innerText
            } else {
                alert("Gagal memuat detail pasien: " + res.message);
            }
        })
        .catch(err => {
            console.error("Gagal memuat detail:", err);
            alert("Terjadi gangguan koneksi saat memuat detail pasien.");
        });
    }


    function changePage(direction) {
        // 🔥 Ubah agar menggunakan variabel halaman milik cariDaftarPasien
        let newPage = halamanSekarangPasien + direction;
        
        // Melakukan fetch halaman baru jika halaman valid (minimal halaman 1)
        if (newPage >= 1) { 
            halamanSekarangPasien = newPage;
            
            // 🔥 Belokkan panggilannya ke fungsi cariDaftarPasien
            // parameter 'false' memastikan kata kunci pencarian di input tidak ter-reset
            cariDaftarPasien(false); 
        }
    }

    function resetDaftarPasien() {
        document.getElementById("txtCariDaftar").value = "";
        cariDaftarPasien(true); // 🔥 PERUBAHAN: Ubah muatDaftarPasien(1) menjadi cariDaftarPasien(true)
    }

    // --- INITIALIZATION ---
    document.addEventListener("DOMContentLoaded", function() {
        // 🔥 1. CEK SESI DI MILIDETIK PERTAMA
        const sessionAktif = localStorage.getItem('anvaya_session');
        
        if (sessionAktif) {
            try {
                const dataUser = JSON.parse(sessionAktif);
                if (document.getElementById('loginPage')) document.getElementById('loginPage').style.display = 'none';
                if (document.getElementById('mainPage')) document.getElementById('mainPage').style.display = 'block';
                
                bukaAplikasi(dataUser.role, dataUser.username);
                if (dataUser.permissions) {
                    aplikasikanHakAkses(dataUser.permissions);
                }
            } catch (error) {
                console.error("Sesi rusak, membersihkan storage...", error);
                localStorage.removeItem('anvaya_session');
            }
        }

        // 🔥 2. JALANKAN FUNGSI INITIALIZATION
        muatPilihanRole();
        muatDaftarDokter();
        muatMasterTindakan();
        jalankanRadarPing();

        // --- Manajemen Batas Minimum Tanggal Kunjungan ---
        const inputTgl = document.getElementById('tglKunjungan');
        if (inputTgl) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            inputTgl.min = `${yyyy}-${mm}-${dd}`; 
        }

        // 🔥 3. PENGUNCIAN AWAL DROPDOWN BERANTAI (UX REINFORCEMENT)
        const selectWaktu = document.getElementById('waktuKunjungan');
        const selectDokter = document.getElementById('pilihDokter');

        if (selectWaktu && selectDokter) {
            // Kunci dropdown waktu & dokter saat halaman pertama kali dimuat
            selectWaktu.disabled = true;
            selectDokter.disabled = true;
            selectWaktu.innerHTML = '<option value="">-- Pilih Tanggal Terlebih Dahulu --</option>';
            selectDokter.innerHTML = '<option value="">-- Pilih Waktu Terlebih Dahulan --</option>';
        }

        // 🔥 4. FUNGSI UTAMA: AMBIL DATA DOKTER (SUDAH DI-FIX AGAR ADAPTIF & ANTI-PREMATUR)
        // 🔥 TAMBAHKAN VARIABEL INI TEPAT DI ATAS FUNGSI UPDATE DOKTER
        // Ini berfungsi sebagai loket tiket antrean untuk mendeteksi klik terakhir
        //let antreanRequestDokter = 0;

        function updateDaftarDokter() {
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
            
            selectDokter.innerHTML = '<option value="">⏳ Memuat dokter yang bertugas...</option>';
            selectDokter.disabled = true;

            // 🔥 FITUR PEMBATAL PINTAR (ABORT CONTROLLER GLOBAL)
            // Membatalkan request fetch sebelumnya yang masih nyangkut/loading di latar belakang!
            if (window.currentDokterFetch) {
                window.currentDokterFetch.abort(); 
            }
            // Buat pengontrol baru, tempelkan ke "window" agar kebal dari masalah blok/scope!
            window.currentDokterFetch = new AbortController();
            const signal = window.currentDokterFetch.signal;

            fetch(WEB_APP_URL, {
                method: "POST",
                signal: signal, // 🔗 Kaitkan sinyal pembatalan mutlak ke Fetch API ini
                body: JSON.stringify({ 
                    action: "getDokterTersedia", 
                    hari: namaHari,
                    slot: slotInput,
                    tanggal: tglInput 
                })
            })
            .then(res => res.json())
            .then(res => {
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
            })
            .catch(err => {
                // 🔥 TANGKAP PEMBATALAN: Jika sistem me-kill request lama, diamkan saja (UI tidak akan tertimpa)
                if (err.name === 'AbortError') {
                    console.warn("Request server 14:00 dibatalkan otomatis karena user mengubah ke 14:30");
                    return; // Proses berhenti bersih tanpa error lanjutan
                }
                
                console.error("Gagal memuat data dokter:", err);
                selectDokter.innerHTML = '<option value="">⚠️ Gagal memuat jadwal dokter</option>';
            });
        }

        // 🔥 5. LINTAS EVENT LISTENER UNTUK KONTROL RANTAI DROPDOWN
        if (inputTgl) {
            inputTgl.addEventListener('change', function() {
                if (this.value) {
                    // Tanggal diisi: Buka opsi dropdown waktu
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
                    
                    // 🔥 KUNCI UTAMA: Cukup reset dokter, JANGAN panggil updateDaftarDokter() di sini!
                    if (selectDokter) {
                        selectDokter.value = '';
                        selectDokter.disabled = true;
                        selectDokter.innerHTML = '<option value="">-- Pilih Waktu Terlebih Dahulu --</option>';
                    }
                } else {
                    // Tanggal kosong: Kunci kembali waktu & dokter
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
                    // 🔥 Waktu diisi: BARU sistem boleh menembak server untuk mencari dokter!
                    updateDaftarDokter();
                } else {
                    // Waktu dikosongkan kembali: Kunci dropdown dokter
                    if (selectDokter) {
                        selectDokter.value = '';
                        selectDokter.disabled = true;
                        selectDokter.innerHTML = '<option value="">-- Pilih Waktu Terlebih Dahulu --</option>';
                    }
                }
            });
        }

        // --- Sensor Draf Otomatis ---
        const listIdInputRme = [
            'modalAnamnesa', 'modalObjektif', 'modalDiagnosa', 
            'modalResep', 'resep', 
            'modalProPerawatan', 'proPerawatan', 
            'modalProKontrol', 'proKontrol'
        ];
        
        listIdInputRme.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', simpanDraftRME);
        });
    });

    // =========================================================================
    // 🔥 AUTENTIKASI LOGIN DINAMIS (MENANGKAP NAMA ROLE DARI GOOGLE SHEETS)
    // =========================================================================
    document.getElementById('formLogin').addEventListener('submit', function(e) {
            e.preventDefault();
            const btn = document.getElementById('btnLogin');
            btn.disabled = true; 
            btn.innerText = "Memverifikasi...";

            const payload = {
                action: "login",
                username: document.getElementById('loginUser').value,
                password: document.getElementById('loginPass').value
            };

            fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
            .then(response => {
                if (!response.ok) throw new Error("Status Respon API: " + response.status);
                return response.json();
            })
            .then(data => {
                btn.disabled = false; 
                btn.innerText = "Masuk";

                if (data && data.result === "success") {
                    currentRole = data.role;
                    
                    // 🔥 UPGRADE DINAMIS: Tangkap "namaRole" dari server dan simpan ke localStorage
                    // Jika server tidak mengirim namaRole, baru gunakan fallback ke data.role
                    const dataSesi = { 
                        idUser: data.idUser, 
                        username: data.username, 
                        role: data.role,
                        namaRole: data.namaRole || data.role, // <-- INI KUNCI AGAR SISTEM 100% DINAMIS!
                        permissions: data.permissions 
                    };
                    localStorage.setItem('anvaya_session', JSON.stringify(dataSesi));

                    const topNav = document.querySelector('.top-navbar');
                    const sidebar = document.getElementById('appSidebar');
                    if (topNav) topNav.style.display = 'flex'; 
                    if (sidebar) sidebar.style.display = 'block';
                    
                    try {
                        bukaAplikasi(data.role, data.username);
                    } catch (errUI) {
                        console.error("Terjadi masalah visual pada dashboard:", errUI);
                    }
                    
                    try {
                        aplikasikanHakAkses(data.permissions);
                    } catch (errAkses) {
                        console.error("Gagal mengaplikasikan hak akses menu:", errAkses);
                    }

                } else { 
                    let pesanEror = data.message || data.error || data.pesan;
                    if (!pesanEror) {
                        pesanEror = "Format dari server tidak sesuai: " + JSON.stringify(data);
                    }
                    alert("⚠️ Gagal Masuk: " + pesanEror); 
                }
            })
            .catch(err => {
                btn.disabled = false; 
                btn.innerText = "Masuk";
                console.error("Koneksi gagal atau terjadi bug sistem:", err);
                alert("⚠️ Sistem Gagal Terhubung. Detail Error: " + err.message);
            });
    });

    // =========================================================
    // 🧹 MESIN SAPU JAGAT: PEMBERSIH SESI & FILTER UI
    // =========================================================
    function bersihkanSemuaStateUI() {
        // 1. Reset SEMUA Dropdown <select> di seluruh aplikasi ke pilihan pertama (default)
        document.querySelectorAll('select').forEach(sel => {
            sel.selectedIndex = 0;
        });

        // 2. Kosongkan SEMUA kotak pencarian <input> (teks, tanggal, angka, pencarian)
        document.querySelectorAll('input[type="text"], input[type="search"], input[type="date"], input[type="number"]').forEach(inp => {
            // Abaikan input pada form login agar tidak mengganggu layar login
            if (!inp.closest('#loginContainer') && !inp.closest('.login-form')) {
                inp.value = "";
            }
        });

        // 3. Reset SEMUA Checkbox & Radio Button (kecuali di pengaturan yang bersifat statis jika ada)
        document.querySelectorAll('.tab-content input[type="checkbox"]').forEach(chk => {
            chk.checked = false;
        });

        // 4. Kosongkan isi tabel-tabel utama agar pengguna baru tidak melihat "kejap" data lama
        const daftarTabelReset = [
            { id: 'tabelPengingatBody', pesan: 'Silakan klik "Refresh Data" untuk memuat tugas... ⏳', col: 7 },
            { id: 'tabelSemuaPasienBody', pesan: 'Memuat data pasien... ⏳', col: 6 },
            { id: 'tabelAntrianBody', pesan: 'Memuat data antrean... ⏳', col: 8 } // Sesuaikan ID tabel antrean Anda
        ];

        daftarTabelReset.forEach(tabel => {
            const tbody = document.getElementById(tabel.id);
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="${tabel.col}" style="text-align:center; color:#7f8c8d; padding:25px;">${tabel.pesan}</td></tr>`;
            }
        });

        // 5. Kosongkan variabel memori sementara (Array data penampung di JavaScript)
        if (typeof rawDataKontrol !== 'undefined') rawDataKontrol = [];
        if (typeof fullQueue !== 'undefined') fullQueue = [];
        // (Tambahkan variabel array global lain jika ada di sistem antrean/pasien Anda)
    }

    // =========================================================================
    // UPGRADE FUNGSI PENGATUR TIPE PASIEN (0 DETIK AUTO-GENERATE RM)
    // =========================================================================
    function aturTipePasien(tipe) {
        const boxLama = document.getElementById('boxPasienLama');
        const daftarInput = ['txtNoRM', 'nama', 'txtKTP', 'tempatLahir', 'tanggalLahir', 'pekerjaan', 'whatsapp', 'email', 'alamat', 'kecamatan', 'kota'];

        if (tipe === 'lama') {
            boxLama.style.display = 'block';
            bukaModalCariPasien(); 
        } else {
            boxLama.style.display = 'none';
            
            // 1. Kosongkan seluruh form & buka kunci readonly
            daftarInput.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    if (id !== 'txtNoRM') el.readOnly = false; // txtNoRM tetap readonly
                    el.style.backgroundColor = "#fff";
                    el.value = "";
                }
            });
            
            // 2. Reset radio gender ke default
            if (document.getElementById('rbLaki')) document.getElementById('rbLaki').checked = true;

            // =====================================================================
            // 🔥 SOLUSI KUNCI 0 DETIK: Panggil generator instan dari RAM lokal!
            // =====================================================================
            generateNoRMInstan(); 
            // =====================================================================
        }
    }

    // =========================================================================
    // 🧹 KEMBALIKAN FORM KE POSISI NETRAL (STANDBY STATE)
    // =========================================================================
    function resetFormKePosisiNetral() {
        // 1. Kosongkan cetangan kedua radio button jenis pasien
        const radioBaru = document.querySelector('input[name="tipePasien"][value="baru"]');
        const radioLama = document.querySelector('input[name="tipePasien"][value="lama"]');
        if (radioBaru) radioBaru.checked = false;
        if (radioLama) radioLama.checked = false;

        // 2. Sembunyikan kotak tombol pencarian pasien lama jika sedang terbuka
        const boxLama = document.getElementById('boxPasienLama');
        if (boxLama) boxLama.style.display = 'none';

        // 3. Ubah teks placeholder No. RM agar memberi petunjuk kepada staf
        const txtRM = document.getElementById('txtNoRM');
        if (txtRM) {
            txtRM.value = "";
            txtRM.placeholder = "👈 Pilih Jenis Pasien (Baru / Lama) terlebih dahulu";
        }

        // 4. Kosongkan seluruh kotak input form lainnya
        const daftarInput = ['nama', 'txtKTP', 'tempatLahir', 'tanggalLahir', 'pekerjaan', 'whatsapp', 'email', 'alamat', 'kecamatan', 'kota'];
        daftarInput.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.value = "";
                el.readOnly = false;
                el.style.backgroundColor = "#fff";
            }
        });
    }

    function formatTanggalUntukInput(dateVal) {
        if (!dateVal) return "";
        let str = String(dateVal).trim();
        if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(str)) {
            return str.substring(0, 10).replace(/\//g, '-');
        }
        let parts = str.split(/[-/]/);
        if (parts.length === 3 && parts[2].length === 4) { 
            let day = parts[0].padStart(2, '0');
            let month = parts[1].padStart(2, '0');
            let year = parts[2];
            return `${year}-${month}-${day}`;
        }
        return "";
    }


    function ambilNoRMOtomatis() {
        fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getNewRM' })
        })
        .then(res => res.json())
        .then(res => {
            if(res.result === 'success') {
                document.getElementById('txtNoRM').value = res.noRM;
            }
        })
        .catch(err => console.error("Gagal men-generate No. RM:", err));
    }

    // =========================================================================
    // ⚡ GENERATOR NO. RM SUPER KILAT (0 DETIK / INSTAN DARI RAM LOKAL)
    // =========================================================================
    function generateNoRMInstan() {
        const txtRM = document.getElementById('txtNoRM');
        if (!txtRM) return;

        // 1. Cek apakah database pasien sudah tersimpan di memori cache browser
        if (typeof cacheMasterPasien !== 'undefined' && cacheMasterPasien.length > 0) {
            let maxNum = 0;
            
            // 2. Pindai seluruh data pasien untuk mencari angka No. RM terbesar
            cacheMasterPasien.forEach(p => {
                let rmStr = (p.noRM || p[0] || "").toString();
                // Ekstrak angkanya saja (Contoh: "RM-0077" akan diubah menjadi angka mutlak 77)
                let numPart = parseInt(rmStr.replace(/[^0-9]/g, ''), 10);
                if (!isNaN(numPart) && numPart > maxNum) {
                    maxNum = numPart;
                }
            });

            // 3. Tambahkan 1 untuk nomor pasien baru (77 + 1 = 78 -> "RM-0078")
            let nextNum = maxNum + 1;
            txtRM.value = "RM-" + String(nextNum).padStart(4, '0');
            
            // Beri warna latar hijau muda lembut sebagai penanda sukses instan
            txtRM.style.backgroundColor = "#e8f8f5"; 
        } else {
            // 4. FALLBACK AMAN: Jika cache memori kebetulan belum siap, pinjam mesin lama dari server
            txtRM.placeholder = "⏳ Memuat nomor baru...";
            if (typeof ambilNoRMOtomatis === "function") {
                ambilNoRMOtomatis();
            }
        }
    }

    function aturStatusProteksiForm(status) {
        document.getElementById('nama').readOnly = status;
        document.getElementById('txtKTP').readOnly = status;
        document.getElementById('tempatLahir').readOnly = status;
       document.getElementById('tanggalLahir').readOnly = status;
        document.getElementById('whatsapp').readOnly = status;
        document.getElementById('pekerjaan').readOnly = status;
        document.getElementById('email').readOnly = status;
        document.getElementById('kecamatan').readOnly = status;
        document.getElementById('kota').readOnly = status; 
    
        
        const elemenAlamat = document.getElementById('alamat');
        if (elemenAlamat) { elemenAlamat.readOnly = status; }

        const elemenGender = document.querySelectorAll('input[name="gender"]');
        elemenGender.forEach(radio => { radio.disabled = status; });

    }

    function muatJadwalDokter(namaDokter) {
        fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getJadwal', namaDokter: namaDokter })
        })
        .then(res => res.json())
        .then(res => {
            const list = document.getElementById('listJadwalDokter');
            const card = document.getElementById('cardJadwalDokter');
            
            // =====================================================================
            // 🔥 SATPAM ANTI-CRASH: Cek apakah elemen masih ada di HTML
            // Jika elemen sudah diganti dengan Kalender Praktik baru, hentikan aman!
            // =====================================================================
            if (!list) {
                console.log("ℹ️ Info: Elemen listJadwalDokter dialihkan ke mode Kalender Praktik baru.");
                return; 
            }
            // =====================================================================
            
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
    }

    async function bukaAplikasi(role, username) {
        const setDisplayAman = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.style.display = value;
        };

        const setTextAman = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.innerText = text;
        };

        // =========================================================================
        // 🔥 PENERJEMAH ROLE DINAMIS (ID ROLE -> NAMA ROLE MANUSIAWI)
        // =========================================================================
        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        const kamusRoleCadangan = {
            'ROL-01': 'Super Admin',
            'ROL-02': 'Admin',
            'ROL-03': 'Dokter',
            'ROL-04': 'Perawat',
            'ROL-05': 'Apoteker',
            'ROL-06': 'Kasir',
            'ROL-07': 'Frontdesk',
            'ROL-08': 'Digital Marketing'
        };

        // Prioritas 1: Ambil namaRole asli dari respons login server (res.namaRole)
        // Prioritas 2: Ambil dari localStorage
        // Prioritas 3: Terjemahkan via Kamus Cadangan
        // Prioritas 4: Jika tidak ketemu juga, tampilkan apa adanya (role)
        let roleTampil = role;
        if (typeof res !== 'undefined' && res && res.namaRole) {
            roleTampil = res.namaRole;
        } else if (sessionData && sessionData.namaRole) {
            roleTampil = sessionData.namaRole;
        } else if (kamusRoleCadangan[role]) {
            roleTampil = kamusRoleCadangan[role];
        }

        setTextAman('txtUserStatus', `User: ${username} `);
        setTextAman('lblNamaUser', username);
        setTextAman('lblRoleUser', roleTampil); // 🔥 Sekarang menampilkan "Super Admin" atau "Digital Marketing"
        
        setDisplayAman('loginPage', 'none');
        setDisplayAman('mainPage', 'block');

        const topNav = document.querySelector('.top-navbar');
        const sidebar = document.getElementById('appSidebar');
        if (topNav) topNav.style.display = 'flex'; 
        if (sidebar) sidebar.style.display = 'block';

        // 1. SEMBUNYIKAN SEMUA TAB & KARTU DI AWAL (Diselaraskan dengan ID asli)
        setDisplayAman('tabBerandaBtn', 'block');
        setDisplayAman('tabPendaftaranBtn', 'none');
        
        // 🔥 FIX 1: Ubah tabDokterBtn menjadi tabAntreanBtn
        setDisplayAman('tabAntreanBtn', 'none'); 
        
        setDisplayAman('tabRiwayatMedisBtn', 'none'); 
        setDisplayAman('tabDaftarPasienBtn', 'none'); 
        setDisplayAman('tabKamusDikteBtn', 'none'); 
        setDisplayAman('tabBackendBtn', 'none');    
        
        // 🔥 FIX 2: Masukkan penyamaran awal untuk tab baru
        setDisplayAman('tabAnalisisBisnisBtn', 'none');
        setDisplayAman('tabKasirBtn', 'none');

        setDisplayAman('menuPendaftaranCard', 'none');
        setDisplayAman('menuAntreanCard', 'none');
        setDisplayAman('menuRiwayatCard', 'none');
        setDisplayAman('menuDaftarPasienCard', 'none'); 

        // 2. JALANKAN FUNGSI SPESIFIK ROLE
        const roleCek = role ? role.toString().trim().toLowerCase() : "";
        if (roleCek === "perawat" || roleCek === "rol-04") {
            if (typeof ambilNoRMOtomatis === "function") { ambilNoRMOtomatis(); }
        } else if (roleCek === "dokter" || roleCek === "rol-03") {
            if (typeof muatJadwalDokter === "function") { muatJadwalDokter(username); }
        }

        // 3. KEMBALIKAN KE BERANDA & MUAT DATA UTAMA
        if (typeof switchTab === "function") { switchTab('beranda'); }
        
        try {
            if (typeof muatAntreanHariIni === "function") { muatAntreanHariIni(); }
        } catch(e) { console.warn("Pemuatan antrean ditunda:", e); }

        await new Promise(resolve => setTimeout(resolve, 600));
        
        try {
            if (typeof cariDaftarPasien === "function") { cariDaftarPasien(true); } 
        } catch(e) { console.warn("Pemuatan daftar pasien ditunda:", e); }
    }

    let currentPageAntrean = 1;
    const limitDataPerHalaman = 10; // Anda bisa mengubah angka ini (misal: 10, 20, 50)

    // 🔥 Revisi Fungsi Muat Antrean: Memisahkan Logika Tabel vs Export
    //let cacheAntreanPasien = []; // Menampung seluruh data antrean hari ini / periode terpilih
    function muatAntreanHariIni(targetPage = 1) {
        currentPageAntrean = targetPage; 
        
        let tglMulai = document.getElementById('filterTanggalMulai').value;
        let tglAkhir = document.getElementById('filterTanggalAkhir').value;

        const hariIni = new Date();
        const formatHariIni = `${hariIni.getFullYear()}-${String(hariIni.getMonth() + 1).padStart(2, '0')}-${String(hariIni.getDate()).padStart(2, '0')}`;
        
        if (!tglMulai) { tglMulai = formatHariIni; document.getElementById('filterTanggalMulai').value = tglMulai; }
        if (!tglAkhir) { tglAkhir = formatHariIni; document.getElementById('filterTanggalAkhir').value = tglAkhir; }

        let tglAkhirKhususTabel = tglAkhir;
        const start = new Date(tglMulai);
        const end = new Date(tglAkhir);
        const selisihHari = (end.getTime() - start.getTime()) / (1000 * 3600 * 24);

        if (selisihHari > 31) {
            const maxEnd = new Date(start);
            maxEnd.setDate(start.getDate() + 31);
            tglAkhirKhususTabel = `${maxEnd.getFullYear()}-${String(maxEnd.getMonth() + 1).padStart(2, '0')}-${String(maxEnd.getDate()).padStart(2, '0')}`;
        }

        const sesiAktif = localStorage.getItem('anvaya_session');
        let roleUser = "", idUserDokter = "", usernameUser = "";
        if (sesiAktif) {
            const dataSesi = JSON.parse(sesiAktif);
            roleUser = dataSesi.role; idUserDokter = dataSesi.idUser; usernameUser = dataSesi.username;
        }

        let filterDropdown = document.getElementById("filterStatusAntrean");
        let statusSaatIni = filterDropdown ? filterDropdown.value : "Semua";

        const payload = {
            action: "getTodayQueue",
            startDate: tglMulai, 
            endDate: tglAkhirKhususTabel, 
            realToday: formatHariIni,
            role: roleUser,
            idDokter: idUserDokter,
            username: usernameUser,
            statusFilter: statusSaatIni, 
            page: currentPageAntrean,     
            limit: limitDataPerHalaman    
        };

        let teksLoading = tglMulai === tglAkhirKhususTabel ? `tanggal ${tglMulai}` : `periode ${tglMulai} s/d ${tglAkhirKhususTabel}`;
        if (selisihHari > 31) {
            teksLoading += ` <i>(Dibatasi 31 hari di layar)</i>`;
        }
        
        document.getElementById('tabelAntreanBody').innerHTML = `<tr><td colspan="7" style="text-align:center;">Memuat data halaman ${currentPageAntrean} untuk ${teksLoading}...</td></tr>`;

        // 🔥 PANGGIL LAYAR HITAM LOADING DI SINI
        if (typeof tampilkanLoading === "function") tampilkanLoading("⏳ Menarik Data Antrean dari Server...");

        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
        .then(response => response.json())
        .then(data => {
            // 🔥 MATIKAN LAYAR HITAM LOADING DI SINI
            if (typeof sembunyikanLoading === "function") sembunyikanLoading();

            if (data.result === "success") {
                if(document.getElementById('statTotal')) document.getElementById('statTotal').innerText = data.stats.total;
                if(document.getElementById('statBelum')) document.getElementById('statBelum').innerText = data.stats.belum;
                if(document.getElementById('statSedang')) document.getElementById('statSedang').innerText = data.stats.sedang;
                if(document.getElementById('statSudah')) document.getElementById('statSudah').innerText = data.stats.sudah;

                if(document.getElementById('homeStatTotal')) document.getElementById('homeStatTotal').innerText = data.stats.total;
                if(document.getElementById('homeStatBelum')) document.getElementById('homeStatBelum').innerText = data.stats.belum;
                if(document.getElementById('homeStatSedang')) document.getElementById('homeStatSedang').innerText = data.stats.sedang;
                if(document.getElementById('homeStatSudah')) document.getElementById('homeStatSudah').innerText = data.stats.sudah;

                dataAntreanGlobal = data.queue;
                renderTabelAntrean(statusSaatIni); 
                buatKomponenPagination(data.pagination);
            }
        })
        .catch(err => {
            // 🔥 MATIKAN LAYAR HITAM LOADING JIKA ERROR
            if (typeof sembunyikanLoading === "function") sembunyikanLoading();
            console.error(err);
            document.getElementById('tabelAntreanBody').innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Gagal mengambil data antrean.</td></tr>`;
        });
    }

    // =========================================================
    // ⚡ MESIN FILTER ANTREAN ZERO-LAG (0 DETIK DARI RAM)
    // =========================================================
    function filterAntreanLokal() {
        let filterDropdown = document.getElementById("filterStatusAntrean");
        let statusPilihan = filterDropdown ? filterDropdown.value : "Semua";

        // 1. Cek apakah memori cache sudah terisi dari tarikan server sebelumnya
        if (typeof dataAntreanGlobal !== 'undefined' && dataAntreanGlobal.length > 0) {
            // Langsung panggil fungsi render tabel bawaan sistem Anda!
            if (typeof renderTabelAntrean === "function") {
                renderTabelAntrean(statusPilihan);
            }
        } else {
            // Jika cache kebetulan masih kosong, barulah panggil server
            muatAntreanHariIni();
        }
    }

    // 🔥 Fungsi Baru: Validasi Batas Rentang Tanggal (Maksimal 31 Hari)
    // 🔥 Revisi Opsi 2: Validasi Rentang Tanggal (Hanya Memberi Peringatan, Tidak Memaksa Ubah)
    function validasiRentangTanggal() {
        const inputMulai = document.getElementById('filterTanggalMulai');
        const inputAkhir = document.getElementById('filterTanggalAkhir');
        
        const tglMulai = inputMulai.value;
        const tglAkhir = inputAkhir.value;

        if (tglMulai && tglAkhir) {
            const start = new Date(tglMulai);
            const end = new Date(tglAkhir);
            
            const selisihWaktu = end.getTime() - start.getTime();
            const selisihHari = selisihWaktu / (1000 * 3600 * 24);

            if (selisihHari < 0) {
                alert("⚠️ Tanggal akhir tidak boleh lebih kecil dari tanggal mulai!");
                inputAkhir.value = tglMulai;
            } 
            else if (selisihHari > 31) { 
                // Sistem HANYA memberi tahu, tapi TIDAK MENGUNCI rentang tanggal.
                alert("ℹ️ Tampilan tabel di layar akan dibatasi maksimal 31 hari pertama untuk menjaga performa sistem.\n\nNamun, Anda tetap bisa menggunakan tombol '📥 Export ke Excel/CSV' untuk mengunduh seluruh data (misal 3 bulan) sesuai tanggal yang Anda pilih.");
            }
        }
        
        muatAntreanHariIni(1); 
    }

    // 🔥 Fungsi Baru: Membuat Tombol Navigasi Angka
    function buatKomponenPagination(infoPaging) {
        const containerUtama = document.getElementById('komponenPagination');
        if (!containerUtama) return; 
        
        if (!infoPaging || infoPaging.totalItems === 0) {
            containerUtama.innerHTML = `<span style="font-size: 13px; color: #7f8c8d;">Menampilkan 0 antrean</span>`;
            return;
        }

        let hitungAwal = (infoPaging.currentPage - 1) * limitDataPerHalaman + 1;
        let hitungAkhir = Math.min(infoPaging.currentPage * limitDataPerHalaman, infoPaging.totalItems);
        
        let htmlInfo = `<div style="font-size: 13px; color: #7f8c8d; font-weight: 500; margin-bottom: 5px;">
                            Menampilkan ${hitungAwal}-${hitungAkhir} dari ${infoPaging.totalItems} antrean
                        </div>`;

        let htmlTombol = `<div style="display: flex; gap: 5px;">`;

        // 🔥 FIX 1: Tombol Sebelum (Ditambahkan color: #2c3e50 untuk override teks hantu)
        if (infoPaging.currentPage > 1) {
            htmlTombol += `<button onclick="muatAntreanHariIni(${infoPaging.currentPage - 1})" class="btn-action" style="padding: 6px 12px; cursor: pointer; border: 1px solid #ddd; background: white; color: #2c3e50; border-radius: 4px; font-weight: bold;">Sebelumnya</button>`;
        } else {
            htmlTombol += `<button disabled style="padding: 6px 12px; color: #a0a0a0; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; cursor: not-allowed;">Sebelumnya</button>`;
        }

        // 🔥 FIX 2: Angka Halaman Sekuensial (Ditambahkan color: #2c3e50 pada halaman alternatif)
        for (let hal = 1; hal <= infoPaging.totalPages; hal++) {
            if (hal === infoPaging.currentPage) {
                htmlTombol += `<button style="padding: 6px 12px; background: #3498db; color: white; border: none; font-weight: bold; border-radius: 4px; min-width: 35px;">${hal}</button>`;
            } else {
                htmlTombol += `<button onclick="muatAntreanHariIni(${hal})" class="btn-action" style="padding: 6px 12px; cursor: pointer; border: 1px solid #ddd; background: white; color: #2c3e50; border-radius: 4px; min-width: 35px;">${hal}</button>`;
            }
        }

        // 🔥 FIX 3: Tombol Berikutnya (Ditambahkan color: #2c3e50 untuk override teks hantu)
        if (infoPaging.currentPage < infoPaging.totalPages) {
            htmlTombol += `<button onclick="muatAntreanHariIni(${infoPaging.currentPage + 1})" class="btn-action" style="padding: 6px 12px; cursor: pointer; border: 1px solid #ddd; background: white; color: #2c3e50; border-radius: 4px; font-weight: bold;">Berikutnya</button>`;
        } else {
            htmlTombol += `<button disabled style="padding: 6px 12px; color: #a0a0a0; background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; cursor: not-allowed;">Berikutnya</button>`;
        }

        htmlTombol += `</div>`;

        containerUtama.style.flexDirection = "column";
        containerUtama.style.alignItems = "center";
        containerUtama.innerHTML = htmlInfo + htmlTombol;
    }

    // 🔥 Sesuaikan Fungsi Filter Dropdown bawaan Anda
    function terapkanFilterAntrean() {
        // Jika dropdown status diganti, reset kembali data dari halaman 1
        muatAntreanHariIni(1); 
    }

    // 🔥 UPGRADE: Tambahkan parameter tanggalDaftar di akhir fungsi
    function gantiStatusPasien(rowNum, statusBaru, noRM = "", namaPasien = "", tanggalDaftar = "") {
        if(!confirm(`Ubah status pasien menjadi "${statusBaru}"?`)) return;

        // 🔥 PANGGIL LAYAR HITAM LOADING DI SINI (Setelah user klik OK di konfirmasi)
        if (typeof tampilkanLoading === "function") tampilkanLoading(`⏳ Memproses status "${statusBaru}"...`);

        const sessionData = JSON.parse(localStorage.getItem('anvaya_session'));
        const usernameAktif = sessionData ? sessionData.username : "Anonymous";
        const roleAktif     = sessionData ? sessionData.role : "Staff";

        const payload = { 
            action: "updateStatus", 
            rowNumber: rowNum, 
            status: statusBaru,
            operatorUsername: usernameAktif, 
            operatorRole: roleAktif         
        };

        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
        .then(response => response.json())
        .then(data => {
            // 🔥 MATIKAN LAYAR HITAM LOADING DI SINI (Saat balasan server tiba)
            if (typeof sembunyikanLoading === "function") sembunyikanLoading();

            if (data.result === "success") {
                
                if (dataAntreanGlobal && noRM !== "") {
                    const pasienLokal = dataAntreanGlobal.find(p => p.rowNumber === rowNum); // Cari berbasis rowNumber agar lebih akurat
                    if (pasienLokal) {
                        pasienLokal.status = statusBaru;
                        if (statusBaru === "Sedang Diperiksa") pasienLokal.isRmeFilled = false;
                    }
                    let filterDropdown = document.getElementById("filterStatusAntrean");
                    let statusSaatIni = filterDropdown ? filterDropdown.value : "Semua";
                    renderTabelAntrean(statusSaatIni); 
                }
                
                if (statusBaru === "Sedang Diperiksa" && noRM !== "" && namaPasien !== "") {
                    // 🔥 FIX: Salurkan tanggalDaftar DAN rowNum agar tidak dicuri dokter lain!
                    bukaModalRiwayatFull(noRM, namaPasien, 'input', tanggalDaftar, rowNum);
                } else if (statusBaru === "Belum Diperiksa" && document.getElementById('sectionRME')) {
                    document.getElementById('sectionRME').style.display = 'none';
                }

                setTimeout(() => { muatAntreanHariIni(); }, 600);
            } else { 
                alert("❌ Gagal memperbarui status."); 
            }
        })
        .catch(err => {
            // 🔥 MATIKAN LAYAR HITAM LOADING JIKA INTERNET TERPUTUS
            if (typeof sembunyikanLoading === "function") sembunyikanLoading();
            console.error("Error ganti status:", err);
            alert("⚠️ Terjadi kesalahan koneksi saat memperbarui status. Silakan coba lagi.");
        });
    }


    // Variabel global untuk menampung data dokter dari server
    let listDokterGlobal = [];

    // 1. FUNGSI MUAT DOKTER: Jalankan fungsi ini saat halaman web pertama kali dimuat (onload)
    function muatDaftarDokter() {
        if (typeof google !== 'undefined' && google.script && google.script.run) {
            google.script.run.withSuccessHandler(function(response) {
                let res = JSON.parse(response);
                if (res.result === "success") {
                    listDokterGlobal = res.data;
                    
                    // Masukkan data dokter ke dalam Dropdown Select di dalam Modal
                    const selectElement = document.getElementById('editDokterSelect');
                    selectElement.innerHTML = listDokterGlobal.map(doc => 
                        `<option value="${doc.id}">${doc.nama}</option>`
                    ).join('');
                }
            }).eksekusiKeBackend({ action: "getDokterList" }); 
        }
        else {
            console.warn("⚠️ Lingkungan eksternal terdeteksi (GitHub Pages). Pemanggilan google.script.run ditangguhkan demi keamanan.");
        }
    }

    // Panggil fungsi di atas secara otomatis saat aplikasi siap
    // Anda bisa menaruh baris ini di dalam fungsi init() atau window.onload Anda
    // muatDaftarDokter();


    // 1. Fungsi saat tombol "Edit" di tabel diklik (Pastikan parameter terakhir mengirim NAMA dokter saat ini)
    function bukaModalEditAntrean(rowNumber, tanggalSekarang, jamSekarang, tujuanSekarang, namaDokterSekarang) {
        document.getElementById('editRowNumber').value = rowNumber;
        
        // =====================================================================
        // 🔥 FITUR 1: GEMBOK WAKTU (MENCEGAH MASA LALU DIPILIH)
        // =====================================================================
        const inputTanggal = document.getElementById('editTanggalInput');
        const hariIni = new Date().toLocaleDateString('en-CA'); 
        inputTanggal.setAttribute('min', hariIni); 
        inputTanggal.value = tanggalSekarang;
        // =====================================================================

        // =====================================================================
        // 🔥 FITUR 1.5: SELECT DROPDOWN CERDAS UNTUK JAM KUNJUNGAN
        // =====================================================================
        const inputJam = document.getElementById('editJamSelect');
        
        // Cek apakah jam dari database ada di daftar <option> HTML
        let jamExists = Array.from(inputJam.options).some(opt => opt.value === jamSekarang);
        
        // Jika tidak ada (kasus data format lama), buatkan opsi sementara agar tidak blank
        if (!jamExists && jamSekarang && jamSekarang !== "-") {
            let newJamOption = new Option(jamSekarang, jamSekarang);
            inputJam.add(newJamOption);
        }
        inputJam.value = jamSekarang;
        // =====================================================================
        
        // =====================================================================
        // 🔥 FITUR 2: SELECT DROPDOWN CERDAS UNTUK TUJUAN (ANTI HILANG DATA)
        // =====================================================================
        const inputTujuan = document.getElementById('editTujuanInput');
        
        let optionExists = Array.from(inputTujuan.options).some(opt => opt.value === tujuanSekarang);
        
        if (!optionExists && tujuanSekarang && tujuanSekarang !== "-") {
            let newOption = new Option(tujuanSekarang, tujuanSekarang);
            inputTujuan.add(newOption);
        }
        
        inputTujuan.value = tujuanSekarang;
        // =====================================================================
        
        // Ambil daftar dokter berdasarkan parameter saat ini
        muatDokterTersedia(tanggalSekarang, jamSekarang, namaDokterSekarang);
        
        document.getElementById('modalEditAntrean').style.display = 'flex';
    }

    // 2. Fungsi pembantu saat staf mengubah input tanggal atau jam secara manual di modal
    function triggerMuatDokterTersedia() {
        let tgl = document.getElementById('editTanggalInput').value;
        let jam = document.getElementById('editJamSelect').value;
        // Panggil muatDokter tanpa mengunci ID Dokter lama (karena waktu/hari sudah berubah)
        muatDokterTersedia(tgl, jam, "");
    }

    
    // 3. Fungsi Mengambil Daftar Dokter dari Roster via FETCH (Ganti fungsi yang lama)
    function muatDokterTersedia(tanggal, jam, namaDokterAktif) {
        const selectElement = document.getElementById('editDokterSelect');
        if (!selectElement) return;

        // 🔥 JARING PENGAMAN UTAMA (ANTI-PREMATUR)
        // Jika tanggal atau jam masih kosong, blokir proses fetch ke server!
        if (!tanggal || !jam) {
            selectElement.innerHTML = '<option value="">-- Pilih Waktu Terlebih Dahulu --</option>';
            return; // 🛑 Proses berhenti total di sini, server aman dari spam
        }

        // Jika lolos jaring pengaman (Tanggal & Jam sudah terisi), baru eksekusi pencarian
        selectElement.innerHTML = '<option value="">⏳ Memuat Dokter...</option>';

        // Buat payload dinamis
        const payload = { 
            action: "getAvailableDokter", 
            tanggal: tanggal, 
            jam: jam 
        };

        // Gunakan Fetch API ke WEB_APP_URL
        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
        .then(response => response.json())
        .then(res => {
            if (res.result === "success" && res.data.length > 0) {
                // Pilihan default jika ingin user sadar untuk memilih
                let opsiHTML = '<option value="">-- Pilih Dokter --</option>';
                
                opsiHTML += res.data.map(doc => 
                    `<option value="${doc.nama}" ${doc.nama === namaDokterAktif ? 'selected' : ''}>${doc.nama}</option>`
                ).join('');
                
                selectElement.innerHTML = opsiHTML;
            } else {
                selectElement.innerHTML = '<option value="">❌ Tidak ada dokter bertugas/ Klinik tutup</option>';
            }
        })
        .catch(err => {
            console.error("Error:", err);
            selectElement.innerHTML = '<option value="">⚠️ Gagal memuat data dokter</option>';
        });
    }

    // 4. Fungsi kirim hasil final update ke Google Sheet
    function simpanEditAntrean() {
        let rowNumber = document.getElementById('editRowNumber').value;
        let tanggalBaru = document.getElementById('editTanggalInput').value;
        let jamBaru = document.getElementById('editJamSelect').value;
        let tujuanBaru = document.getElementById('editTujuanInput').value;
        let namaDokterBaru = document.getElementById('editDokterSelect').value;

        if (!namaDokterBaru || namaDokterBaru.includes("Tidak ada dokter") || namaDokterBaru.includes("Memuat")) {
            alert("⚠️ Silakan pilih dokter yang valid terlebih dahulu!");
            return;
        }

        const hariIniStr = new Date().toLocaleDateString('en-CA'); 
        if (tanggalBaru < hariIniStr) {
            alert("🚫 TANGGAL TIDAK VALID!\n\nAnda mengetikkan tanggal di masa lalu. Secara logika, pasien tidak mungkin didaftarkan untuk kemarin.");
            document.getElementById('editTanggalInput').value = hariIniStr;
            return; 
        }

        let antreanLokal = typeof dataAntreanGlobal !== 'undefined' ? dataAntreanGlobal : (window.dataAntreanGlobal || []);

        if (antreanLokal && antreanLokal.length > 0) {
            let formTgl = String(tanggalBaru).trim().substring(0, 10);
            let formJam = String(jamBaru).trim().replace('.', ':').substring(0, 5); 
            let formDokterVal = String(namaDokterBaru).trim().toLowerCase(); 
            let selectDokter = document.getElementById('editDokterSelect');
            let formDokterTeks = selectDokter.selectedIndex >= 0 ? String(selectDokter.options[selectDokter.selectedIndex].text).trim().toLowerCase() : "";

            const konflikJadwal = antreanLokal.find(pasien => {
                let tglPasien = String(pasien.tanggalDaftar || pasien.tglKunjungan || pasien.tanggal || "").trim().substring(0, 10);
                let jamPasien = String(pasien.waktu || pasien.jam || pasien.waktuKunjungan || "").trim().replace('.', ':').substring(0, 5);
                let idDokDb = String(pasien.idDokter || "").trim().toLowerCase();
                let namaDokDb = String(pasien.namaDokter || "").trim().toLowerCase();
                let dokterDb = String(pasien.dokter || "").trim().toLowerCase(); 
                let isDokterSama = false;
                
                if (idDokDb && (idDokDb === formDokterVal || formDokterTeks.includes(idDokDb))) isDokterSama = true;
                if (namaDokDb && (namaDokDb === formDokterVal || formDokterTeks.includes(namaDokDb))) isDokterSama = true;
                if (dokterDb && (dokterDb === formDokterVal || formDokterTeks.includes(dokterDb))) isDokterSama = true;
                
                let isBukanDiriSendiri = String(pasien.rowNumber) !== String(rowNumber);

                return (tglPasien === formTgl) && (jamPasien === formJam) && isDokterSama && isBukanDiriSendiri;
            });

            if (konflikJadwal) {
                let namaKonflik = konflikJadwal.namaPasien || konflikJadwal.nama || "Pasien Lain";
                alert(`🚫 TABRAKAN JADWAL!\n\nDokter bersangkutan sudah di-booking oleh pasien lain:\n👤 Nama: ${namaKonflik}\n🗓️ Tgl: ${tanggalBaru}\n🕒 Jam: ${jamBaru}\n\nSecara logika, dokter tidak bisa menangani 2 pasien bersamaan. Silakan pilih jam atau dokter lain!`);
                return; 
            }
        }

        const sessionData = JSON.parse(localStorage.getItem('anvaya_session'));
        const usernameAktif = sessionData ? sessionData.username : "Anonymous";
        const roleAktif     = sessionData ? sessionData.role : "Staff";

        const payload = {
            action: "editAntreanFull",
            rowNumber: rowNumber,
            tanggal: tanggalBaru,
            jam: jamBaru,
            tujuan: tujuanBaru,
            idDokter: namaDokterBaru,
            operatorUsername: usernameAktif, 
            operatorRole: roleAktif         
        };

        const btnSimpan = document.querySelector('#modalEditAntrean button[onclick="simpanEditAntrean()"]');
        if (btnSimpan) {
            btnSimpan.innerText = "Menyimpan...";
            btnSimpan.disabled = true;
        }

        // 🔥 PANGGIL LAYAR HITAM LOADING DI SINI
        if (typeof tampilkanLoading === "function") tampilkanLoading("⏳ Menyimpan Perubahan Jadwal...");

        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
        .then(response => response.json())
        .then(res => {
            // 🔥 MATIKAN LAYAR HITAM LOADING DI SINI
            if (typeof sembunyikanLoading === "function") sembunyikanLoading();

            if (btnSimpan) {
                btnSimpan.innerText = "Simpan";
                btnSimpan.disabled = false;
            }

            if(res.result === "success") {
                alert("✅ Data antrean berhasil diperbarui!");
                tutupModalEdit();
                if (typeof muatAntreanHariIni === "function") muatAntreanHariIni(); 
            } else {
                alert("❌ Gagal memperbarui antrean: " + (res.message || "Kesalahan Server"));
            }
        })
        .catch(err => {
            // 🔥 MATIKAN LAYAR HITAM LOADING JIKA ERROR
            if (typeof sembunyikanLoading === "function") sembunyikanLoading();

            if (btnSimpan) {
                btnSimpan.innerText = "Simpan";
                btnSimpan.disabled = false;
            }
            console.error("Error saat menyimpan:", err);
            alert("⚠️ Terjadi kesalahan koneksi server.");
        });
    }

    // 3. FUNGSI TUTUP MODAL
    function tutupModalEdit() {
        document.getElementById('modalEditAntrean').style.display = 'none';
    }


    function switchTabRME(tab) {
        // 🔥 FITUR HIDE/SHOW DIMATIKAN
        // Karena menggunakan Split Layout (Kiri dan Kanan tampil bersamaan), 
        // kita tidak boleh lagi menyembunyikan form secara bergantian.
        
        // document.getElementById('tabRmeForm').style.display = tab === 'form' ? 'block' : 'none';
        // document.getElementById('tabRmeRiwayat').style.display = tab === 'riwayat' ? 'block' : 'none';
        
        // Hanya pertahankan perubahan warna tombol (jika tombol tab UI masih Anda gunakan)
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
    }

    // --- INTEGRASI FORM RME (VERSI 2 TERKONSOLIDASI) ---
    function bukaInputRME(noRM, namaPasien, tanggalDaftar) { 
        // 🔥 FIX MUTLAK: Ambil form aktif secara dinamis (Anti-Crash Relogin)
        const formAktifRme = document.getElementById('formModalMedisSplit') || 
                            document.getElementById('formModalMedis') || 
                            document.getElementById('formMedis');

        const kolomKiri = document.getElementById('kolomInputRME');
        if (kolomKiri) {
            kolomKiri.style.display = 'block'; // Pastikan pembungkus utama langsung mencuat
        }

        if (formAktifRme) {
            formAktifRme.style.display = 'block';
            formAktifRme.reset();
            delete formAktifRme.dataset.rowUpdate;
            formAktifRme.dataset.activeNoRM = noRM;
            formAktifRme.dataset.tanggalDaftar = tanggalDaftar;
        }

        const areaKontainerRME = document.getElementById('modalRiwayatFull') || document.getElementById('sectionRME');
        if (areaKontainerRME) areaKontainerRME.style.display = 'flex';

        // Peta pengisian data pasien aman anti-null
        const setNilaiDOM = (idUtama, idAlternatif, value) => {
            const el1 = document.getElementById(idUtama);
            if (el1) { el1.value = value; return; }
            const el2 = document.getElementById(idAlternatif);
            if (el2) el2.value = value;
        };

        setNilaiDOM('modalNama', 'namaPasien', namaPasien);

        const alertBox = document.getElementById('alertMedisFormRME');
        if (alertBox) alertBox.style.display = 'none';
        
        const btnSubmit = formAktifRme ? formAktifRme.querySelector('button[type="submit"]') : document.getElementById('btnSubmitRME');
        if (btnSubmit) { btnSubmit.innerText = "⏳ Memuat Data..."; btnSubmit.disabled = true; }

        const tbodyRiwayat = document.getElementById('tabelRiwayatBody');
        if (tbodyRiwayat) tbodyRiwayat.innerHTML = '<tr><td colspan="6" style="text-align:center;">Mencari riwayat rekam medis di server...</td></tr>';
        
        // Request data ke Apps Script
        fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getRekamMedisPasien', noRM: noRM, tanggal: tanggalDaftar })
        })
        .then(res => res.json())
        .then(data => {
            if (btnSubmit) btnSubmit.disabled = false;
            if (data.result === 'success') {
                if (data.hariIni) {
                    setNilaiDOM('modalAnamnesa', 'txtAnamnesa', data.hariIni.anamnesa || "");
                    setNilaiDOM('modalObjektif', 'txtObjektif', data.hariIni.objektif || "");
                    setNilaiDOM('modalDiagnosa', 'txtDiagnosa', data.hariIni.diagnosa || "");
                    setNilaiDOM('modalProPerawatan', 'txtProPerawatan', data.hariIni.proPerawatan || "");
                    setNilaiDOM('modalProKontrol', 'txtProKontrol', data.hariIni.proKontrol || "");
                    setNilaiDOM('modalResep', 'txtResep', data.hariIni.resep || "");
                    setNilaiDOM('modalLinkFoto', 'txtLinkFoto', data.hariIni.linkFoto || "");
                    
                    if (formAktifRme) formAktifRme.dataset.rowUpdate = data.rowHariIni;
                    
                    const kontainerTindakan = document.getElementById('kontainerTindakanDinamis');
                    if (kontainerTindakan) {
                        kontainerTindakan.innerHTML = "";
                        try {
                            let arrTindakan = JSON.parse(data.hariIni.perawatan);
                            if (Array.isArray(arrTindakan)) {
                                arrTindakan.forEach(t => {
                                    if (typeof tambahBarisTindakan === "function") {
                                        tambahBarisTindakan({
                                            namaTindakan: t.namaTindakan,
                                            hargaDiinput: t.hargaDiinput || t.hargaBersihPerItem || 0,
                                            catatanKlinis: t.catatanKlinis || ""
                                        });
                                    }
                                });
                            }
                        } catch(e) {
                            if (data.hariIni.perawatan && typeof tambahBarisTindakan === "function") {
                                tambahBarisTindakan({ namaTindakan: "KUSTOM", hargaDiinput: 0, catatanKlinis: data.hariIni.perawatan });
                            }
                        }
                    }
                    if (btnSubmit) { btnSubmit.innerText = "🔄 Update Catatan Rekam Medis"; btnSubmit.style.background = "#e67e22"; }
                } else {
                    if (btnSubmit) { btnSubmit.innerText = "💾 Simpan Catatan Medis Baru"; btnSubmit.style.background = "#9b59b6"; }
                    const kontainerTindakan = document.getElementById('kontainerTindakanDinamis');
                    if (kontainerTindakan) kontainerTindakan.innerHTML = "";
                }
            }
        }).catch(err => { if (btnSubmit) btnSubmit.disabled = false; });
    }

    // 🔥 BARU: Fungsi untuk menutup jendela pop-up RME
    function tutupInputRME() {
        document.getElementById('sectionRME').style.display = 'none';
    }

    // --- TAB 1: PENCARIAN RIWAYAT MEDIS GLOBAL (PAGINATION UNIK) ---
    let cacheRiwayatGlobal = [];
    let currentRiwayatPage = 1;
    const riwayatPageSize = 5; 
    let totalRiwayatPages = 1;

    // =========================================================================
    // 🔍 RENDER TABEL RIWAYAT GLOBAL (DUAL-MODE: OBJEK & ARRAY SUPPORTED)
    // =========================================================================
    function tampilkanRiwayatGlobal() {
        const tbody = document.getElementById('tabelDaftarPasienBody');
        if (!tbody) return;
        tbody.innerHTML = "";
        
        if (!cacheRiwayatGlobal || cacheRiwayatGlobal.length === 0) {
            document.getElementById('lblTotalDataMasterRiwayat').innerText = "0";
            document.getElementById('lblTotalDataTampilRiwayat').innerText = "0";
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#e74c3c; font-weight:bold; padding: 20px;">❌ Pasien tidak ditemukan dalam database.</td></tr>';
            return;
        }

        let headerMaster = [];
        let dataPasienMurni = cacheRiwayatGlobal;

        // Cek apakah baris pertama adalah array header (untuk format lama)
        if (cacheRiwayatGlobal.length > 0 && Array.isArray(cacheRiwayatGlobal[0])) {
            const cekBarisPertama = cacheRiwayatGlobal[0].map(h => h.toString().toLowerCase().trim());
            if (cekBarisPertama.includes("no rm") || cekBarisPertama.includes("nama pasien")) {
                headerMaster = cekBarisPertama;
                dataPasienMurni = cacheRiwayatGlobal.slice(1); 
            }
        }

        if (headerMaster.length === 0 && typeof cachePasienLama !== "undefined" && cachePasienLama && cachePasienLama.length > 0 && Array.isArray(cachePasienLama[0])) {
            headerMaster = cachePasienLama[0].map(h => h.toString().toLowerCase().trim());
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
        
        document.getElementById('lblTotalDataMasterRiwayat').innerText = totalData;
        document.getElementById('lblTotalDataTampilRiwayat').innerText = dataHalaman.length;
        document.getElementById('lblHalamanRiwayat').innerText = `Halaman ${currentRiwayatPage} dari ${totalRiwayatPages}`;
        
        const btnPrev = document.getElementById('btnPrevRiwayat');
        const btnNext = document.getElementById('btnNextRiwayat');
        if (btnPrev) btnPrev.disabled = (currentRiwayatPage === 1);
        if (btnNext) btnNext.disabled = (currentRiwayatPage === totalRiwayatPages);

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

        // =========================================================================
        // 🔥 DUAL-MODE READER: Membaca Objek JSON maupun Array dengan Aman
        // =========================================================================
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
            tr.innerHTML = `
                <td style="font-weight:bold; color:#2c3e50; padding: 10px;">${noRM}</td>
                <td style="padding: 10px;">${namaTampil}</td>
                <td style="padding: 10px;"><span style="background: #eccc68; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${gender}</span></td> 
                <td style="padding: 10px;">${noWA}</td> 
                <td style="padding: 10px;">${alamat}</td> 
                <td style="padding: 10px; text-align: center;">
                    <button class="btn-action btn-rme" style="background-color: #27ae60; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size:13px; font-weight: bold;" onclick="bukaModalRiwayatFull('${noRM}', '${namaPasien.replace(/'/g, "\\'")}', 'view')">👁️ Lihat RME</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Ganti nama fungsi trigger tombol di HTML Anda menjadi nama baru ini:
    function halamanSebelumnyaRiwayat() {
        if (currentRiwayatPage > 1) {
            currentRiwayatPage--; // Kurangi angka halaman
            tampilkanRiwayatGlobal(); // Muat ulang tabel dengan data baru
        }
    }

    function halamanBerikutnyaRiwayat() {
        if (currentRiwayatPage < totalRiwayatPages) {
            currentRiwayatPage++; // Tambah angka halaman
            tampilkanRiwayatGlobal(); // Muat ulang tabel dengan data baru
        }
    }

    // =========================================================================
    // 🔍 MESIN PENCARI PASIEN GLOBAL (SINKRON DENGAN ACTION: getDaftarPasien)
    // =========================================================================
    function cariPasienGlobal() {
        const elInput = document.getElementById('txtCariRiwayatGlobal');
        if (!elInput) return;

        // Bersihkan kata kunci dan ubah ke huruf kecil semua
        const keyword = elInput.value.trim().toLowerCase();
        
        if (!keyword || keyword.length < 1) {
            alert("Silakan ketik minimal 1 atau 2 huruf nama atau No RM pasien yang ingin dicari.");
            return;
        }

        const boxDaftar = document.getElementById('boxDaftarPasienGlobal');
        if (boxDaftar) boxDaftar.style.display = 'block';
        
        const tbody = document.getElementById('tabelDaftarPasienBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; font-weight: bold; color: #0369a1;">⏳ Mengambil data dari Master Pasien...</td></tr>';
        }

        // 🔥 PANGGIL RUTE BARU DI SERVER: "getDaftarPasien"
        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getDaftarPasien" })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success" && res.data && res.data.length > 0) {
                
                // =================================================================
                // 🔥 OMNI-FILTER: Saring data pasien berdasarkan kata kunci
                // =================================================================
                const hasilFilter = res.data.filter(p => {
                    // Gabungkan No RM, Nama, No WA, dan KTP menjadi satu deret teks untuk discan
                    const teksPasien = `${p.noRM || ''} ${p.namaPasien || ''} ${p.noWA || ''} ${p.noKTP || ''}`.toLowerCase();
                    return teksPasien.includes(keyword);
                });

                if (hasilFilter.length > 0) {
                    console.log(`✔️ [PENCARIAN SUKSES] Ditemukan ${hasilFilter.length} pasien untuk keyword "${keyword}".`);
                    
                    // Simpan hasil filter ke cache sistem dan render ke tabel
                    cacheRiwayatGlobal = hasilFilter; 
                    currentRiwayatPage = 1;        
                    
                    if (typeof tampilkanRiwayatGlobal === "function") {
                        tampilkanRiwayatGlobal();     
                    }
                } else {
                    cacheRiwayatGlobal = [];
                    if (typeof tampilkanRiwayatGlobal === "function") tampilkanRiwayatGlobal();
                    
                    if (tbody) {
                        tbody.innerHTML = `
                            <tr>
                                <td colspan="5" style="text-align:center; padding: 30px; background: #fef2f2; color: #991b1b; border-radius: 6px;">
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
                cacheRiwayatGlobal = [];
                if (typeof tampilkanRiwayatGlobal === "function") tampilkanRiwayatGlobal();
                if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#e74c3c; padding: 20px;">❌ Data Master Pasien di server kosong.</td></tr>';
            }
        })
        .catch(err => {
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#e74c3c; padding: 20px;">⚠️ Gagal terhubung ke server. Periksa koneksi internet Anda.</td></tr>';
            console.error("Error cariPasienGlobal:", err);
        });
    }

    // ==========================================
    // FUNGSI BUKA MODAL RME
    // ==========================================
    // 🔥 UPGRADE: Tambahkan parameter tanggalDaftarLangsung di akhir
    function bukaModalRiwayatFull(noRM, namaPasien, mode = 'input', tanggalDaftarLangsung = "", rowNumberTarget = "") {
        const cleanNoRM = String(noRM || "").trim();
        if (!cleanNoRM || cleanNoRM === "-" || cleanNoRM === "undefined") {
            alert("⚠️ Nomor Rekam Medis pasien tidak valid (" + cleanNoRM + "). Tidak dapat memuat profil RME.");
            return;
        }

        let dataPasienObj = null;
        if (typeof dataAntreanGlobal !== 'undefined' && dataAntreanGlobal !== null) {
            if (rowNumberTarget !== "") {
                dataPasienObj = dataAntreanGlobal.find(p => p.noRM === cleanNoRM && String(p.rowNumber) === String(rowNumberTarget));
            } else {
                dataPasienObj = dataAntreanGlobal.find(p => p.noRM === cleanNoRM);
            }
        }

        if (!dataPasienObj && mode === 'input') {
            alert("⚠️ Data antrean tidak ditemukan di memori!");
            return;
        }
        
        window.tanggalKunjunganAktif = tanggalDaftarLangsung || (dataPasienObj ? dataPasienObj.tanggalDaftar : "");
        window.isPasienLunasAktif = false;
        if (dataPasienObj && (dataPasienObj.statusBayar === "Lunas" || (dataPasienObj.statusBayar && dataPasienObj.statusBayar.toLowerCase() === "lunas"))) {
            window.isPasienLunasAktif = true;
        }

        const btnTambah = document.getElementById('btnTambahTindakan');
        if (btnTambah) btnTambah.style.display = window.isPasienLunasAktif ? 'none' : 'inline-block';

        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        const perms = sessionData && sessionData.permissions ? sessionData.permissions : {};

        document.getElementById('modalRiwayatFull').style.display = 'flex'; 

        if (typeof muatKamusDikte === "function") muatKamusDikte();
        if (typeof muatMasterTindakan === "function" && (!window.masterTindakanGlobal || window.masterTindakanGlobal.length === 0)) muatMasterTindakan();
        
        const kolomKiri = document.getElementById('kolomInputRME');
        const formSplit = document.getElementById('formModalMedisSplit');
        
        const panelHistori = document.getElementById('kolomHistoriRME');
        const btnToggle = document.getElementById('btnToggleHistori');
        
        if (panelHistori) panelHistori.style.display = 'block'; 
        if (btnToggle) {
            btnToggle.innerHTML = '👁️ Sembunyikan Histori';
            btnToggle.style.backgroundColor = '#34495e';
        }
        if (kolomKiri) {
            kolomKiri.style.flex = '0 0 55%';
            kolomKiri.style.borderRight = '2px solid #bdc3c7';
        }
        
        if (mode === 'view') {
            if (kolomKiri) kolomKiri.style.display = 'none'; 
        } else {
            if (kolomKiri) kolomKiri.style.display = 'block'; 
            if (formSplit) formSplit.style.display = 'block'; 
        }

        document.getElementById('modalNoRM').value = cleanNoRM;
        document.getElementById('modalNama').value = namaPasien;
        document.getElementById('modalRowUpdate').value = rowNumberTarget; 
        
        window.isRestoringDraft = true; 
        if (formSplit) formSplit.reset();

        // =====================================================================
        // 🔥 RESET SENSOR SNAPSHOT (ANTI-BOCOR ANTAR PASIEN)
        // Memastikan pasien baru tidak terblokir oleh sensor Edit pasien sebelumnya
        // =====================================================================
        window.originalRmeSnapshot = null;
        // =====================================================================

        // =========================================================================
        // 🔥 SATPAM PENJAGA TANGGAL DRAF (ANTI-GHOSTING)
        // =========================================================================
        const savedDraft = localStorage.getItem('draft_rme_' + cleanNoRM);
        let draftValidObj = null;

        if (savedDraft && mode === 'input') {
            try {
                const tempDraft = JSON.parse(savedDraft);
                
                // 🔥 PERBAIKAN LOGIKA: 
                // Jika draf TIDAK PUNYA TANGGAL (draf usang sebelum update) ATAU tanggalnya beda, BUANG!
                if (!tempDraft.visitDate || tempDraft.visitDate !== window.tanggalKunjunganAktif) {
                    console.log("🗑️ Draf usang atau dari kunjungan lama terdeteksi. Melakukan pembersihan otomatis...");
                    localStorage.removeItem('draft_rme_' + cleanNoRM);
                    localStorage.removeItem('ttd_consent_' + cleanNoRM);
                    localStorage.removeItem('tujuan_consent_' + cleanNoRM);
                } else {
                    draftValidObj = tempDraft; // Draf terbukti sah untuk hari ini
                }
            } catch(e) {
                console.error("Format draf rusak", e);
                localStorage.removeItem('draft_rme_' + cleanNoRM); // Bersihkan juga jika formatnya rusak
            }
        }
        
        // =========================================================================
        // 🔥 SENSOR RESTORASI CONSENT 
        // =========================================================================
        if (typeof resetStatusConsentUI === "function") resetStatusConsentUI();
        window.consentSudahDisimpanHariIni = false;
        window.urlFotoConsentAktif = "";
        window.tujuanConsentAktif = "";

        const savedTTD = localStorage.getItem('ttd_consent_' + cleanNoRM);
        const savedTujuan = localStorage.getItem('tujuan_consent_' + cleanNoRM);

        if (savedTTD && savedTTD !== "-" && savedTTD !== "undefined") {
            window.consentSudahDisimpanHariIni = true;
            window.urlFotoConsentAktif = savedTTD;
            if (savedTujuan) window.tujuanConsentAktif = savedTujuan;

            const btnConsent = document.getElementById('btnBuatConsent');
            if (btnConsent) {
                btnConsent.style.backgroundColor = "#27ae60"; 
                btnConsent.innerHTML = "✅ Informed Consent Tersimpan";
            }
        }
        
        const kontainerTindakan = document.getElementById('kontainerTindakanDinamis');
        if (kontainerTindakan) {
            kontainerTindakan.innerHTML = "";
            let infoLunas = document.getElementById('infoLunasRME');
            if (!infoLunas) {
                infoLunas = document.createElement('div');
                infoLunas.id = 'infoLunasRME';
                infoLunas.style.padding = '8px 12px';
                infoLunas.style.backgroundColor = '#d4edda';
                infoLunas.style.borderLeft = '4px solid #28a745';
                infoLunas.style.color = '#155724';
                infoLunas.style.marginBottom = '12px';
                infoLunas.style.borderRadius = '4px';
                infoLunas.style.fontSize = '12px';
                infoLunas.innerHTML = '🔒 <strong>KUITANSI TELAH DICETAK (LUNAS).</strong><br>Anda dapat mengedit atau melengkapi catatan klinis pasien (Anamnesa, Diagnosa, dll), namun rincian tindakan dan tarif telah dikunci untuk menjaga integritas pembukuan kasir.';
                kontainerTindakan.parentNode.insertBefore(infoLunas, kontainerTindakan);
            }
            infoLunas.style.display = window.isPasienLunasAktif ? 'block' : 'none';
        }

        // =========================================================================
        // 💾 RESTORASI DRAF RME (HANYA DIEKSEKUSI JIKA DRAF SAH)
        // =========================================================================
        if (draftValidObj) { 
            const eksekusiRestorasi = () => {
                if (!window.masterTindakanGlobal || window.masterTindakanGlobal.length === 0) {
                    setTimeout(eksekusiRestorasi, 300);
                    return;
                }
                
                try {
                    const draftObj = draftValidObj;
                    const pasokNilai = (id, val) => {
                        const el = document.getElementById(id);
                        if (el) el.value = val || "";
                    };
                    
                    pasokNilai('modalAnamnesa', draftObj.anamnesa);
                    pasokNilai('modalObjektif', draftObj.objektif);
                    pasokNilai('modalDiagnosa', draftObj.diagnosa);
                    pasokNilai('modalPerawatan', draftObj.perawatan);
                    pasokNilai('resep', draftObj.resep);
                    pasokNilai('modalResep', draftObj.resep);
                    pasokNilai('proPerawatan', draftObj.proPerawatan);
                    pasokNilai('modalProPerawatan', draftObj.proPerawatan);
                    pasokNilai('proKontrol', draftObj.proKontrol);
                    pasokNilai('modalProKontrol', draftObj.proKontrol);
                    pasokNilai('tanggalKontrol', draftObj.tanggalKontrol);

                    if (draftObj.savedTTD && draftObj.savedTTD !== "-" && draftObj.savedTTD !== "") {
                        localStorage.setItem('ttd_consent_' + cleanNoRM, draftObj.savedTTD);
                        window.consentSudahDisimpanHariIni = true;
                        window.urlFotoConsentAktif = draftObj.savedTTD;
                    }

                    if (draftObj.tindakanDinamis && Array.isArray(draftObj.tindakanDinamis) && draftObj.tindakanDinamis.length > 0) {
                        draftObj.tindakanDinamis.forEach(t => {
                            if (typeof tambahBarisTindakan === "function") tambahBarisTindakan(t);
                        });
                        
                        setTimeout(() => {
                            const barisAktif = document.querySelectorAll('#kontainerTindakanDinamis .baris-tindakan-item');
                            barisAktif.forEach((row, index) => {
                                const dataDrafItem = draftObj.tindakanDinamis[index];
                                if (dataDrafItem) {
                                    const inpHarga = row.querySelector('.inp-harga-tindakan');
                                    if (inpHarga && dataDrafItem.hargaDiinput) {
                                        let hargaMurni = String(dataDrafItem.hargaDiinput).replace(/[^0-9]/g, '');
                                        if (hargaMurni) {
                                            inpHarga.value = hargaMurni;
                                            inpHarga.dispatchEvent(new Event('input'));
                                            inpHarga.dispatchEvent(new Event('change'));
                                        }
                                    }
                                    const inpCatatan = row.querySelector('.inp-catatan-tindakan');
                                    if (inpCatatan && dataDrafItem.catatanKlinis) {
                                        inpCatatan.value = dataDrafItem.catatanKlinis;
                                    }
                                }
                            });
                            
                            if (typeof simpanDraftRME === "function") simpanDraftRME();
                            if (typeof periksaKebutuhanConsentUI === "function") periksaKebutuhanConsentUI();
                        }, 150);
                    } else {
                        if (typeof periksaKebutuhanConsentUI === "function") periksaKebutuhanConsentUI();
                    }
                } catch(e) {
                    console.error("Gagal merestorasi data draf RME:", e);
                }
            };
            eksekusiRestorasi();
        } else {
            if (typeof periksaKebutuhanConsentUI === "function") periksaKebutuhanConsentUI();
        }

        setTimeout(() => { window.isRestoringDraft = false; }, 200);

        const timelineContainer = document.getElementById('wrapperRiwayatFull');
        if (timelineContainer) timelineContainer.innerHTML = '<p style="text-align:center; padding:20px; font-weight:bold; color:#555;">Mengambil riwayat & profil medis... ⏳</p>';

        const bannerMedis = document.getElementById('bannerPeringatanMedis');
        if (bannerMedis) bannerMedis.style.display = 'none';

        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify({ action: "getDetailPasien", noRM: cleanNoRM }) })
        .then(res => res.json())
        .then(res => {
            if(res.result === "success" && res.data) {
                window.pasienRMEAktif = res.data;
                let umur = typeof hitungUmur === "function" ? hitungUmur(res.data.tanggalLahir) : "-";
                document.getElementById('lblProfilNama').innerText = res.data.nama || namaPasien || "-";
                document.getElementById('lblProfilRM').innerText = res.data.noRM || cleanNoRM || "-";
                document.getElementById('lblProfilUmur').innerText = `${res.data.tempatLahir || '-'}, ${res.data.tanggalLahir || '-'} (${umur} Thn)`;
                document.getElementById('lblProfilKTP').innerText = res.data.noKTP || "-";
                document.getElementById('lblProfilWA').innerText = res.data.phone || "-";
                document.getElementById('lblProfilKerja').innerText = res.data.pekerjaan || "-";
                
                let domisiliGabung = (res.data.kecamatan && res.data.kecamatan !== "-") ? `${res.data.kecamatan}, ${res.data.kota}` : (res.data.alamat || "-");
                document.getElementById('lblProfilDomisili').innerText = domisiliGabung;

                let alergi = res.data.alergi ? res.data.alergi.trim() : "-";
                let obatRutin = res.data.obatRutin ? res.data.obatRutin.trim() : "-";
                let bannerTampil = false;

                if(alergi !== "-" && alergi.toLowerCase() !== "tidak ada") {
                    document.getElementById('kontenAlergiRME').innerHTML = `⚠️ <strong>ALERGI:</strong> ${alergi}`;
                    bannerTampil = true;
                }
                if(obatRutin !== "-" && obatRutin.toLowerCase() !== "tidak ada") {
                    document.getElementById('kontenObatRME').innerHTML = `💊 <strong>OBAT RUTIN:</strong> ${obatRutin}`;
                    bannerTampil = true;
                }
                if(bannerTampil && bannerMedis) bannerMedis.style.display = 'block';
            }
        })
        .catch(err => console.error("Gagal muat profil medis:", err));

        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify({ action: "getAllRiwayatMedis", noRM: cleanNoRM }) })
        .then(res => res.json())
        .then(res => {
            if (!timelineContainer) return;
            timelineContainer.innerHTML = "";
            
            if (res.result === "success" && res.data && res.data.length > 0) {
                const dataRiwayat = res.data.reverse(); 
                window.currentHistoryData = dataRiwayat; 
                
                dataRiwayat.forEach(r => {
                    let linkFotoHtml = r.linkFoto && r.linkFoto !== "-" ? `<a href="${r.linkFoto}" target="_blank" style="display:inline-block; margin-top:8px; color:#2980b9; font-weight:bold;">🖼️ Lihat Lampiran Foto</a>` : '';
                    
                    let tombolEditRMEHtml = '';
                    if (perms.editRME === 1 && mode !== 'input') { 
                        tombolEditRMEHtml = `
                            <button onclick="pemicuEditCatatanMulai('${r.barisSheet}', ${r.isHariIni})" 
                                    style="background-color: #e67e22; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer;">
                                📝 Edit / Salin Catatan
                            </button>
                        `;
                    }

                    let tanggalKunjunganAsli = r.tanggalKunjungan && r.tanggalKunjungan !== "" && r.tanggalKunjungan !== "-" ? r.tanggalKunjungan : (r.tanggal ? r.tanggal.split(" ")[0] : "-"); 
                    
                    let teksTanggalKunjungan = `<strong>🗓️ Kunjungan: ${tanggalKunjunganAsli}</strong>`;
                    let teksWaktuInput = `<span style="font-size: 11px; color: #7f8c8d;">⏱️ Input/Edit: ${r.tanggal || '-'}</span>`;
                    
                    let tanggalSistemCumaHari = r.tanggal ? r.tanggal.split(" ")[0] : ""; 
                    let formatSistemSama = tanggalSistemCumaHari;
                    
                    if (tanggalSistemCumaHari.includes("/")) {
                        let parts = tanggalSistemCumaHari.split("/");
                        if (parts.length === 3 && parts[2].length === 4) { 
                            formatSistemSama = `${parts[2]}-${parts[1]}-${parts[0]}`; 
                        }
                    }

                    let infoEditan = "";
                    if (tanggalKunjunganAsli !== formatSistemSama && formatSistemSama !== "") {
                        infoEditan = `<div style="background-color: #fcf3cf; color: #d35400; font-size: 11px; padding: 3px 8px; border-radius: 4px; margin-top: 4px; display: inline-block; font-weight: 600;">
                                        ⚠️ Koreksi / Input Susulan
                                    </div>`;
                    }

                    let tampilanTindakanHtml = "";
                    try {
                        let arrTindakan = JSON.parse(r.perawatan);
                        if (Array.isArray(arrTindakan) && arrTindakan.length > 0) {
                            arrTindakan.forEach(t => {
                                let labelCatatan = t.catatanKlinis ? ` <span style="color:#7f8c8d; font-style:italic;">(${t.catatanKlinis})</span>` : "";
                                let hargaAman = Number(t.hargaDiinput || t.hargaBersihPerItem) || 0;
                                tampilanTindakanHtml += `• <strong>${t.namaTindakan}</strong> - Rp ${hargaAman.toLocaleString('id-ID')}${labelCatatan}<br>`;
                            });
                        } else {
                            tampilanTindakanHtml = typeof formatKeBulletPoin === "function" ? formatKeBulletPoin(r.perawatan) : r.perawatan;
                        }
                    } catch(e) {
                        tampilanTindakanHtml = typeof formatKeBulletPoin === "function" ? formatKeBulletPoin(r.perawatan) : (r.perawatan || "-"); 
                    }

                    const card = document.createElement('div');
                    card.className = 'rme-card';
                    card.style.cssText = "border: 1px solid #e0e0e0; border-radius: 6px; margin-bottom: 15px; background-color: white;";
                    card.innerHTML = `
                        <div class="rme-card-header" style="background-color:#f9f9f9; padding:10px 15px; border-bottom:1px solid #eee; border-left:4px solid #34495e; margin-bottom:10px; display:flex; justify-content:space-between; align-items: flex-start;">
                            <div>
                                ${teksTanggalKunjungan}<br>
                                ${teksWaktuInput}
                                ${infoEditan}
                                <div style="margin-top: 5px; color: #2c3e50; font-size: 12px;">🩺 <strong>Dr. ${r.namaDokter || r.idDokter || "Tidak Diketahui"}</strong></div>
                            </div>
                            <div>${tombolEditRMEHtml}</div>
                        </div>
                        <div style="font-size:13px; padding:5px 15px 15px 15px;">
                            <div style="margin-bottom:8px;"><strong>💬 Anamnesa:</strong><br><span style="white-space:pre-wrap;">${typeof formatKeBulletPoin === "function" ? formatKeBulletPoin(r.anamnesa) : (r.anamnesa || '-')}</span></div>
                            <div style="margin-bottom:8px;"><strong>🔍 Objektif:</strong><br><span style="white-space:pre-wrap;">${typeof formatKeBulletPoin === "function" ? formatKeBulletPoin(r.objektif) : (r.objektif || '-')}</span></div>
                            <div style="margin-bottom:8px; color:#c0392b;"><strong>📌 Diagnosa:</strong><br><span style="white-space:pre-wrap;">${typeof formatKeBulletPoin === "function" ? formatKeBulletPoin(r.diagnosa) : (r.diagnosa || '-')}</span></div>
                            <div style="margin-bottom:8px;"><strong>🛠️ Tindakan:</strong><br><span style="white-space:pre-wrap;">${tampilanTindakanHtml || '-'}</span></div>
                            
                            <div style="margin-bottom:8px; color:#2980b9;"><strong>📋 Pro Perawatan:</strong> <br><span style="white-space:pre-wrap;">${typeof formatKeBulletPoin === "function" ? formatKeBulletPoin(r.proPerawatan) : (r.proPerawatan || '-')}</span></div>
                            <div style="margin-bottom:8px; color:#8e44ad;"><strong>🔁 Pro Kontrol:</strong> <br><span style="white-space:pre-wrap;">${typeof formatKeBulletPoin === "function" ? formatKeBulletPoin(r.proKontrol) : (r.proKontrol || '-')}</span></div>
                            
                            <div style="margin-bottom:8px; font-family:monospace; font-weight:bold;"><strong>💊 Resep:</strong><br><span style="white-space:pre-wrap;">${typeof formatKeBulletPoin === "function" ? formatKeBulletPoin(r.resep) : (r.resep || '-')}</span></div>
                            ${linkFotoHtml}
                        </div>
                    `;
                    timelineContainer.appendChild(card);
                });
            } else {
                timelineContainer.innerHTML = '<p style="text-align:center; padding:30px; color:#7f8c8d; font-weight:bold;">Belum ada riwayat medis yang tercatat untuk pasien ini.</p>';
            }
        })
        .catch(err => {
            if (timelineContainer) timelineContainer.innerHTML = '<p style="text-align:center; padding:30px; color:#c0392b; font-weight:bold;">❌ Gagal memuat histori medis dari server.</p>';
            console.error("Gagal muat histori medis:", err);
        });
    }

    // 🔥 FUNGSI BARU: Interseptor Aman Pemicu Edit Tanpa Gangguan Tanda Petik HTML
    function pemicuEditCatatanMulai(barisSheet, isHariIni) {
        if (!window.currentHistoryData) {
            alert("⚠️ Gagal membaca memori riwayat. Silakan buka ulang RME.");
            return;
        }
        
        // 🎯 FIX DINAMIS UTAMA: Dobrak paksa status sembunyi akibat fungsi logout (Anti-Putih Polos)
        const kolomKiri = document.getElementById('kolomInputRME');
        if (kolomKiri) {
            kolomKiri.style.setProperty('display', 'block', 'important');
        }

        // Deteksi form aktif secara paralel (Mendukung ID lama dan layout baru split)
        const formAktif = document.getElementById('formModalMedisSplit') || 
                        document.getElementById('formModalMedis') || 
                        document.getElementById('formMedis');
        
        if (formAktif) {
            formAktif.style.setProperty('display', 'block', 'important');
            
            // Pastikan seluruh form-group pembungkus teks input di dalamnya ikut terurai muncul
            formAktif.querySelectorAll('.form-group').forEach(el => {
                el.style.setProperty('display', 'block', 'important');
            });
        }

        // Cari data utuh langsung dari registry objek memori browser
        const dataTerpilih = window.currentHistoryData.find(r => String(r.barisSheet) === String(barisSheet));
        
        if (dataTerpilih) {
            
            // =====================================================================
            // 🔥 PISAU BEDAH REGEX V2: Lebih Kuat & Tahan Banting
            // =====================================================================
            let proKontrolMentah = dataTerpilih.proKontrol || "";
            let extractedDate = "";
            let pureCatatan = proKontrolMentah;

            // Memburu pola tanggal dengan toleransi format (menangkap YYYY-MM-DD atau DD-MM-YYYY)
            const regexTgl = /Tgl Kontrol:\s*([0-9]{2,4}-[0-9]{2}-[0-9]{2,4})/i;
            const matchTgl = proKontrolMentah.match(regexTgl);
            
            if (matchTgl && matchTgl[1]) {
                extractedDate = matchTgl[1].trim();
                
                // Jika format yang tertangkap adalah DD-MM-YYYY, balik menjadi YYYY-MM-DD (Syarat mutlak kalender HTML)
                if (extractedDate.match(/^[0-9]{2}-[0-9]{2}-[0-9]{4}$/)) {
                    let p = extractedDate.split('-');
                    extractedDate = `${p[2]}-${p[1]}-${p[0]}`; // Posisi 2 adalah Tahun, 1 Bulan, 0 Tanggal
                }

                // Cuci bersih teksnya agar murni sisa catatannya saja
                pureCatatan = proKontrolMentah.replace(/🗓️ Tgl Kontrol:.*?\n📝 Catatan:\s*/g, "").trim();
                pureCatatan = pureCatatan.replace(/🗓️ Tgl Kontrol:.*?\n/g, "").trim(); 
            }
            // =====================================================================

            // Teruskan data asli murni ke fungsi bawaan Anda (Catatan sudah bersih)
            salinAtauEditRME(
                isHariIni,
                dataTerpilih.barisSheet,
                dataTerpilih.anamnesa,
                dataTerpilih.objektif,
                dataTerpilih.diagnosa,
                dataTerpilih.perawatan,
                dataTerpilih.resep,
                dataTerpilih.proPerawatan,
                pureCatatan 
            );

            // =====================================================================
            // 🔥 FITUR BARU: SNAPSHOT (FOTO COPY) DATA ASLI (ANTI-SPAM DATABASE)
            // Menggabungkan semua teks, lalu membuang SEMUA spasi, enter, dan tanda baca!
            // =====================================================================
            const normalisasiTeks = (teks) => (teks || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
            
            window.originalRmeSnapshot = 
                normalisasiTeks(dataTerpilih.anamnesa) +
                normalisasiTeks(dataTerpilih.objektif) +
                normalisasiTeks(dataTerpilih.diagnosa) +
                normalisasiTeks(dataTerpilih.perawatan) +
                normalisasiTeks(dataTerpilih.resep) +
                normalisasiTeks(dataTerpilih.proPerawatan) +
                normalisasiTeks(pureCatatan) +
                normalisasiTeks(extractedDate);
            // =====================================================================

            // 🔥 KUNCI PERBAIKAN: Tembakkan Tanggal SETELAH Form Di-reset!
            setTimeout(() => {
                const elTgl1 = document.getElementById('modalTanggalKontrol');
                const elTgl2 = document.getElementById('tanggalKontrol');
                if (elTgl1) elTgl1.value = extractedDate;
                if (elTgl2) elTgl2.value = extractedDate;
            }, 50);
            
            const btnBatal = document.getElementById('btnBatalEdit');
            if (btnBatal) btnBatal.style.setProperty('display', 'block', 'important');
            
        } else {
            alert("⚠️ Data rekam medis tidak ditemukan di dalam memori.");
        }

        // 🔥 TAMBAHAN DINAMIS: Beri jeda 300ms agar DOM selesai dimuat, lalu paksa periksa consent!
        setTimeout(() => {
            if (typeof periksaKebutuhanConsentUI === "function") periksaKebutuhanConsentUI();
        }, 300);
    }

    // =========================================================================
    // ✏️ FUNGSI EDIT & SALIN RME (DENGAN SMART DATE EXTRACTOR + PROTEKSI UI)
    // =========================================================================
    function salinAtauEditRME(isHariIni, barisSheet, anam, obj, diag, per, res, proPer, proKon) {
        const kolomKiri = document.getElementById('kolomInputRME');
        if(kolomKiri) kolomKiri.style.display = 'block';
        
        const setNilaiAman = (idElement, nilai) => {
            const el = document.getElementById(idElement);
            if (el) el.value = nilai || "";
        };

        setNilaiAman('modalAnamnesa', anam);
        setNilaiAman('modalObjektif', obj);
        setNilaiAman('modalDiagnosa', diag);
        if (typeof sinkronisasiChipDiagnosa === "function") sinkronisasiChipDiagnosa();
        setNilaiAman('modalResep', res);
        setNilaiAman('modalProPerawatan', proPer);
        
        // 🔥 REGEX LAMA TELAH DIHAPUS (CLEAN UP)
        // Pemisahan tanggal sudah ditangani dengan sangat cerdas oleh fungsi "pemicuEditCatatanMulai", 
        // jadi data `proKon` yang masuk ke sini sudah bersih dari tanggal. Kita langsung set saja:
        setNilaiAman('modalProKontrol', proKon); 

        const kontainerTindakan = document.getElementById('kontainerTindakanDinamis');
        if (kontainerTindakan) {
            kontainerTindakan.innerHTML = ""; 
            
            try {
                let arrTindakan = JSON.parse(per);
                if (Array.isArray(arrTindakan) && arrTindakan.length > 0) {
                    arrTindakan.forEach(t => {
                        if (typeof tambahBarisTindakan === "function") {
                            tambahBarisTindakan({
                                namaTindakan: t.namaTindakan,
                                hargaDiinput: t.hargaDiinput || t.hargaBersihPerItem || 0,
                                catatanKlinis: t.catatanKlinis
                            });
                        }
                    });
                }
            } catch(e) {
                if (per && per !== "-" && per !== "") {
                    if (typeof tambahBarisTindakan === "function") {
                        tambahBarisTindakan({
                            namaTindakan: "KUSTOM",
                            hargaDiinput: 0,
                            catatanKlinis: per
                        });
                    }
                }
            }
        }

        const btnSimpan = document.getElementById('btnSimpanRME');
        const hiddenRow = document.getElementById('modalRowUpdate');

        // =====================================================================
        // 🔥 SINKRONISASI LOGIKA UI & BACKEND (MODE KOREKSI / AUDIT TRAIL)
        // =====================================================================
        if (isHariIni === true || isHariIni === "true") {
            if(hiddenRow) hiddenRow.value = barisSheet;
            if(btnSimpan) btnSimpan.innerHTML = "💾 Simpan Perubahan Edit"; 
            alert("Mode Edit Aktif: Anda akan memperbarui catatan rekam medis HARI INI secara langsung.");
        } else {
            if(hiddenRow) hiddenRow.value = barisSheet; 
            if(btnSimpan) btnSimpan.innerHTML = "💾 Simpan Koreksi / Revisi"; 
            // 🎯 Teks Peringatan Diperbarui Sesuai Keinginan Owner
            alert("Mode Revisi Aktif: Anda akan mengoreksi data MASA LALU.\n\nSistem TIDAK AKAN menghapus data asli, melainkan membuat BARIS KOREKSI BARU sebagai rekam jejak audit (Audit Trail) untuk Owner.");
        }
        // =====================================================================

        const btnBatal = document.getElementById('btnBatalEdit');
        if(btnBatal) btnBatal.style.display = 'block';

        // =====================================================================
        // 🔥 FITUR PROTEKSI UI - KUNCI SEMUA TOMBOL DI HISTORI
        // =====================================================================
        const wrapperHistori = document.getElementById('wrapperRiwayatFull');
        if (wrapperHistori) {
            const tombolHistori = wrapperHistori.querySelectorAll('button');
            tombolHistori.forEach(btn => {
                btn.classList.add('disabled-by-edit'); 
                btn.disabled = true; 
                btn.style.opacity = '0.4'; 
                btn.style.cursor = 'not-allowed'; 
                btn.title = "Selesaikan atau batalkan mode Edit/Salin di sebelah kiri terlebih dahulu.";
            });
        }
        
        if (typeof simpanDraftRME === "function") {
            simpanDraftRME();
        }
    }

    // 🔥 FUNGSI BARU: Mengamankan form jika dokter membatalkan proses edit
    function batalEditRME() {
        // 🔥 1. OBAT BIUS (SABUK PENGAMAN TAMBAHAN): 
        window.isRestoringDraft = true; 

        // 2. Kosongkan isian dan memori form untuk keamanan
        const formSplit = document.getElementById('formModalMedisSplit');
        if (formSplit) formSplit.reset();
        
        const rowUpdate = document.getElementById('modalRowUpdate');
        if (rowUpdate) rowUpdate.value = "";

        if (typeof resetStatusConsentUI === "function") resetStatusConsentUI();
        
        // 3. Sembunyikan tombol batal dan kembalikan teks tombol simpan
        const btnBatal = document.getElementById('btnBatalEdit');
        if (btnBatal) btnBatal.style.display = 'none';
        
        const btnSimpan = document.getElementById('btnSimpanRME');
        if (btnSimpan) btnSimpan.innerHTML = "💾 Simpan & Selesaikan Kunjungan";
        
        // 4. Sembunyikan (tutup) kolom input kiri sepenuhnya
        const kolomInput = document.getElementById('kolomInputRME');
        if (kolomInput) kolomInput.style.display = 'none';

        // 5. Sapu bersih baris tindakan
        const kontainerTindakan = document.getElementById('kontainerTindakanDinamis');
        if (kontainerTindakan) {
            kontainerTindakan.innerHTML = "";
        }

        // =====================================================================
        // 🔥 FITUR BARU: PROTEKSI UI - BUKA KEMBALI KUNCI TOMBOL HISTORI
        // =====================================================================
        const wrapperHistori = document.getElementById('wrapperRiwayatFull');
        if (wrapperHistori) {
            // Cari hanya tombol yang tadi kita stempel 'disabled-by-edit'
            const tombolHistori = wrapperHistori.querySelectorAll('button.disabled-by-edit');
            tombolHistori.forEach(btn => {
                btn.classList.remove('disabled-by-edit'); // Hapus stempel
                btn.disabled = false; // Buka kuncinya
                btn.style.opacity = '1'; // Kembalikan warna terang
                btn.style.cursor = 'pointer'; // Kembalikan kursor normal
                btn.title = ""; 
            });
        }
        // =====================================================================
        
        // 🔥 6. BANGUNKAN KEMBALI AUTO-SAVE: 
        setTimeout(() => { 
            window.isRestoringDraft = false; 
        }, 200);

        alert("Mode edit dibatalkan. Formulir telah dibersihkan.");
    }

    document.getElementById('txtCariRiwayatGlobal').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') { cariPasienGlobal(); }
    });


    // --- TAB 2: DATABASE PASIEN UTAMA (PAGINATION UNIK) ---
    let halamanSekarangPasien = 1;
    const ukuranHalamanPasien = 10; 
    let kataKunciPasien = "";

    // =========================================================================
    // 🔍 PENCARIAN DATABASE PASIEN (DILENGKAPI JALUR KHUSUS SUPER ADMIN)
    // =========================================================================
    function cariDaftarPasien(resetHalaman = true) {
        if (resetHalaman) { halamanSekarangPasien = 1; }
        
        kataKunciPasien = document.getElementById('txtCariDaftar').value.trim();
        const statusFilterVal = document.getElementById('filterStatusPasien').value;

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

                // =========================================================================
                // 🔥 UPGRADE LOGIKA RBAC: JALUR KHUSUS OWNER & MULTI-PROPERTY CHECK
                // =========================================================================
                const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
                const perms = sessionData.permissions || {};
                const role = (sessionData.role || '').toLowerCase();
                const username = (sessionData.username || '').toLowerCase();

                // Super Admin (Owner) otomatis dapat izin tanpa peduli penamaan di permissions!
                const isSuperAdmin = role === 'owner' || role === 'super admin' || role === 'rol-01' || username === 'owner';

                const punyaAksesEdit = isSuperAdmin || 
                                    perms.akseseditpasien === 1 || 
                                    perms.Akses_EditPasien === 1 || 
                                    perms.editPasien === 1;

                const punyaAksesHapus = isSuperAdmin || 
                                        perms.akseshapuspasien === 1 || 
                                        perms.Akses_HapusPasien === 1 || 
                                        perms.hapusPasien === 1;

                res.data.forEach((p, index) => {
                    const noRMPasien = p[idxRM] || "-";
                    const namaPasien = p[idxNama] || "-";
                    const statusPasienAktif = p[idxStatus] ? p[idxStatus].toString().trim().toLowerCase() : "aktif";

                    // Tombol Detail selalu ada untuk semua orang
                    let tombolAksi = `<button type="button" class="btn-action btn-detail" style="background-color: #2980b9; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size:13px; font-weight: bold;" onclick="bukaAksiPasien('${noRMPasien}', 'detail')">🔍 Detail</button>`;

                    if (statusPasienAktif === "nonaktif") {
                        if (punyaAksesEdit) {
                            tombolAksi += `<button type="button" class="btn-action btn-restore" style="background-color: #2ecc71; color:white; margin-left:5px; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size:13px; font-weight: bold;" onclick="aktifkanPasien('${noRMPasien}', '${namaPasien.replace(/'/g, "\\'")}')">🔄 Aktifkan</button>`;
                        }
                    } else {
                        if (punyaAksesEdit) {
                            tombolAksi += `<button type="button" class="btn-action btn-edit" style="background-color: #e67e22; color:white; margin-left:5px; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size:13px; font-weight: bold;" onclick="bukaAksiPasien('${noRMPasien}', 'edit')">📝 Edit</button>`;
                        }
                        if (punyaAksesHapus) {
                            tombolAksi += `<button type="button" class="btn-action btn-delete" style="background-color: #e74c3c; color:white; margin-left:5px; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size:13px; font-weight: bold;" onclick="pemicuHapusPasien('${noRMPasien}', '${namaPasien.replace(/'/g, "\\'")}')">🗑️ Hapus</button>`;
                        }
                    }

                    let styleStatusRM = (statusPasienAktif === "nonaktif") ? 'style="font-weight:bold; color:#7f8c8d; text-decoration: line-through;"' : 'style="font-weight:bold; color:#2c3e50;"';

                    tbody.innerHTML += `<tr>
                            <td ${styleStatusRM}>${noRMPasien}</td>
                            <td><strong>${namaPasien}</strong> ${(statusPasienAktif === 'nonaktif' ? '<span style="color:red; font-size:11px; margin-left:4px;">(Nonaktif)</span>' : '')}</td>
                            <td><span style="background: #eccc68; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">${idxGender !== -1 ? (p[idxGender] || "-") : "-"}</span></td>
                            <td>${idxWA !== -1 ? (p[idxWA] || "-") : "-"}</td>
                            <td>${idxAlamat !== -1 ? (p[idxAlamat] || "-") : "-"}</td>
                            <td style="white-space: nowrap !important; width: 1%; vertical-align: middle;">
                                <div style="display: inline-flex !important; gap: 6px; align-items: center; flex-wrap: nowrap !important;">
                                    ${tombolAksi}
                                </div>
                            </td>
                        </tr>`;  
                });

                document.getElementById('lblHalamanPasien').innerText = `Halaman ${res.currentPage} dari ${res.totalPages}`;
                document.getElementById('lblTotalDataTampil').innerText = res.data.length;
                document.getElementById('lblTotalDataMaster').innerText = res.totalRecords;

                document.getElementById('btnPrevPasien').disabled = (res.currentPage <= 1);
                document.getElementById('btnNextPasien').disabled = (res.currentPage >= res.totalPages);
            } else {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color:#e74c3c; font-weight: bold;">❌ Data tidak ditemukan dalam database.</td></tr>';
                document.getElementById('lblHalamanPasien').innerText = "Halaman 1 dari 1";
                document.getElementById('lblTotalDataTampil').innerText = "0";
                document.getElementById('lblTotalDataMaster').innerText = "0";
                document.getElementById('btnPrevPasien').disabled = true;
                document.getElementById('btnNextPasien').disabled = true;
            }
        })
        .catch(err => {
            console.error(err);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px; color:red; font-weight: bold;">⚠️ Gagal terhubung dengan server database.</td></tr>';
        });
    }

    // B. TAMBAHKAN FUNGSI BARU UNTUK PROSES AKTIFKAN PASIEN DARI FRONTEND
    function aktifkanPasien(noRM, namaPasien) {
        if (!confirm(`Apakah Anda yakin ingin mengaktifkan kembali akun pasien bernama "${namaPasien}" (${noRM})?`)) return;

        const sessionData = JSON.parse(localStorage.getItem('anvaya_session'));
        const usernameAktif = sessionData ? sessionData.username : "Anonymous";
        const roleAktif     = sessionData ? sessionData.role : "Staff";

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
            if (res.result === "success") {
                alert(res.message);
                cariDaftarPasien(false); // Refresh data pada halaman yang sama tanpa reset lompat ke hal 1
            } else {
                alert("Gagal mengaktifkan data: " + res.message);
            }
        })
        .catch(err => {
            console.error(err);
            alert("Gagal menghubungi server untuk mengaktifkan pasien.");
        });
    }

    // Ganti nama fungsi trigger tombol di HTML Anda menjadi nama baru ini:
    function halamanSebelumnyaPasien() {
        if (halamanSekarangPasien > 1) {
            halamanSekarangPasien--;
            cariDaftarPasien(false); // false artinya tidak mereset halaman ke 1 saat pindah page
        }
    }   

    function halamanBerikutnyaPasien() {
        // totalPagesPasien didapat dari res.totalPages di fungsi cariDaftarPasien
        halamanSekarangPasien++;
        cariDaftarPasien(false); 
    }


    // --- MODAL POP-UP DETAIL PROFIL PASIEN (VERSI TERAKHIR & TERKONSOLIDASI) ---
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
            
            // --- INI ADALAH BAGIAN YANG DIPERBAIKI ---
            // Kita cek apakah kolom saat ini berhubungan dengan tanggal lahir
            const namaHeaderKecil = header.toLowerCase();
            if (namaHeaderKecil.includes('tanggal lahir') || namaHeaderKecil.includes('tgl lahir')) {
                // Jika ya, kita panggil fungsi formatTanggalIndo yang sudah Anda buat
                if (nilai !== "-") {
                   nilai = formatTanggalIndo(nilai);
                }
            } else if (typeof nilai === "string" && nilai.includes("T00:00:00")) {
                // Ini untuk jaga-jaga kalau ada kolom tanggal lain (selain tanggal lahir)
                nilai = nilai.split("T")[0]; 
            }
            // -----------------------------------------

            container.innerHTML += `
                <div style="margin-bottom: 14px; border-bottom: 1px solid #f1f2f6; padding-bottom: 8px;">
                    <label style="font-weight: bold; color: #7f8c8d; display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;">${header}</label>
                    <div style="font-size: 15px; color: #2c3e50; font-weight: 500; margin-top: 4px; word-break: break-word;">${nilai}</div>
                </div>
            `;
        });

        modal.style.display = 'block';
    };

    window.tutupModalDetailPasien = function() {
        const modal = document.getElementById('modalDetailPasien');
        if (modal) { modal.style.display = 'none'; }
    };

    window.addEventListener('click', function(event) {
        const modal = document.getElementById('modalDetailPasien');
        if (event.target === modal) { modal.style.display = 'none'; }
    });


   
    // =========================================================================
    // 🛡️ JARING PENGAMAN (LANGKAH 3): VALIDASI INFORMED CONSENT SEBELUM SIMPAN RME
    // =========================================================================
    function validasiSebelumSimpanRME() {
        const barisTindakan = document.querySelectorAll('#kontainerTindakanDinamis .baris-tindakan-item');
        let adaTindakanBerisiko = false;
        let namaTindakanBerisiko = [];

        // Ambil data master tindakan yang sudah dimuat dari server
        const masterData = window.masterTindakanGlobal || [];

        barisTindakan.forEach(row => {
            const selNama = row.querySelector('.sel-nama-tindakan');
            if (!selNama || !selNama.value) return;

            const namaTerpilih = selNama.value.trim().toLowerCase();

            // 1. Cek dari atribut DOM HTML (jika ada badge atau atribut data)
            let isWajib = row.getAttribute('data-butuh-consent') == "1" || 
                        (selNama.getAttribute('data-butuh-consent') == "1") ||
                        row.querySelector('.badge-consent');

            // 2. 🔥 DEEP MATCH DARI DATABASE SERVER: Cocokkan nama tindakan dengan masterData
            if (!isWajib && masterData.length > 0) {
                const itemMaster = masterData.find(item => {
                    const namaMaster = (item.nama || item.namaTindakan || "").trim().toLowerCase();
                    return namaMaster === namaTerpilih;
                });

                // Cek apakah properti butuhConsent bernilai 1 / true (yang dikirim dari Kode.gs baru)
                if (itemMaster && (itemMaster.butuhConsent == 1 || itemMaster.butuhConsent === true)) {
                    isWajib = true;
                }
            }

            if (isWajib) {
                adaTindakanBerisiko = true;
                namaTindakanBerisiko.push(selNama.value.trim());
            }
        });

        // 🔥 JIKA ADA TINDAKAN BERISIKO & CONSENT BELUM DISIMPAN HARI INI -> TAHAN PROSES!
        if (adaTindakanBerisiko && !window.consentSudahDisimpanHariIni) {
            alert(`⚠️ TINDAKAN MEDIS BERISIKO TERDETEKSI!\n\nTindakan: "${namaTindakanBerisiko.join(', ')}"\n\nSesuai SOP Medico-Legal Klinik Anvaya, Anda wajib membuat Informed Consent dan meminta tanda tangan pasien/wali terlebih dahulu sebelum menutup rekam medis ini.`);
            
            // Panggil trigger buka modal consent secara otomatis
            if (typeof triggerInformedConsentDariRME === "function") {
                triggerInformedConsentDariRME();
            } else if (typeof bukaModalConsent === "function") {
                const noRM = document.getElementById('modalNoRM')?.value || "-";
                const nama = document.getElementById('modalNama')?.value || "-";
                bukaModalConsent(noRM, nama, namaTindakanBerisiko.join(', '));
            }
            return false; // ⛔ Batalkan proses simpan RME mutlak!
        }

        return true; // Lanjut simpan RME jika aman / tidak butuh consent
    }

    // 🔥 MENGGUNAKAN ID BARU AGAR TIDAK BENTROK DENGAN FORM LAMA
    // =========================================================================
    // 🎯 UNIFIKASI AMAN: FORM SUBMIT RME MULTI-ID DENGAN PERLINDUNGAN GANJAL
    // =========================================================================
    const formAktifRme = document.getElementById('formModalMedisSplit') || 
                         document.getElementById('formModalMedis') || 
                         document.getElementById('formMedis');

    if (formAktifRme) {
        formAktifRme.addEventListener('submit', async function(e) { 
            e.preventDefault(); 
            
            if (typeof validasiSebelumSimpanRME === "function" && !validasiSebelumSimpanRME()) {
                return; 
            }

            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.disabled = true; 
                submitBtn.innerText = "⏳ Menyimpan Perubahan...";
            }

            // 🔥 PANGGIL LAYAR HITAM LOADING DI SINI (Diletakkan sebelum baca file karena baca gambar butuh waktu)
            if (typeof tampilkanLoading === "function") tampilkanLoading("⏳ Mengenkripsi & Menyimpan Rekam Medis...");

            const sessionData    = JSON.parse(localStorage.getItem('anvaya_session'));
            const idDokterAktif  = sessionData ? sessionData.idUser : "USR-000"; 
            const usernameAktif  = sessionData ? sessionData.username : "Anonymous"; 
            const roleAktif      = sessionData ? sessionData.role : "Staff";        

            const idInputFile = document.getElementById('modalFileFoto') ? 'modalFileFoto' : 'txtFileFoto';
            let dataFileModal = null;
            if (typeof bacaFileKeBase64 === "function") {
                dataFileModal = await bacaFileKeBase64(idInputFile);
            }

            const dapatkanNilaiDOM = (idUtama, idAlternatif) => {
                const el1 = document.getElementById(idUtama);
                if (el1) return el1.value;
                const el2 = document.getElementById(idAlternatif);
                return el2 ? el2.value : "";
            };

            const barisTindakan = document.querySelectorAll('#kontainerTindakanDinamis .baris-tindakan-item');
            let listTindakanDipilih = [];

            barisTindakan.forEach(row => {
                const selNama = row.querySelector('.sel-nama-tindakan');
                const inpHarga = row.querySelector('.inp-harga-tindakan');
                const inpCatatan = row.querySelector('.inp-catatan-tindakan');
                
                if (selNama && selNama.value) {
                    let hargaMurni = Number(inpHarga.value.replace(/[^0-9]/g, '')) || 0;
                    let namaTindakanFix = selNama.value.trim();
                    
                    let statusButuhLab = 0;
                    if (window.masterTindakanGlobal) {
                        let dataMasterItem = window.masterTindakanGlobal.find(t => t.nama === namaTindakanFix);
                        if (dataMasterItem && dataMasterItem.Butuh_Lab === 1) {
                            statusButuhLab = 1;
                        }
                    }

                    listTindakanDipilih.push({
                        namaTindakan: namaTindakanFix,
                        hargaBersihPerItem: hargaMurni,
                        catatanKlinis: inpCatatan ? inpCatatan.value.trim() : "",
                        butuhLab: statusButuhLab 
                    });
                }
            });

            if (!window.tokenRmeUnik) {
                window.tokenRmeUnik = "RME-" + new Date().getTime() + "-" + Math.floor(Math.random() * 10000);
            }

            // =====================================================================
            // 🔥 SATPAM PENDETEKSI PERUBAHAN KATA (STATE COMPARISON)
            // Mengecek apakah dokter HANYA mengubah spasi/koma, atau tidak mengubah sama sekali
            // =====================================================================
            if (window.originalRmeSnapshot) {
                const normalisasiTeks = (teks) => (teks || "").toString().toLowerCase().replace(/[^a-z0-9]/g, "");
                
                // Ambil semua isi form saat ini dan buang spasi/koma nya
                const currentSnapshot = 
                    normalisasiTeks(dapatkanNilaiDOM('modalAnamnesa', 'txtAnamnesa')) +
                    normalisasiTeks(dapatkanNilaiDOM('modalObjektif', 'txtObjektif')) +
                    normalisasiTeks(dapatkanNilaiDOM('modalDiagnosa', 'txtDiagnosa')) +
                    normalisasiTeks(JSON.stringify(listTindakanDipilih)) + 
                    normalisasiTeks(dapatkanNilaiDOM('modalResep', 'txtResep')) +
                    normalisasiTeks(dapatkanNilaiDOM('modalProPerawatan', 'txtProPerawatan')) +
                    normalisasiTeks(dapatkanNilaiDOM('modalProKontrol', 'txtProKontrol')) +
                    normalisasiTeks(dapatkanNilaiDOM('modalTanggalKontrol', 'tanggalKontrol'));

                // Jika kata dan angkanya 100% SAMA PERSIS dengan saat awal tombol Edit diklik:
                if (currentSnapshot === window.originalRmeSnapshot) {
                    if (typeof sembunyikanLoading === "function") sembunyikanLoading(); // Matikan layar loading
                    
                    alert("⚠️ Tidak ada perubahan kalimat/kata yang terdeteksi.\n(Hanya mengubah spasi atau tanda baca tidak dihitung).\n\nPenyimpanan dibatalkan untuk mencegah duplikasi database.");
                    
                    if (submitBtn) {
                        submitBtn.disabled = false; 
                        submitBtn.innerText = "💾 Simpan & Selesaikan Kunjungan";
                    }
                    return; // 🚫 HENTIKAN PROSES! Jangan fetch ke server sama sekali.
                }
            }

            const data = {
                action: "submitRekamMedis",
                targetSheet: "RekamMedis",
                tokenId: window.tokenRmeUnik, 
                noRM: dapatkanNilaiDOM('modalNoRM', 'billNoRM') || formAktifRme.dataset.activeNoRM || "",
                rowUpdate: dapatkanNilaiDOM('modalRowUpdate', 'modalRowUpdate') || formAktifRme.dataset.rowUpdate || "", 
                namaPasien: dapatkanNilaiDOM('modalNama', 'billNama'),
                anamnesa: dapatkanNilaiDOM('modalAnamnesa', 'txtAnamnesa'),
                objektif: dapatkanNilaiDOM('modalObjektif', 'txtObjektif'),
                diagnosa: dapatkanNilaiDOM('modalDiagnosa', 'txtDiagnosa'),
                perawatan: JSON.stringify(listTindakanDipilih),
                proPerawatan: dapatkanNilaiDOM('modalProPerawatan', 'txtProPerawatan'), 
                proKontrol: dapatkanNilaiDOM('modalProKontrol', 'txtProKontrol'),
                tanggalKontrolTarget: dapatkanNilaiDOM('modalTanggalKontrol', 'tanggalKontrol'),     
                resep: dapatkanNilaiDOM('modalResep', 'txtResep'),
                tanggalKunjungan: window.tanggalKunjunganAktif || (typeof dapatkanStringFormatAman === "function" ? dapatkanStringFormatAman(new Date()) : new Date().toISOString().split('T')[0]),
                idDokter: idDokterAktif,
                namaDokter: usernameAktif,
                operatorUsername: usernameAktif, 
                operatorRole: roleAktif,         
                linkFoto: dapatkanNilaiDOM('modalLinkFoto', 'txtLinkFoto') || "-",
                fileBaru: dataFileModal 
            };

            fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(data) })
            .then(response => response.json())
            .then(res => {
                if (typeof sembunyikanLoading === "function") sembunyikanLoading();

                if (submitBtn) {
                    submitBtn.disabled = false; 
                    submitBtn.innerText = "💾 Simpan & Selesaikan Kunjungan";
                }
                
                if(res.result === "success") {
                    alert("✅ Catatan Rekam Medis sukses disimpan dan dikunci!");
                    
                    window.tokenRmeUnik = null; 
                    if (typeof resetStatusConsentUI === "function") resetStatusConsentUI();
                    
                    // =================================================================
                    // 🔥 PASUKAN PEMBERSIH MEMORI (CLEANUP CREW)
                    // Menghapus total draf & consent agar tidak nyasar ke kunjungan berikutnya
                    // =================================================================
                    const currentRM = data.noRM;
                    if(currentRM) {
                        const rmTrim = String(currentRM).trim();
                        localStorage.removeItem('draft_rme_' + rmTrim);
                        localStorage.removeItem('ttd_consent_' + rmTrim);
                        localStorage.removeItem('tujuan_consent_' + rmTrim);
                        localStorage.removeItem('pdf_url_consent_' + rmTrim); // Bersihkan info kasir
                    }
                    
                    const modalFull = document.getElementById('modalRiwayatFull') || document.getElementById('sectionRME');
                    if(modalFull) modalFull.style.display = 'none'; 
                    
                    if (typeof switchTab === "function") switchTab('antrean');
                    if (typeof muatAntreanHariIni === "function") muatAntreanHariIni(); 
                } else { 
                    alert("❌ Gagal menyimpan: " + (res.message || "Terjadi kesalahan server.")); 
                }
            }).catch(err => {
                // 🔥 MATIKAN LAYAR HITAM LOADING JIKA ERROR
                if (typeof sembunyikanLoading === "function") sembunyikanLoading();

                console.error(err);
                if (submitBtn) submitBtn.innerText = "Koneksi Terputus...";
                
                alert("⚠️ KONEKSI TERPUTUS SAAT MENYIMPAN!\n\nDokter tidak perlu panik atau mengetik ulang. Data Rekam Medis kemungkinan besar SUDAH MASUK dengan aman ke server.\n\nSistem akan menutup formulir ini dan memuat ulang antrean untuk memastikannya.");
                
                const modalFull = document.getElementById('modalRiwayatFull') || document.getElementById('sectionRME');
                if(modalFull) modalFull.style.display = 'none'; 
                
                if (typeof switchTab === "function") switchTab('antrean');
                if (typeof muatAntreanHariIni === "function") muatAntreanHariIni(); 
                
                setTimeout(() => {
                    if (submitBtn) {
                        submitBtn.disabled = false; 
                        submitBtn.innerText = "💾 Simpan & Selesaikan Kunjungan";
                    }
                }, 5000);
            });
        });
    }

    // --- FORM PENDAFTARAN PASIEN SUBMIT ---
    document.getElementById('formPasien').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // 🔥 1. SATPAM VALIDASI: Pastikan staf sudah memilih Jenis Pasien
        const elTipePasien = document.querySelector('input[name="tipePasien"]:checked');
        if (!elTipePasien) {
            alert("⚠️ Harap pilih Jenis Pasien (Pasien Baru / Pasien Lama) terlebih dahulu!");
            return; 
        }
        const tipePasienAktif = elTipePasien.value;

        // Ambil variabel penting untuk Radar
        const tglKunjunganVal = document.getElementById('tglKunjungan').value;
        const waktuKunjunganVal = document.getElementById('waktuKunjungan').value;
        const idDokterVal = document.getElementById('pilihDokter').value;
        
        const selectDokter = document.getElementById('pilihDokter');
        const teksDokterVal = selectDokter.selectedIndex >= 0 ? 
                            String(selectDokter.options[selectDokter.selectedIndex].text).trim().toLowerCase() : "";

        // =====================================================================
        // 🔥 BENTENG 1: BLOKIR KETIK MANUAL TANGGAL MASA LALU
        // =====================================================================
        const hariIniStr = new Date().toLocaleDateString('en-CA'); 
        if (tglKunjunganVal < hariIniStr) {
            alert("🚫 TANGGAL TIDAK VALID!\n\nAnda memasukkan tanggal di masa lalu. Secara logika, pendaftaran baru tidak bisa mundur ke hari kemarin.");
            return; 
        }
        // =====================================================================

        // =====================================================================
        // 🔥 BENTENG 2: ANTI DOUBLE-BOOKING (THE ULTIMATE RADAR PADA PENDAFTARAN)
        // =====================================================================
        if (window.dataAntreanGlobal && window.dataAntreanGlobal.length > 0) {
            
            let formTgl = String(tglKunjunganVal).trim();
            let formJam = String(waktuKunjunganVal).trim();
            let formDokterId = String(idDokterVal).trim().toLowerCase(); 

            const konflikJadwal = window.dataAntreanGlobal.find(pasien => {
                let tglPasien = String(pasien.tanggalDaftar || pasien.tanggal || "").trim().substring(0, 10);
                let jamPasien = String(pasien.jam || pasien.waktu || "").trim();
                
                let idDokDb = String(pasien.idDokter || "").trim().toLowerCase();
                let namaDokDb = String(pasien.namaDokter || "").trim().toLowerCase();
                
                let isDokterSama = false;
                if (idDokDb === formDokterId || namaDokDb === formDokterId) isDokterSama = true;
                if (idDokDb !== "" && teksDokterVal.includes(idDokDb)) isDokterSama = true;
                if (namaDokDb !== "" && teksDokterVal.includes(namaDokDb)) isDokterSama = true;
                
                return (tglPasien === formTgl) && (jamPasien === formJam) && isDokterSama;
            });

            if (konflikJadwal) {
                let namaKonflik = konflikJadwal.namaPasien || "Pasien Lain";
                alert(`🚫 TABRAKAN JADWAL (DOUBLE BOOKING)!\n\nDokter bersangkutan baru saja di-booking oleh:\n👤 Nama: ${namaKonflik}\n🗓️ Tgl: ${tglKunjunganVal}\n🕒 Jam: ${waktuKunjunganVal}\n\nSistem menolak pendaftaran ini untuk mencegah jadwal ganda. Silakan pilih jam atau dokter lain!`);
                if (typeof updateDaftarDokter === "function") updateDaftarDokter();
                return; 
            }
        }
        // =====================================================================

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true; 
        submitBtn.innerText = "Mengirim...";

        // 🔥 PANGGIL LAYAR HITAM LOADING DI SINI (Sebelum persiapan data & fetch)
        if (typeof tampilkanLoading === "function") tampilkanLoading("⏳ Menyimpan Data Pendaftaran ke Database...");

        // AMBIL DATA OPERATOR AKTIF
        const sessionData = JSON.parse(localStorage.getItem('anvaya_session'));
        const usernameAktif = sessionData ? sessionData.username : "Anonymous";
        const roleAktif     = sessionData ? sessionData.role : "Staff";

        if (!window.tokenPendaftaranUnik) {
            window.tokenPendaftaranUnik = "TX-" + new Date().getTime() + "-" + Math.floor(Math.random() * 10000);
        }

        const data = {
            action: "submit", 
            targetSheet: "Pendaftaran",
            tokenId: window.tokenPendaftaranUnik, 
            tipePasien: tipePasienAktif,
            noRM: tipePasienAktif === "baru" ? "" : document.getElementById('txtNoRM').value,
            nama: document.getElementById('nama').value,
            ktp: document.getElementById('txtKTP').value, 
            tempatLahir: document.getElementById('tempatLahir').value,
            tanggalLahir: document.getElementById('tanggalLahir').value, 
            gender: document.querySelector('input[name="gender"]:checked').value, 
            whatsapp: document.getElementById('whatsapp').value, 
            pekerjaan: document.getElementById('pekerjaan').value,
            email: document.getElementById('email').value,
            alamat: document.getElementById('alamat').value,
            kecamatan: document.getElementById('kecamatan').value,
            kota: document.getElementById('kota').value, 
            tglKunjungan: tglKunjunganVal,
            waktuKunjungan: waktuKunjunganVal,
            tujuan: document.getElementById('tujuan').value, 
            riwayatAlergi: document.getElementById('riwayatAlergi').value,
            riwayatObat: document.getElementById('riwayatObat').value,
            idDokter: idDokterVal,
            statusBayar: "Belum Lunas",
            operatorUsername: usernameAktif, 
            operatorRole: roleAktif          
        };

        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(data) })
        .then(response => response.json())
        .then(res => {
            // 🔥 MATIKAN LAYAR HITAM LOADING DI SINI (Sebelum alert sukses/gagal muncul)
            if (typeof sembunyikanLoading === "function") sembunyikanLoading();

            submitBtn.disabled = false; 
            submitBtn.innerText = "Kirim & Simpan Pendaftaran";
            
            if(res.result === "success") {
                alert("🎉 Pendaftaran berhasil disimpan ke data master klinik!");
                document.getElementById('formPasien').reset();
                
                window.tokenPendaftaranUnik = "TX-" + new Date().getTime() + "-" + Math.floor(Math.random() * 10000);
                
                if(typeof resetFormKePosisiNetral === "function") resetFormKePosisiNetral();
                if(typeof aturStatusProteksiForm === "function") aturStatusProteksiForm(false); 
                if(typeof muatAntreanHariIni === "function") muatAntreanHariIni(1);
            } else { 
                alert("❌ Gagal menyimpan ke Sheets: " + (res.message || "Error tidak diketahui")); 
            }
        })
        .catch(err => {
            // 🔥 MATIKAN LAYAR HITAM LOADING JIKA ERROR KONEKSI
            if (typeof sembunyikanLoading === "function") sembunyikanLoading();

            submitBtn.innerText = "Koneksi Terputus...";
            alert("⚠️ KONEKSI TERPUTUS SAAT MENGIRIM!\n\nJangan panik atau klik simpan ulang. Data Anda kemungkinan besar SUDAH MASUK ke server.\n\nSistem akan memuat ulang antrean untuk memastikannya. Silakan cek tabel Antrean setelah ini.");
            
            if(typeof muatAntreanHariIni === "function") muatAntreanHariIni(1);
            console.error("Error submit pendaftaran:", err);
            
            setTimeout(() => {
                submitBtn.disabled = false; 
                submitBtn.innerText = "Kirim & Simpan Pendaftaran";
            }, 5000);
        });
    });



    function resetVoiceState() {
        isRecording = false;
        if (activeBtnElement) {
            activeBtnElement.innerText = "🎙️ Mulai Dikte Suara";
            activeBtnElement.classList.remove('recording');
        }
        activeFieldId = ""; activeBtnElement = null;
    }

    // --- LOGOUT & TAB SWITCHING ---
    // =========================================================================
    // 🛡️ FUNGSI LOGOUT DENGAN SANITASI TOTAL (SECURITY CLEARANCE)
    // =========================================================================
    function logout() {
        // 1. Bersihkan variabel peran dan hapus penyimpanan sesi lokal browser
        currentRole = ""; 
        localStorage.removeItem('anvaya_session');

        if (typeof bersihkanSemuaStateUI === "function") bersihkanSemuaStateUI();

        const topNav = document.querySelector('.top-navbar');
        const sidebar = document.getElementById('appSidebar');
        if (topNav) topNav.style.display = 'none';
        if (sidebar) sidebar.style.display = 'none';
        
        // 2. Reset semua form yang ada di dalam dokumen secara dinamis (Sapu bersih memori)
        document.querySelectorAll('form').forEach(form => form.reset());
        
        // 3. 🔥 PEMBERSIHAN VISUAL DINAMIS (YANG AMAN)
        // Cukup sembunyikan kontainer luarnya (induk) saja agar tidak terjadi bug area putih polos.
        const elemenTutup = ['sectionRME', 'mainPage', 'modalRiwayatFull', 'subTabFinansial', 'subTabOperasional'];
        
        elemenTutup.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = 'none';
            }
        });

        // =========================================================================
        // 🔥 3.5 SANITASI KOKPIT FINANSIAL & PILLS (LAPIS PERTAHANAN FINANSIAL)
        // =========================================================================
        try {
            // Sembunyikan semua konten pill finansial
            const elemenFinansial = ['pillGrafik', 'pillKinerja', 'pillTabel'];
            elemenFinansial.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
            
            // KOSONGKAN SELURUH ANGKA DI DALAM TABEL FINANSIAL AGAR TIDAK JADI HANTU
            document.querySelectorAll('#subTabFinansial tbody').forEach(tb => {
                tb.innerHTML = '';
            });
            
            // Bersihkan cache data global
            window.cacheDataUlangTahun = [];
            if (typeof window.dataBagiHasil !== "undefined") window.dataBagiHasil = null;
            if (typeof window.dataOmzet !== "undefined") window.dataOmzet = null;
            
            // 🔥 TAMBAHAN BARU: Pembersihan Memori Dashboard Dokter
            window.arsipGajiTerkunci = null; 
            window.rawDataBagiHasil = null;
            window.dataBagiHasilGlobal = null;
            
            console.log("✔️ [SECURITY CLEARANCE] Seluruh angka & jejak visual finansial berhasil dimusnahkan.");
        } catch (e) {
            console.error("Gagal melakukan sanitasi DOM finansial saat logout:", e);
        }

        // 4. Kembalikan tampilan ke halaman login utama
        const loginPage = document.getElementById('loginPage');
        if (loginPage) loginPage.style.display = 'block';
    }

    function switchTab(tabId) {
        // 1. AUTO-TUTUP SIDEBAR DI HP
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('appSidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('show');
        }

        // 2. MATIKAN SEMUA LAMPU MENU SIDEBAR & TAB ATAS
        document.querySelectorAll('.sidebar-menu .tab-link, .nav-tabs .tab-link').forEach(tombol => {
            tombol.classList.remove('active');
        });

        // 3. SEMBUNYIKAN SEMUA KONTEN TAB
        document.querySelectorAll('.tab-content').forEach(el => {
            el.classList.remove('active');
            el.style.display = 'none';
        });
        
        // 4. TAMPILKAN KONTEN TAB YANG DITUJU SECARA PRESISI
        const targetTab = document.getElementById(tabId);
        if (targetTab) {
            targetTab.classList.add('active');
            targetTab.style.display = 'block';
        }
        
        // 5. 🔥 NYALAKAN LAMPU TOMBOL YANG DIPILIH (Otomatis deteksi ID: tabDokterBtn, tabKasirBtn, dst)
        const idTombolAktif = 'tab' + tabId.charAt(0).toUpperCase() + tabId.slice(1) + 'Btn';
        const tombolAktif = document.getElementById(idTombolAktif);
        if (tombolAktif) {
            tombolAktif.classList.add('active');
        }

        // =========================================================================
        // ⚡ PEMANGGILAN FITUR & RESET KONDISI TAMPILAN
        // =========================================================================
        if (tabId === 'formPendaftaran' || tabId === 'pendaftaran') {
            if (typeof resetFormKePosisiNetral === "function") {
                resetFormKePosisiNetral();
            }
            // 🔥 LAPIS 1 (ANTI-GANDA): Buat Token Idempotensi Rahasia saat form dibuka
            window.tokenPendaftaranUnik = "TX-" + new Date().getTime() + "-" + Math.floor(Math.random() * 10000);
        }

        // 🔥 PEMICU UTAMA KALENDER PRAKTIK DOKTER:
        if (tabId === 'dokter' || tabId === 'kalenderDokter') {
            if (typeof muatKalenderDokter === "function") {
                muatKalenderDokter();
            }
        }

        if (tabId === 'beranda' && typeof muatDashboardStatistik === "function") {
            muatDashboardStatistik();
        }
        
        if ((tabId === 'antrean' || tabId === 'pasien') && typeof muatAntreanHariIni === "function") {
            const btnAntrean = document.getElementById('tabAntreanBtn');
            if (btnAntrean) btnAntrean.classList.add('active');
            muatAntreanHariIni(1);
        }
        
        if (tabId === 'kamusDikte' && typeof muatKamusDikte === "function") {
            muatKamusDikte();
        }

        if (tabId === 'analisisBisnis' && typeof muatAnalisisBisnis === "function") {
            muatAnalisisBisnis(); 
        }

        if (tabId === 'backend' && typeof muatDataUser === "function") {
            muatDataUser();
        }

        if (tabId === 'kasir' && typeof muatAntreanKasir === "function") {
            muatAntreanKasir();
        }

        // =========================================================================
        // 🛡️ SATPAM HAK AKSES: CEGAT AKSES KE WORKLIST KONTROL UNTUK DOKTER
        // =========================================================================
        if (tabId === 'pengingatKontrol') {
            const sessionData = JSON.parse(localStorage.getItem('anvaya_session'));
            const roleAktif   = sessionData ? (sessionData.role || "").toLowerCase().trim() : "";
            
            if (roleAktif === "dokter" || roleAktif === "rol-03" || roleAktif.includes("dr.")) {
                alert("⚠️ AKSES DITOLAK: Menu Worklist Kontrol dikhususkan untuk Staf Pendaftaran / Perawat guna manajemen panggilan pasien.");
                // Kembalikan ke beranda jika ditolak
                switchTab('beranda');
                return; 
            }
        }
    }

    // Fungsi pembantu untuk membaca file komputer dan mengubahnya ke teks Base64
        function bacaFileKeBase64(idElemenFile) {
            return new Promise((resolve) => {
                const fileInput = document.getElementById(idElemenFile);
                if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                    resolve(null); // Jika tidak ada file yang dipilih
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
        }

    // 🔥 Fungsi Baru: Mengunduh Data Antrean Menjadi File CSV (Bisa dibuka di Excel)
    function unduhLaporanAntrean() {
        const tglMulai = document.getElementById('filterTanggalMulai').value;
        const tglAkhir = document.getElementById('filterTanggalAkhir').value;

        if (!tglMulai || !tglAkhir) {
            alert("⚠️ Silakan tentukan rentang tanggal terlebih dahulu!");
            return;
        }

        const sesiAktif = localStorage.getItem('anvaya_session');
        let roleUser = "", idUserDokter = "", usernameUser = "";
        if (sesiAktif) {
            const dataSesi = JSON.parse(sesiAktif);
            roleUser = dataSesi.role; idUserDokter = dataSesi.idUser; usernameUser = dataSesi.username;
        }

        if(!confirm(`Apakah Anda ingin mengunduh semua data antrean periode ${tglMulai} s/d ${tglAkhir}?`)) return;

        // Tampilkan pesan proses ringan
        const tombolExport = event.target;
        const teksAsli = tombolExport.innerText;
        tombolExport.innerText = "⏳ Memproses Ekspor...";
        tombolExport.disabled = true;

        const payload = {
            action: "exportQueueData",
            startDate: tglMulai,
            endDate: tglAkhir,
            role: roleUser,
            idDokter: idUserDokter,
            username: usernameUser
        };

        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
        .then(response => response.json())
        .then(res => {
            tombolExport.innerText = teksAsli;
            tombolExport.disabled = false;

            if (res.result === "success" && res.data.length > 0) {
                // Proses pembuatan dokumen CSV
                const dataArray = res.data;
                const headers = Object.keys(dataArray[0]);
                
                // Gabungkan header dan baris data dengan pemisah koma atau titik koma
                let csvContent = "\uFEFF"; // BOM untuk memastikan Excel membaca simbol UTF-8/Karakter khusus dengan benar
                csvContent += headers.join(",") + "\n";
                
                dataArray.forEach(row => {
                    let baris = headers.map(header => {
                        // Bersihkan teks dari tanda kutip atau koma dalam kalimat agar tidak merusak format Excel
                        let isiKolom = row[header] ? row[header].toString().replace(/"/g, '""') : "";
                        if (isiKolom.includes(",") || isiKolom.includes("\n")) {
                            isiKolom = `"${isiKolom}"`;
                        }
                        return isiKolom;
                    });
                    csvContent += baris.join(",") + "\n";
                });

                // Trigger pengunduhan otomatis di browser
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                
                link.setAttribute("href", url);
                link.setAttribute("download", `Laporan_Antrean_Klinik_Anvaya_${tglMulai}_to_${tglAkhir}.csv`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert("📭 Tidak ditemukan data antrean pada rentang tanggal tersebut.");
            }
        })
        .catch(err => {
            console.error(err);
            tombolExport.innerText = teksAsli;
            tombolExport.disabled = false;
            alert("❌ Gagal mengekspor data. Terjadi kesalahan pada server.");
        });
    }

    // =========================================================================
    // 🔒 MATRIKS PENGATURAN HAK AKSES ROLE (SUPER DINAMIS & ANTI-TABRAKAN)
    // =========================================================================
    function aplikasikanHakAkses(perms) {
        if (!perms) return;

        // 🔥 1. DETEKSI STATUS SUPER ADMIN (GOD MODE) & ROLE USER YANG BULLETPROOF
        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        const roleId = sessionData && sessionData.role ? String(sessionData.role).toLowerCase().trim() : "";
        const roleName = sessionData && sessionData.namaRole ? String(sessionData.namaRole).toLowerCase().trim() : "";
        
        // Mode Dewa mendeteksi baik dari ID Role maupun Nama Role manusiawi
        const isSuperAdmin = roleId === "rol-01" || roleName === "super admin" || roleName === "owner" || roleId === "owner";
        
        // Deteksi otomatis apakah yang login adalah Dokter
        const isDokter = roleId === "rol-03" || roleName.includes("dokter") || roleName.includes("dr");
        
        // 🔥 2. MESIN SUPER-PENCARI DENGAN BYPASS
        const cekIzin = (kataKunci) => {
            if (isSuperAdmin) return true;

            const kunciDicari = kataKunci.toLowerCase();
            for (let key in perms) {
                const keyAsli = key.toLowerCase().replace(/[^a-z0-9]/g, ''); 
                if (keyAsli.includes(kunciDicari)) {
                    return perms[key] === 1;
                }
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

        // === 1. KONTROL AKSES TAB MENU UTAMA ===
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
    
        // =========================================================================
        // 🔥 KONTROL AKSES KALENDER PRAKTIK (MURNI TANPA BOCOR KE ANTREAN/JADWAL)
        // =========================================================================
        const elKalenderBtn = document.getElementById('tabDokterBtn') || document.getElementById('tabKalenderBtn');
        if (elKalenderBtn) {
            // Hapus 'antrian' agar tidak bocor ke perawat/resepsionis!
            const punyaAksesKalender = isSuperAdmin || isDokter || cekIzin('kalenderpraktik') || cekIzin('kalender');
            elKalenderBtn.style.display = punyaAksesKalender ? 'block' : 'none';
        }
        // =========================================================================

        // AKSES GANDA UNTUK TAB ANALISIS BISNIS UTAMA (DI SIDEBAR)
        const punyaAksesAnalisis = cekIzin('analisisbisnis') || cekIzin('kokpitfinansial');
        const elAnalisisBtn = document.getElementById('tabAnalisisBisnisBtn');
        if (elAnalisisBtn) {
            elAnalisisBtn.style.display = punyaAksesAnalisis ? 'block' : 'none';
        }

        // === 2. KONTROL AKSES KARTU BERANDA ===
        setCardDisplay('menuPendaftaranCard', 'pendaftaran');
        setCardDisplay('menuAntreanCard', 'antrian');
        setCardDisplay('menuRiwayatCard', 'rekammedis');
        setCardDisplay('menuDaftarPasienCard', 'databasepasien');
        
        // Tambahkan pengatur kartu beranda untuk Kalender Praktik (jika ada kartunya di beranda)
        const menuKalenderCard = document.getElementById('menuKalenderCard') || document.getElementById('cardKalender');
        if (menuKalenderCard) {
            menuKalenderCard.style.display = (isSuperAdmin || isDokter || cekIzin('kalenderpraktik') || cekIzin('kalender')) ? 'block' : 'none';
        }

        // === 3. KONTROL AKSES GRANULAR SUB-TAB ===
        const punyaAksesUser = cekIzin('manajemenuser');
        const elUserBtn = document.getElementById('subTabUserBtn');
        const elAksesBtn = document.getElementById('subTabAksesBtn');
        if (elUserBtn) elUserBtn.style.display = punyaAksesUser ? 'inline-block' : 'none';
        if (elAksesBtn) elAksesBtn.style.display = punyaAksesUser ? 'inline-block' : 'none';

        // 🔥 Murni hanya mengecek 'kelolajadwal' (Kalender praktik sudah dipisah di atas)
        const punyaAksesJadwal = cekIzin('kelolajadwal');
        const elJadwalBtn = document.getElementById('subTabJadwalBtn');
        if (elJadwalBtn) elJadwalBtn.style.display = punyaAksesJadwal ? 'inline-block' : 'none';

        const punyaAksesLog = cekIzin('logaktifitas'); 
        const elLogBtn = document.getElementById('subTabLogBtn'); 
        if (elLogBtn) elLogBtn.style.display = punyaAksesLog ? 'inline-block' : 'none';

        const punyaAksesFinansial = cekIzin('kokpitfinansial');
        const btnSubTabFinansial = document.getElementById('btnSubTabFinansial');
        if (btnSubTabFinansial) {
            btnSubTabFinansial.style.display = punyaAksesFinansial ? 'inline-block' : 'none';
        }

        const punyaAksesMasterTindakan = cekIzin('mastertindakan');
        const elMasterTindakanBtn = document.getElementById('subTabMasterTindakanBtn'); // Nanti kita buat tombol ini di HTML
        if (elMasterTindakanBtn) elMasterTindakanBtn.style.display = punyaAksesMasterTindakan ? 'inline-block' : 'none';
        
        // === 4. AUTO-ROUTING CERDAS SUB-TAB ===
        setTimeout(() => {
            if (cekIzin('pengaturan')) {
                if (punyaAksesUser) {
                    if (typeof bukaSubTab === "function") bukaSubTab('manajemenUser');
                } else if (punyaAksesJadwal) {
                    if (typeof bukaSubTab === "function") bukaSubTab('manajemenJadwal');
                }
            }
        }, 1200); 
    }


    

    
    function bukaSubTab(subTabId) {
        // 1. Sembunyikan semua sub-tab bawaan
        document.querySelectorAll('.sub-tab-content').forEach(el => el.style.display = 'none');
        
        // 🔥 TAMBAHAN: Sembunyikan halaman Master Tindakan secara manual
        const tabMaster = document.getElementById('tabMasterTindakan');
        if (tabMaster) tabMaster.style.display = 'none';
        
        // 2. Munculkan target sub-tab (untuk menu bawaan)
        const target = document.getElementById(subTabId);
        if (target) target.style.display = 'block';
        
        // 3. Sinkronisasi warna tombol aktif
        document.getElementById('subTabUserBtn').style.backgroundColor = (subTabId === 'manajemenUser') ? '#ddd' : '';
        document.getElementById('subTabAksesBtn').style.backgroundColor = (subTabId === 'manajemenAkses') ? '#ddd' : '';
        document.getElementById('subTabJadwalBtn').style.backgroundColor = (subTabId === 'manajemenJadwal') ? '#ddd' : '';
        
        const btnLog = document.getElementById('subTabLogBtn');
        if (btnLog) btnLog.style.backgroundColor = (subTabId === 'manajemenLog') ? '#ddd' : '';

        // 🔥 TAMBAHAN: Warna Tombol Master Tindakan
        const btnMaster = document.getElementById('subTabMasterTindakanBtn');
        if (btnMaster) btnMaster.style.backgroundColor = (subTabId === 'masterTindakan') ? '#ddd' : '';

        // 4. Pemanggilan data otomatis (Routing Mesin)
        if (subTabId === 'manajemenUser') {
            muatDataUser();
        } else if (subTabId === 'manajemenAkses') {
            muatMatriksAkses();
        } else if (subTabId === 'manajemenJadwal') {
            if(typeof muatDropdownDokterJadwal === "function") muatDropdownDokterJadwal(); 
            if(typeof muatJadwalMaster === "function") muatJadwalMaster(); 
        } else if (subTabId === 'manajemenLog') {
            muatLogAktivitas(1);
        } 
        // 🔥 TAMBAHAN: Tampilkan & Muat Data Master Tindakan
        else if (subTabId === 'masterTindakan') {
            if (tabMaster) tabMaster.style.display = 'block'; // Tampilkan paksa halamannya
            if (typeof initMasterTindakan === "function") initMasterTindakan(); // Unduh datanya dari Backend
        }
    }

    // Memuat data dari sheet Users ke tabel HTML
    function muatDataUser() {
        const tbody = document.getElementById('bodyUsers');
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Memuat data pengguna...</td></tr>`;

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getUsers" })
        })
        .then(res => {
            // Validasi awal apakah respon server beralih ke HTML/Eror internal
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
                    // Keamanan Berlapis: Antisipasi jika idRole kosong atau tidak terbaca sebagai string
                    let idRoleRaw = user.idRole ? user.idRole.toString().trim() : "";
                    let idRoleLower = idRoleRaw.toLowerCase();
                    let namaRole = rolesMap[idRoleLower] || idRoleRaw || "Tanpa Role";
                    
                    // Antisipasi status kosong
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
                // Menampilkan pesan jika backend Apps Script mengirim status error
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Gagal dari Server: ${res.message || 'Terjadi kesalahan sistem'}</td></tr>`;
            }
        })
        .catch(err => {
            console.error("Gagal memuat pengguna:", err);
            // Menampilkan detail pesan error di bawah tabel agar mudah dilacak
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:red;">Gagal memuat data.<br><small style="color:gray;">Detail: ${err.message}</small></td></tr>`;
        });
    }

    // Fungsi untuk menyimpan User Baru
    function tambahUserBaru() {
        const username = document.getElementById('inputUsernameBaru').value.trim();
        const password = document.getElementById('inputPasswordBaru').value.trim();
        const role = document.getElementById('inputRoleBaru').value;

        if (!username || !password || !role) {
            alert("Kolom Username, Password, dan Role wajib diisi semua!");
            return;
        }

        const btn = event.target || document.querySelector('#formTambahUser button');
        const teksAsli = btn.innerText;
        btn.innerText = "Menyimpan...";
        btn.disabled = true;

        // 🔥 Buat Token
        if (!window.tokenUserBaru) window.tokenUserBaru = "USR-" + new Date().getTime();

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ 
                action: "simpanUser", 
                username: username, 
                password: password, 
                role: role,
                tokenId: window.tokenUserBaru // 🔥 Kirim Token
            })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                alert("Pengguna baru berhasil ditambahkan!");
                window.tokenUserBaru = null; // Reset
                document.getElementById('inputUsernameBaru').value = "";
                document.getElementById('inputPasswordBaru').value = "";
                document.getElementById('inputRoleBaru').value = "";
                muatDataUser(); 
            } else alert("Gagal menyimpan: " + res.message);
        })
        .catch(err => {
            alert("⚠️ KONEKSI TERPUTUS!\n\nSistem mungkin sudah mencatat user ini. Tabel akan dimuat ulang.");
            muatDataUser();
        })
        .finally(() => { setTimeout(() => { btn.innerText = teksAsli; btn.disabled = false; }, 3000); });
    }

    // 1. Membuka form edit dan mengisi datanya otomatis
    function bukaFormEdit(username, idRole, barisSheet, status) {
        // Ubah menjadi 'flex' agar modal otomatis berada tepat di tengah layar
        document.getElementById('formEditUser').style.display = 'flex'; 
        
        document.getElementById('lblEditUsername').innerText = username;
        document.getElementById('editUsername').value = username;
        document.getElementById('editRole').value = idRole;
        document.getElementById('editBarisSheet').value = barisSheet;
        document.getElementById('editPassword').value = ""; 
        document.getElementById('editStatus').value = status || "Aktif"; 
    }

    // 2. Menutup form edit
    function batalEditUser() {
        document.getElementById('formEditUser').style.display = 'none';
    }

    // 3. Mengirim data perubahan ke server
    function simpanEditUser() {
        const payload = {
            action: "updateUser",
            barisSheet: document.getElementById('editBarisSheet').value,
            newUsername: document.getElementById('editUsername').value,
            newRole: document.getElementById('editRole').value,
            newStatus: document.getElementById('editStatus').value, 
            newPassword: document.getElementById('editPassword').value,
            tokenId: "UPD-" + new Date().getTime() // Token Instan untuk edit
        };

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(res => {
            if(res.result === "success") {
                alert("Data pengguna berhasil diperbarui!");
                document.getElementById('formEditUser').style.display = 'none';
                muatDataUser();
            } else alert("Gagal: " + res.message);
        })
        .catch(err => {
            alert("⚠️ KONEKSI TERPUTUS!\n\nPerubahan mungkin sudah tersimpan. Tabel akan dimuat ulang.");
            document.getElementById('formEditUser').style.display = 'none';
            muatDataUser();
        });
    }

    // 4. Menghapus akun pengguna dari database
    function hapusUser(username, barisSheet) {
        if (!confirm(`Peringatan: Apakah Anda yakin ingin MENGHAPUS akun [ ${username} ] secara permanen?`)) {
            return;
        }

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "hapusUser", barisSheet: barisSheet })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                alert(`Akun ${username} berhasil dihapus.`);
                muatDataUser(); // Refresh tabel otomatis
            } else {
                alert("Gagal menghapus: " + res.message);
            }
        })
        .catch(err => alert("Terjadi kesalahan sistem."));
    }

    function muatPilihanRole() {
        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getRoles" })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                const selectTambah = document.getElementById('inputRoleBaru');
                const selectEdit = document.getElementById('editRole');
                
                // Bersihkan pilihan lama
                selectTambah.innerHTML = '<option value="">-- Pilih Role --</option>';
                selectEdit.innerHTML = '';
                
                res.data.forEach(role => {
                    // selectTambah.innerHTML += `<option value="${role.id}">${role.nama}</option>`;
                    // selectEdit.innerHTML += `<option value="${role.id}">${role.nama}</option>`;
                    selectTambah.innerHTML += `<option value="${role.id}">${role.nama}</option>`;
                    selectEdit.innerHTML += `<option value="${role.id}">${role.nama}</option>`;
                });
            }
        });
    }

    // ==========================================
    // 1. KONFIGURASI MASTER MENU (DINAMIS)
    // Cukup tambahkan/edit di sini jika ada menu baru di masa depan
    // ==========================================
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

    // ==========================================
    // 2. FUNGSI MUAT MATRIKS (AUTOMATIC RENDERING)
    // ==========================================
    function muatMatriksAkses() {
        const thead = document.getElementById('headMatriksAkses');
        const tbody = document.getElementById('bodyMatriksAkses');
        
        // 🔥 PERUBAHAN 1: Tambah +2 kolom (1 untuk Nama Role, 1 untuk kolom Aksi)
        const totalKolom = DAFTAR_MENU_AKSES.length + 2; 

        // Render Header Tabel secara Dinamis
        let headerHTML = `<tr><th style="padding: 10px;">Nama Role</th>`;
        DAFTAR_MENU_AKSES.forEach(menu => {
            headerHTML += `<th style="padding: 10px; text-align: center;">${menu.label}</th>`;
        });
        // 🔥 PERUBAHAN 2: Tambahkan Header "Aksi" di paling kanan
        headerHTML += `<th style="padding: 10px; text-align: center;">Aksi</th></tr>`;
        thead.innerHTML = headerHTML;

        // Tampilkan status loading
        tbody.innerHTML = `<tr><td colspan="${totalKolom}" style="text-align:center; color: #555; padding: 15px;">⏳ Memuat konfigurasi hak akses dari database...</td></tr>`;

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getMatrixRole" })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                tbody.innerHTML = "";
                
                res.data.forEach(role => {
                    const isSuperAdmin = role.idRole.toLowerCase() === 'rol-01' || role.namaRole.toLowerCase() === 'owner';
                    const disabledAttr = isSuperAdmin ? 'disabled checked' : '';

                    // Render kolom checkbox secara dinamis berdasarkan array DAFTAR_MENU_AKSES
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

                    // =====================================================================
                    // 🔥 PERUBAHAN 3: RENDER TOMBOL HAPUS & PROTEKSI UI UNTUK ROLE INTI
                    // =====================================================================
                    const roleInti = ["rol-01", "rol-02", "rol-03", "rol-04", "rol-05", "rol-06", "rol-07"];
                    const isRoleInti = roleInti.includes(role.idRole.toLowerCase());
                    let btnHapus = "";
                    
                    if (isRoleInti) {
                        // Jika Role Inti, tombol mati dan warna abu-abu
                        btnHapus = `<button disabled style="background-color: #e0e0e0; color: #888; border: 1px solid #ccc; padding: 5px 10px; border-radius: 4px; cursor: not-allowed; font-size: 12px;">Bawaan Sistem</button>`;
                    } else {
                        // Jika Role Tambahan, tombol merah menyala memanggil fungsi hapusRole()
                        btnHapus = `<button onclick="hapusRole('${role.idRole}', '${role.namaRole}')" style="background-color: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">🗑️ Hapus</button>`;
                    }

                    // Susun baris HTML utuh
                    let row = `<tr class="baris-akses-role" data-baris="${role.barisSheet}" style="border-bottom: 1px solid #eee;">
                        <td style="padding: 12px;"><strong>${role.namaRole}</strong> <br><small style="color:gray;">${role.idRole}</small></td>
                        ${tdCheckboxes}
                        <td style="padding: 12px; text-align: center;">${btnHapus}</td>
                    </tr>`;
                    // =====================================================================
                    
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
    }

    // ==========================================
    // 3. FUNGSI SIMPAN MATRIKS (AUTOMATIC PAYLOAD)
    // ==========================================
    function simpanMatriksAkses() {
        const btn = document.getElementById('btnSimpanAkses');
        btn.disabled = true;
        btn.innerText = "⏳ Menyimpan Perubahan...";

        const matrixPayload = [];
        const rows = document.querySelectorAll('.baris-akses-role');

        rows.forEach(row => {
            const barisNum = row.getAttribute('data-baris');
            const rowData = {
                barisSheet: parseInt(barisNum)
            };

            // Tangkap seluruh status checkbox secara dinamis tanpa menulis satu per satu
            DAFTAR_MENU_AKSES.forEach(menu => {
                const chk = row.querySelector(`.${menu.class}`);
                rowData[menu.key] = chk ? chk.checked : false;
            });

            matrixPayload.push(rowData);
        });

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "simpanMatrixRole",
                matrix: matrixPayload
            })
        })
        .then(res => res.json())
        .then(res => {
            btn.disabled = false;
            btn.innerText = "💾 Simpan Perubahan Hak Akses";
            if (res.result === "success") {
                alert("🎉 Hak akses role berhasil diperbarui!");
                muatMatriksAkses(); 
            } else {
                alert("❌ Gagal menyimpan perubahan: " + res.message);
            }
        })
        .catch(err => {
            btn.disabled = false;
            btn.innerText = "💾 Simpan Perubahan Hak Akses";
            console.error("Gagal mengirim data matrix:", err);
            alert("⚠️ Terjadi gangguan koneksi sistem saat menyimpan data.");
        });
    }


    function prosesTambahRoleBaru() {
        const inputRole = document.getElementById('inputNamaRoleBaru');
        const namaRoleValue = inputRole.value.trim();

        if (!namaRoleValue) {
            alert("Silakan ketik nama role terlebih dahulu!");
            return;
        }

        // 🔥 LAPIS 1: Token Anti-Ganda
        if (!window.tokenTambahRole) {
            window.tokenTambahRole = "ROL-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000);
        }

        const btn = document.activeElement;
        const teksAsli = btn ? btn.innerText : "Tambah Role";
        if (btn && btn.tagName === 'BUTTON') {
            btn.innerText = "Menyimpan... ⏳";
            btn.disabled = true;
        }

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "tambahRole",
                namaRole: namaRoleValue,
                tokenId: window.tokenTambahRole // 🔥 Kirim token
            })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                alert(`🎉 Role "${namaRoleValue}" berhasil didaftarkan ke sistem Klinik Anvaya!`);
                window.tokenTambahRole = null; // Reset token
                inputRole.value = ""; 
                
                if(typeof muatMatriksAkses === "function") muatMatriksAkses(); 
                if(typeof muatPilihanRole === "function") muatPilihanRole();  
            } else {
                alert("Gagal menambahkan role: " + res.message);
            }
        })
        .catch(err => {
            console.error("Error tambah role:", err);
            alert("⚠️ KONEKSI TERPUTUS!\n\nRole mungkin sudah ditambahkan. Sistem akan memuat ulang tabel.");
            if(typeof muatMatriksAkses === "function") muatMatriksAkses();
        })
        .finally(() => {
            setTimeout(() => {
                if (btn && btn.tagName === 'BUTTON') {
                    btn.innerText = teksAsli;
                    btn.disabled = false;
                }
            }, 3000);
        });
    }

    // ==========================================
    // 🔥 FITUR BARU: HAPUS ROLE (DELETE)
    // ==========================================
    function hapusRole(idRole, namaRole) {
        // 🛡️ Proteksi Awal di Frontend (Mencegah sistem kacau)
        const roleInti = ["ROL-01", "ROL-02", "ROL-03", "ROL-04", "ROL-05", "ROL-06", "ROL-07"];
        if (roleInti.includes(idRole)) {
            alert(`⚠️ DITOLAK: Role bawaan sistem (${namaRole}) tidak boleh dihapus!`);
            return;
        }

        if (!confirm(`TINDAKAN FATAL ⚠️\n\nApakah Anda yakin ingin menghapus role "${namaRole}" secara permanen?\n\n(Pastikan tidak ada staf User yang sedang menggunakan role ini di menu Manajemen Pengguna!)`)) {
            return;
        }

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "hapusRole", idRole: idRole })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                alert(`✅ Role "${namaRole}" berhasil dihapus dari sistem!`);
                if(typeof muatMatriksAkses === "function") muatMatriksAkses(); 
                if(typeof muatPilihanRole === "function") muatPilihanRole(); 
            } else {
                alert("Gagal menghapus: " + res.message);
            }
        })
        .catch(err => {
            alert("⚠️ KONEKSI TERPUTUS!\n\nProses penghapusan mungkin sudah berhasil. Tabel akan dimuat ulang.");
            if(typeof muatMatriksAkses === "function") muatMatriksAkses();
        });
    }

    // 1. Variabel Global untuk menampung data jadwal mentah dari server
    let dataJadwalGlobal = [];

    function muatJadwalMaster() {
        const tbody = document.getElementById('bodyJadwalMaster');
        
        // 🔥 BENTENG PENGAMAN: Jika tabel tidak ditemukan di halaman aktif, 
        // langsung hentikan fungsi agar tidak membuat crash script lainnya.
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
                aplikasikanFilterDanSortJadwal();
            } else {
                tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">❌ Gagal memuat data jadwal.</td></tr>`;
            }
        })
        .catch(err => {
            console.error(err);
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">⚠️ Gangguan koneksi sistem.</td></tr>`;
        });
    }

    // 4. Fungsi Utama untuk memproses Filter dan Sort secara Real-time di Frontend
    function aplikasikanFilterDanSortJadwal() {
        const tbody = document.getElementById('bodyJadwalMaster');
        if (!tbody) return;
        
        // Ambil nilai filter & sort dari element HTML
        const filterDokter = document.getElementById('filterJadwalDokter').value; // <-- Membaca nilai dropdown dokter
        const filterHari = document.getElementById('filterJadwalHari').value;
        const filterSlot = document.getElementById('filterJadwalSlot').value;
        const opsiUrutan = document.getElementById('urutJadwalMaster').value;

        // --- PROSES 1: PROSES PENYARINGAN (FILTER) DENGAN PROTEKSI DATA ---
        let dataHasilFilter = dataJadwalGlobal.filter(jdw => {
            // Ambil data dengan aman (jika undefined/null akan diubah jadi string kosong "")
            const namaDokterJadwal = jdw.dokter || "";
            const hariJadwal = jdw.hari || "";
            const slotJadwal = jdw.slot || "";

            // Pengecekan Filter (Exact Match)
            const cocokNama = filterDokter === "" || namaDokterJadwal === filterDokter;
            const cocokHari = filterHari === "" || hariJadwal === filterHari;
            const cocokSlot = filterSlot === "" || slotJadwal === filterSlot;

            return cocokNama && cocokHari && cocokSlot;
        });

        // --- PROSES 2: PROSES PENGURUTAN (SORTING) ---
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
                    <button onclick="hapusJadwal('${jdw.idJadwal}', ${jdw.barisSheet})" style="background:#dc3545; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">Hapus</button>
                </td>
            </tr>`;
            tbody.innerHTML += row;
        });
    }

    // 5. Fungsi Bantu untuk merubah teks hari menjadi bobot angka agar bisa diurutkan dari Senin s.d Sabtu
    function konversiHariKeAngka(hari) {
        const daftarHari = { "Senin": 1, "Selasa": 2, "Rabu": 3, "Kamis": 4, "Jumat": 5, "Sabtu": 6, "Minggu": 7 };
        return daftarHari[hari] || 99; // Jika hari tidak terdefinisi ditaruh di paling bawah
    }

    function simpanJadwalBaru() {
        // 🔥 LAPIS 1: Buat Token Unik
        if (!window.tokenJadwalDokter) {
            window.tokenJadwalDokter = "JDW-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000);
        }

        const payload = {
            action: "tambahJadwalDokter",
            tokenId: window.tokenJadwalDokter, // 🔥 Sisipkan Token ke Backend
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

        // 🔥 UX: Ubah tombol jadi loading (Otomatis mendeteksi tombol yang sedang diklik)
        const btnSubmit = document.activeElement; 
        const teksAsli = btnSubmit ? btnSubmit.innerText : "Simpan";
        if (btnSubmit && btnSubmit.tagName === 'BUTTON') {
            btnSubmit.innerText = "Menyimpan... ⏳";
            btnSubmit.disabled = true;
        }

        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
        .then(res => res.json())
        .then(res => {
            if(res.result === "success") {
                alert("🎉 Jadwal praktik dokter berhasil ditambahkan!");
                
                window.tokenJadwalDokter = null; // 🔥 Reset token setelah sukses
                
                tutupModalJadwal(); 
                muatJadwalMaster(); 
            } else {
                alert("Gagal: " + res.message);
            }
        })
        .catch(err => {
            // 🔥 LAPIS 3: UX Anti-Panik
            console.error(err);
            if (btnSubmit && btnSubmit.tagName === 'BUTTON') btnSubmit.innerText = "Koneksi Terputus...";
            
            alert("⚠️ KONEKSI TERPUTUS!\n\nJadwal Anda kemungkinan sudah masuk. Sistem akan menutup formulir dan memuat ulang tabel untuk memastikannya.");
            
            tutupModalJadwal();
            muatJadwalMaster();
        })
        .finally(() => {
            // Kembalikan tombol ke semula setelah jeda
            setTimeout(() => {
                if (btnSubmit && btnSubmit.tagName === 'BUTTON') {
                    btnSubmit.innerText = teksAsli;
                    btnSubmit.disabled = false;
                }
            }, 3000);
        });
    }

    function hapusJadwal(idJdw, baris) {
        if(confirm(`Apakah Anda yakin ingin menghapus kode jadwal ${idJdw}?`)) {
            fetch(WEB_APP_URL, {
                method: "POST",
                body: JSON.stringify({ action: "hapusJadwalDokter", barisSheet: baris })
            })
            .then(res => res.json())
            .then(res => {
                if(res.result === "success") {
                    alert("Jadwal telah berhasil dihapus dari sistem!");
                    muatJadwalMaster();
                }
            });
        }
    }

    // Fungsi untuk membuka modal pop-up tambah jadwal
    function bukaModalJadwal() {
        document.getElementById('modalTambahJadwal').style.display = 'flex';
        muatDropdownDokterJadwal(); // Ambil list dokter terbaru dari database saat modal dibuka
    }

    // Fungsi untuk menutup modal pop-up
    function tutupModalJadwal() {
        document.getElementById('modalTambahJadwal').style.display = 'none';
    }

    // Fungsi otomatis mengisi pilihan dropdown nama dokter langsung dari database tabel Users
    function muatDropdownDokterJadwal() {
        const selectDokterModal = document.getElementById('jadwalNamaDokter');
        const selectDokterFilter = document.getElementById('filterJadwalDokter');
        
        // BENTENG PENGAMAN: Jika dropdown filter belum ada di layar, hentikan proses agar tidak crash
        if (!selectDokterFilter) return; 

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getUsers" })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                // Isi pilihan default dengan aman
                if (selectDokterModal) selectDokterModal.innerHTML = '<option value="">-- Pilih Dokter --</option>';
                selectDokterFilter.innerHTML = '<option value="">Semua Dokter</option>';
                
                const rolesMap = res.rolesMap || {};
                
                res.data.forEach(user => {
                    if (user.status === "Aktif") {
                        const roleKey = user.idRole ? user.idRole.toLowerCase() : "";
                        const namaRole = rolesMap[roleKey] || "";
                        
                        if (namaRole.toLowerCase().includes("dokter")) {
                            // Masukkan ke dropdown modal (jika elemen modal sedang aktif/eksis)
                            if (selectDokterModal) {
                                selectDokterModal.innerHTML += `<option value="${user.username}">${user.username} (${user.idUser})</option>`;
                            }
                            // Masukkan ke dropdown filter pencarian di atas tabel
                            selectDokterFilter.innerHTML += `<option value="${user.username}">${user.username}</option>`;
                        }
                    }
                });
            } else {
                if (selectDokterModal) selectDokterModal.innerHTML = '<option value="">❌ Gagal memuat</option>';
                selectDokterFilter.innerHTML = '<option value="">❌ Gagal memuat</option>';
            }
        })
        .catch(err => {
            console.error(err);
            if (selectDokterModal) selectDokterModal.innerHTML = '<option value="">⚠️ Gangguan koneksi</option>';
            selectDokterFilter.innerHTML = '<option value="">⚠️ Gangguan koneksi</option>';
        });
    }

    // Global function untuk mengontrol pembukaan modal detail & edit pasien
    function bukaAksiPasien(noRM, mode) {
        const wadahModal = document.getElementById('modalDetailPasien');
        const containerIsi = document.getElementById('isiDetailPasien');
        
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
                    // 1. TAMPILKAN MODE BACA 11 KOLOM DATA SECARA DETAIL & LENGKAP
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
                    // 2. TAMPILKAN FORM EDIT UNTUK SELURUH 11 DATA PASIEN
                    containerIsi.innerHTML = `
                        <form id="formKoreksiPasien" onsubmit="simpanKoreksiPasien(event)">
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
    }

    // Fungsi eksekusi kirim data hasil koreksi/edit ke Google Sheets
    function simpanKoreksiPasien(e) {
        e.preventDefault();
        const sessionData = JSON.parse(localStorage.getItem('anvaya_session'));
        const usernameAktif = sessionData ? sessionData.username : "Anonymous";
        const roleAktif     = sessionData ? sessionData.role : "Staff";
        const btn = document.getElementById('btnSimpanEditPasien');
        btn.disabled = true; btn.innerText = "Menyimpan... ⏳";
        
        // 🔥 PERBAIKAN: Lengkapi seluruh parameter tangkapan data sesuai form 11 kolom
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
            status: document.getElementById('editStatus').value,
            alamat: document.getElementById('editAlamat').value,
            kecamatan: document.getElementById('editKecamatan').value,
            kota: document.getElementById('editKota').value,
            operatorUsername: usernameAktif,
            operatorRole: roleAktif
        };
        
        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
        .then(res => res.json())
        .then(res => {
            if(res.result === "success") {
                alert("Data profil pasien sukses diperbarui!");
                tutupModalDetailPasien();
                if(typeof cariDaftarPasien === "function") cariDaftarPasien(); 
            } else {
                alert("Gagal update data: " + res.message);
                btn.disabled = false; btn.innerText = "💾 Simpan Perubahan";
            }
        })
        .catch(err => {
            alert("Gangguan jaringan terdeteksi.");
            btn.disabled = false; btn.innerText = "💾 Simpan Perubahan";
        });
    }

    // Fungsi eksekusi pemicu hapus data dengan proteksi metadata
    function pemicuHapusPasien(noRM, namaPasien) {
        const konfirmasi = confirm(`Apakah Anda yakin ingin menghapus data pasien bernama "${namaPasien}" (${noRM})?\n\nSistem akan mendeteksi riwayat transaksi medis sebelum mengeksekusi.`);
        if(!konfirmasi) return;
        
        const sessionData = JSON.parse(localStorage.getItem('anvaya_session'));
        const usernameAktif = sessionData ? sessionData.username : "Anonymous";
        const roleAktif     = sessionData ? sessionData.role : "Staff";

        // Data dikemas secara lengkap dan dinamis
        const payloadData = { 
            action: "deletePasien", 
            noRM: noRM,
            operatorUsername: usernameAktif,
            operatorRole: roleAktif
        };
        
        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify(payloadData) // 🔥 PERUBAHAN: Panggil payloadData yang sudah lengkap!
        })
        .then(res => res.json())
        .then(res => {
            if(res.result === "success") {
                alert(res.message); 
                if(typeof cariDaftarPasien === "function") cariDaftarPasien(); 
            } else {
                alert("Gagal memproses hapus data: " + res.message);
            }
        })
        .catch(err => {
            console.error(err);
            alert("Gagal terhubung ke database untuk memproses penghapusan.");
        });
    }

    // Fungsi penutup jendela modal pembungkus luar
    function tutupModalDetailPasien() {
        document.getElementById('modalDetailPasien').style.display = 'none';
    }

    window.tutupModalDetailPasien = tutupModalDetailPasien;


    function pemicuKoreksiRMEDariTimeline(noRM, namaPasien, tanggalDaftar, barisSheet, anamnesa, objektif, diagnosa, perawatan, resep) {

        // 🎯 1. BONGKAR PAKSA STATUS SEMBUNYI KOLOM KIRI (SOLUSI AREA PUTIH POLOS)
        const kolomKiri = document.getElementById('kolomInputRME'); // 🔥 Ini ID Asli Anda!
        if (kolomKiri) {
            kolomKiri.style.display = 'block'; // Memunculkan kembali pembungkus form
        }

        const formKiriSplit = document.getElementById('formModalMedisSplit');
        if (formKiriSplit) {
            formKiriSplit.style.display = 'block'; // Memastikan form di dalamnya juga muncul
            formKiriSplit.dataset.activeNoRM = noRM;
            formKiriSplit.dataset.tanggalDaftar = tanggalDaftar;
            formKiriSplit.dataset.rowUpdate = barisSheet; 
        }

        // Pastikan modal riwayat utama juga ikut terbuka
        const areaKontainerRME = document.getElementById('modalRiwayatFull') || document.getElementById('sectionRME');
        if (areaKontainerRME) {
            areaKontainerRME.style.display = 'flex';
        }

        // 🎯 2. Suntikkan Identitas & Data Teks Lama ke Form
        const setNilaiDOM = (idUtama, idAlternatif, value) => {
            const el1 = document.getElementById(idUtama);
            if (el1) { el1.value = value; return; }
            const el2 = document.getElementById(idAlternatif);
            if (el2) el2.value = value;
        };

        setNilaiDOM('modalNama', 'namaPasien', namaPasien);
        setNilaiDOM('modalAnamnesa', 'txtAnamnesa', anamnesa === "-" ? "" : anamnesa);
        setNilaiDOM('modalObjektif', 'txtObjektif', objektif === "-" ? "" : objektif);
        setNilaiDOM('modalDiagnosa', 'txtDiagnosa', diagnosa === "-" ? "" : diagnosa);
        setNilaiDOM('modalResep', 'txtResep', resep === "-" ? "" : resep);

        // 🎯 3. Bongkar data string JSON tindakan medis ke tabel baris dinamis
        const kontainerTindakan = document.getElementById('kontainerTindakanDinamis');
        if (kontainerTindakan) {
            kontainerTindakan.innerHTML = ""; 
            try {
                let arrTindakan = JSON.parse(perawatan);
                if (Array.isArray(arrTindakan) && arrTindakan.length > 0) {
                    arrTindakan.forEach(t => {
                        if (typeof tambahBarisTindakan === "function") {
                            tambahBarisTindakan({
                                namaTindakan: t.namaTindakan,
                                hargaDiinput: t.hargaDiinput || t.hargaBersihPerItem || 0,
                                catatanKlinis: t.catatanKlinis || ""
                            });
                        }
                    });
                }
            } catch(e) {
                if (perawatan && perawatan !== "-" && perawatan !== "" && typeof tambahBarisTindakan === "function") {
                    tambahBarisTindakan({ namaTindakan: "KUSTOM", hargaDiinput: 0, catatanKlinis: perawatan });
                }
            }
        }

        // 🎯 4. Perbarui Teks Tombol Simpan
        const btnSubmit = formKiriSplit ? formKiriSplit.querySelector('button[type="submit"]') : document.getElementById('btnSubmitRME');
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerText = "🔄 Proses Perubahan Rekam Medis";
            btnSubmit.style.background = "#e67e22";
        }
        
        // Munculkan tombol batal edit jika ada
        const btnBatal = document.getElementById('btnBatalEdit');
        if (btnBatal) {
            btnBatal.style.display = 'block';
        }

        if (typeof switchTabRME === "function") {
            switchTabRME('form');
        }
    }


    // 🔥 1. DAFTARKAN VARIABEL HALAMAN DI AREA GLOBAL SCRIPT (Paling Atas)
    // 🔥 Variabel kontrol halaman di scope global
    window.currentLogPage = 1;
    const logLimit = 50; 

    // 🔥 NAMA FUNGSI DISERAGAMKAN: Menggunakan muatLogAktivitas agar singkron dengan tombol pagination
    function muatLogAktivitas(page = 1) {
        // 🔥 FIX UTAMA: Pindahkan logLimit ke dalam fungsi agar kebal dari error inisialisasi TDZ!
        const logLimit = 50; 
        window.currentLogPage = page; 
        
        const tbody = document.getElementById('bodyLogAktivitas');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 15px;">⏳ Membaca log aktivitas halaman ${page}...</td></tr>`;
        }

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ 
                action: "getLogAktivitas", 
                page: window.currentLogPage,
                limit: logLimit // Sekarang dijamin 100% aman dan terbaca kapan pun dipanggil
            })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                if (!tbody) return;
                tbody.innerHTML = "";
                
                if (!res.data || res.data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 15px;">Belum ada log aktivitas yang tercatat.</td></tr>`;
                    if(document.getElementById('logPaginationInfo')) {
                        document.getElementById('logPaginationInfo').innerText = "Menampilkan halaman 0 dari 0";
                    }
                    if(document.getElementById('logPaginationButtons')) {
                        document.getElementById('logPaginationButtons').innerHTML = "";
                    }
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

                // Sinkronisasi status info halaman dan rendering tombol navigasi
                if(document.getElementById('logPaginationInfo')) {
                    document.getElementById('logPaginationInfo').innerText = `Menampilkan halaman ${res.currentPage} dari ${res.totalPages}`;
                }
                
                renderLogPagination(res.totalPages, res.currentPage);

            } else {
                if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Gagal memuat log: ${res.message}</td></tr>`;
            }
        })
        .catch(err => {
            console.error("Error muat log:", err);
            if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Terjadi gangguan koneksi internet.</td></tr>`;
        });
    }
    if (typeof muatLogAktivitas === "function") {
            muatLogAktivitas(1);
        }

    // 🔥 3. RAKIT FUNGSI BARU UNTUK MERENDER TOMBOL PAGINATION SECARA DINAMIS
    function renderLogPagination(totalPages, currentPage) {
        const container = document.getElementById('logPaginationButtons');
        
        // 1. WAJIB diaktifkan agar tombol tidak bertumpuk/ganda saat pindah halaman
        if (container) container.innerHTML = ""; 
        
        // 2. Ganti validasi infoPaging dengan pengecekan totalPages
        if (!container || totalPages === 0) return;

        // 3. Gunakan window.currentLogPage yang sudah kita set sebelumnya untuk konsistensi
        const halAktif = window.currentLogPage || currentPage;

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
        btnPrev.style.color = halAktif === 1 ? "#ccc" : "#2c3e50"; // 🔥 Fix Teks Hantu
        
        // PASTIKAN NAMA FUNGSI INI SESUAI DENGAN FUNGSI PEMUAT LOG ANDA (muatLogAktivitas atau muatDataLog)
        btnPrev.onclick = () => muatLogAktivitas(halAktif - 1); 
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
                // Tampilan Tombol Halaman Alternatif (Putih, Teks Terlihat)
                btnPage.style.backgroundColor = "white";
                btnPage.style.color = "#2c3e50"; // 🔥 Fix Teks Hantu
                btnPage.style.cursor = "pointer";
                btnPage.onclick = () => muatLogAktivitas(i); 
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
        btnNext.style.color = halAktif === totalPages ? "#ccc" : "#2c3e50"; // 🔥 Fix Teks Hantu
        btnNext.onclick = () => muatLogAktivitas(halAktif + 1); 
        container.appendChild(btnNext);
    }

    // 🔥 FUNGSI BARU: Mengambil seluruh data statistik untuk halaman dashboard utama
    // 🔥 SINKRONISASI: Pastikan fungsi ini otomatis dipanggil saat user masuk ke tab Beranda
    // SUNTIKKAN fungsi "muatDashboardStatistik();" ke dalam baris logika fungsi switchTab('beranda') milik Anda saat ini.
    function muatDashboardStatistik() {
        // Berikan efek loading teks awal pada widget tabel analitik
        document.getElementById('dashBodyTopKasus').innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 15px;">⏳ Mengkalkulasi data medis...</td></tr>`;
        document.getElementById('dashBodyJamSibuk').innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 15px;">⏳ Memetakan kepadatan jam...</td></tr>`;

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getDashboardStats" })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                // 1. Suntikkan Angka Makro ke Card Widget
                document.getElementById('dashTotalKunjungan').innerText = res.totalKunjungan;
                document.getElementById('dashTotalKunjunganTahun').innerText = res.totalKunjunganTahunIni;
                document.getElementById('dashPasienBaru').innerText = res.pasienBaru;
                document.getElementById('dashRasioPasien').innerText = res.rasioPasien;
                document.getElementById('dashTingkatBatal').innerText = res.tingkatBatal;
                //document.getElementById('dashRmePersen').innerText = res.rmePersen;
                document.getElementById('dashRasioGender').innerText = res.rasioGender;

                // 2. Render Tabel Top 3 Kasus Medis Terbanyak
                const tbodyKasus = document.getElementById('dashBodyTopKasus');
                tbodyKasus.innerHTML = "";
                if (res.topKasus.length === 0) {
                    tbodyKasus.innerHTML = `<tr><td colspan="2" style="text-align:center; padding:12px; color:gray;">Belum ada riwayat kasus bulan ini.</td></tr>`;
                } else {
                    res.topKasus.forEach((item, index) => {
                        const medali = ["🥇", "🥈", "🥉"][index] || "•";
                        tbodyKasus.innerHTML += `<tr style="border-bottom: 1px solid #eee;">
                            <td style="padding: 10px; font-weight:500;">${medali} ${item.nama}</td>
                            <td style="padding: 10px; text-align: center; font-weight: bold; color: #2980b9;">${item.jumlah} Pasien</td>
                        </tr>`;
                    });
                }

                // 3. Render Tabel Distribusi Jam Sibuk Kunjungan Klinik
                const tbodyJam = document.getElementById('dashBodyJamSibuk');
                tbodyJam.innerHTML = "";
                let adaDataJam = false;
                
                for (let slot in res.jamSibuk) {
                    if (res.jamSibuk[slot] > 0) adaDataJam = true;
                    
                    tbodyJam.innerHTML += `<tr style="border-bottom: 1px solid #eee;">
                        <td style="padding: 10px; font-weight:500;">📅 ${slot}</td>
                        <td style="padding: 10px; text-align: center; font-weight: bold; color: #27ae60;">${res.jamSibuk[slot]} Pasien</td>
                    </tr>`;
                }
                if (!adaDataJam) {
                    tbodyJam.innerHTML = `<tr><td colspan="2" style="text-align:center; padding:12px; color:gray;">Belum ada kunjungan tercatat bulan ini.</td></tr>`;
                }

            } else {
                console.error("Gagal memuat analitik dashboard:", res.message);
            }
        })
        .catch(err => {
            console.error("Error network dashboard stats:", err);
        });
    }

    // B. FUNGSI FETCH DATA ANALISIS MARKETING
    function muatAnalisisBisnis() {
        document.getElementById('mktBodyRetensi').innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px;">⏳ Mengaudit database rekam medis...</td></tr>`;
        document.getElementById('mktBodyZonasi').innerHTML = `<tr><td colspan="2" style="text-align:center; padding:15px;">⏳ Mengelompokkan alamat...</td></tr>`;
        document.getElementById('mktBodyHariSibuk').innerHTML = `<tr><td colspan="2" style="text-align:center; padding:15px;">⏳ Menghitung kepadatan hari...</td></tr>`;

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getMarketingAnalytics" })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                
                // 1. Render Tabel Retensi Pasien 6 Bulan Pasif
                const tbodyRetensi = document.getElementById('mktBodyRetensi');
                tbodyRetensi.innerHTML = "";
                if (res.retensiPasien.length === 0) {
                    tbodyRetensi.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:15px; color:green; font-weight:bold;">✔️ Semua pasien aktif berkunjung dalam 6 bulan terakhir!</td></tr>`;
                } else {
                    res.retensiPasien.forEach(pasien => {
                        tbodyRetensi.innerHTML += `<tr style="border-bottom:1px solid #eee;">
                            <td style="padding:8px; font-weight:bold;">${pasien.noRM}</td>
                            <td style="padding:8px;"><strong>${pasien.nama}</strong></td>
                            <td style="padding:8px; color:#27ae60; font-weight:500;">📞 ${pasien.whatsapp}</td>
                            <td style="padding:8px; color:#e74c3c; font-weight:500;">⏱️ ${pasien.kunjunganTerakhir}</td>
                        </tr>`;
                    });
                }

                // 2. Render Tabel Zonasi Domisili Terbanyak
                const tbodyZonasi = document.getElementById('mktBodyZonasi');
                tbodyZonasi.innerHTML = "";
                res.zonasiAlamat.forEach(item => {
                    tbodyZonasi.innerHTML += `<tr style="border-bottom:1px solid #eee;">
                        <td style="padding:8px; font-weight:500;">📍 ${item.wilayah}</td>
                        <td style="padding:8px; text-align:center; font-weight:bold; color:#2980b9;">${item.total} Pasien</td>
                    </tr>`;
                });

                // 3. Render Tabel Hari Kunjungan Terpadat
                const tbodyHari = document.getElementById('mktBodyHariSibuk');
                tbodyHari.innerHTML = "";
                res.analisisHari.forEach(item => {
                    tbodyHari.innerHTML += `<tr style="border-bottom:1px solid #eee;">
                        <td style="padding:8px; font-weight:500;">📅 ${item.hari}</td>
                        <td style="padding:8px; text-align:center; font-weight:bold; color:#27ae60;">${item.jumlah} Kunjungan</td>
                    </tr>`;
                });

            } else {
                alert("Gagal memuat analisis marketing: " + res.message);
            }
        })
        .catch(err => {
            console.error("Error marketing analysis:", err);
        });
    }

    // ==========================================
    // 🌟 UTILITAS BARU: UMUR, MIC & AUTO-BULLET
    // ==========================================
    function hitungUmur(tglLahir) {
        if (!tglLahir || tglLahir === "-") return "-";
        const dob = new Date(tglLahir);
        if (isNaN(dob)) return "-";
        const ageDifMs = Date.now() - dob.getTime();
        const ageDate = new Date(ageDifMs);
        return Math.abs(ageDate.getUTCFullYear() - 1970);
    }

    

    // Listener Auto-Bullet Point pada textarea
    document.addEventListener('DOMContentLoaded', function() {
        const textareas = document.querySelectorAll('.auto-bullet');
        textareas.forEach(ta => {
            ta.addEventListener('focus', function() {
                if (this.value.trim() === '') this.value = '• ';
            });
            ta.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const insert = '\n• ';
                    const start = this.selectionStart;
                    this.value = this.value.substring(0, start) + insert + this.value.substring(this.selectionEnd);
                    this.selectionStart = this.selectionEnd = start + insert.length;
                } else if (e.key === '.') {
                    e.preventDefault();
                    const insert = '.\n• ';
                    const start = this.selectionStart;
                    this.value = this.value.substring(0, start) + insert + this.value.substring(this.selectionEnd);
                    this.selectionStart = this.selectionEnd = start + insert.length;
                }
            });
        });
    });

    // =========================================================================
    // 💾 PENYIMPAN DRAF RME (DENGAN SABUK PENGAMAN & TANGGAL KONTROL)
    // =========================================================================
    function simpanDraftRME() {
        const modalRME = document.getElementById('modalRiwayatFull');
        if (modalRME && (modalRME.style.display === 'none' || modalRME.style.display === '')) return;
        if (window.isRestoringDraft) return;
        
        const elNoRM = document.getElementById('modalNoRM');
        if (!elNoRM) return;
        const noRM = elNoRM.value ? elNoRM.value.trim() : (elNoRM.innerText ? elNoRM.innerText.trim() : "");
        if (!noRM || noRM === "-" || noRM === "undefined") return;

        const ambilNilaiDualId = (idUtama, idAlternatif) => {
            const el1 = document.getElementById(idUtama);
            if (el1) return el1.value;
            const el2 = document.getElementById(idAlternatif);
            return el2 ? el2.value : "";
        };

        const barisTindakan = document.querySelectorAll('#kontainerTindakanDinamis .baris-tindakan-item');
        let listTindakanDraft = [];
        barisTindakan.forEach(row => {
            const selNama = row.querySelector('.sel-nama-tindakan');
            const inpHarga = row.querySelector('.inp-harga-tindakan');
            const inpCatatan = row.querySelector('.inp-catatan-tindakan');
            if (selNama && selNama.value && selNama.value.trim() !== "") {
                listTindakanDraft.push({
                    namaTindakan: selNama.value,
                    hargaDiinput: inpHarga ? inpHarga.value : "0",
                    catatanKlinis: inpCatatan ? inpCatatan.value : ""
                });
            }
        });

        const anamnesa = ambilNilaiDualId('modalAnamnesa', 'anamnesa');
        const objektif = ambilNilaiDualId('modalObjektif', 'objektif');
        const diagnosa = ambilNilaiDualId('modalDiagnosa', 'diagnosa');
        const resep = ambilNilaiDualId('resep', 'modalResep');

        if (listTindakanDraft.length === 0 && anamnesa === "" && objektif === "" && diagnosa === "" && resep === "") return;

        const draft = {
            visitDate: window.tanggalKunjunganAktif, // 🔥 CAP STEMPEL TANGGAL KUNJUNGAN
            anamnesa: anamnesa,
            objektif: objektif,
            diagnosa: diagnosa,
            tindakanDinamis: listTindakanDraft, 
            resep: resep,
            proPerawatan: ambilNilaiDualId('proPerawatan', 'modalProPerawatan'),
            proKontrol: ambilNilaiDualId('proKontrol', 'modalProKontrol'),
            tanggalKontrol: document.getElementById('tanggalKontrol') ? document.getElementById('tanggalKontrol').value : "",
            savedTTD: localStorage.getItem('ttd_consent_' + noRM) || ""
        };
        
        localStorage.setItem('draft_rme_' + noRM, JSON.stringify(draft));
    }

    // 🔥 FUNGSI PINTAR: Mengubah Paragraf/Kalimat Menjadi Bullet Poin Dinamis
    function formatKeBulletPoin(teks) {
        if (!teks || teks.trim() === "-" || teks.trim() === "") return "-";
        
        // 1. Pecah teks berdasarkan Enter (\n) ATAU Titik yang diikuti spasi/akhir kalimat
        // Menggunakan regex pintar agar pemecahan kalimat akurat
        let kumpulanKalimat = teks.split(/\n|(?<=\S\.)\s+/);
        
        let hasilBullet = [];
        kumpulanKalimat.forEach(kalimat => {
            let kalimatBersih = kalimat.trim();
            
            if (kalimatBersih) {
                // Jika kalimat sudah diawali bullet bawaan dokter, jangan didobel
                if (kalimatBersih.startsWith("•") || kalimatBersih.startsWith("-")) {
                    hasilBullet.push(kalimatBersih);
                } else {
                    // Tambahkan simbol bullet di depan kalimat
                    hasilBullet.push("• " + kalimatBersih);
                }
            }
        });
        
        // Satukan kembali dengan ganti baris agar white-space:pre-wrap bekerja
        return hasilBullet.join("\n");
    }

    
    // =========================================================================
    // 🚀 memuat daftar tindakan ke form RME
    // =========================================================================
    function muatMasterTindakan() {
        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getMasterTindakan" })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success" && Array.isArray(res.data)) {
                window.masterTindakanGlobal = res.data.map(item => {
                    return {
                        ...item,
                        kategori: String(item.kategori || "").trim(),
                        nama: String(item.nama || "").trim(),
                        harga: Number(item.hargaDasar || 0), 
                        hargaMaksimal: Number(item.hargaMaksimal || 0), 
                        keterangan: String(item.keterangan || "").trim(),
                        Butuh_Consent: (item.butuhConsent === 1 || String(item.butuhConsent) === "1") ? 1 : 0,
                        // 🔥 TAMBAHAN: Normalisasi nilai Butuh Lab ke memori lokal
                        Butuh_Lab: (item.butuhLab === 1 || String(item.butuhLab) === "1") ? 1 : 0
                    };
                });
                console.log("🚀 Master Tindakan Berhasil Dimuat:", window.masterTindakanGlobal.length, "item.");
            } else {
                console.error("❌ Gagal memuat master tindakan:", res.message);
            }
        })
        .catch(err => console.error("⚠️ Gangguan jaringan:", err));
    }


    // 🔥 FUNGSI UTAMA: Menambahkan Baris Tindakan dengan Filter Kategori & Format Rupiah
    function tambahBarisTindakan(dataAwal = null) {
        const kontainer = document.getElementById('kontainerTindakanDinamis');
        if (!kontainer) return;

        const rowId = "tindakan_row_" + Date.now() + Math.floor(Math.random() * 100);

        const rowWrapper = document.createElement('div');
        rowWrapper.id = rowId;
        rowWrapper.className = 'baris-tindakan-item';
        rowWrapper.style = "display: flex; flex-direction: column; background: white; padding: 15px; border: 1px solid #ebd3c7; border-radius: 4px; border-left: 4px solid #3498db; box-shadow: 0 1px 3px rgba(0,0,0,0.05);";

        // 1. Kumpulkan daftar Kategori Unik secara otomatis dari master data global
        let setKategori = new Set();
        if (window.masterTindakanGlobal && window.masterTindakanGlobal.length > 0) {
            window.masterTindakanGlobal.forEach(t => {
                if (t.kategori) setKategori.add(t.kategori.trim());
            });
        }

        let opsiKategoriHtml = `<option value="">-- Pilih Kategori / Spesialis --</option>`;
        setKategori.forEach(kat => {
            opsiKategoriHtml += `<option value="${kat}">${kat.toUpperCase()}</option>`;
        });

        // 2. Susun Layout HTML dengan Alignment Top (flex-start) Anti-Geser
        rowWrapper.innerHTML = `
            <div style="display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap;">
                <div style="flex: 1.2; min-width: 180px;">
                    <select class="sel-kategori-tindakan" style="width:100%; padding:8px; border-radius:4px; border:1px solid #bdc3c7; height: 38px;" onchange="filterTindakanPerKategori('${rowId}', this.value)" required>
                        ${opsiKategoriHtml}
                    </select>
                </div>
                
                <div style="flex: 2; min-width: 200px; display: flex; flex-direction: column; justify-content: flex-start;">
                    <select class="sel-nama-tindakan" style="width:100%; padding:8px; border-radius:4px; border:1px solid #bdc3c7; background-color: #f5f6fa; height: 38px;" onchange="pilihTindakanDinamis('${rowId}', this.value)" disabled required>
                        <option value="">-- Pilih Tindakan Medis --</option>
                    </select>
                    <!-- Label ⚠️ Wajib Consent akan diinjeksikan secara otomatis & rapi di bawah kotak ini -->
                </div>
                
                <div style="flex: 1; min-width: 150px; display: flex; align-items: center; border: 1px solid #bdc3c7; border-radius: 4px; padding-left: 10px; background-color: #f5f6fa; height: 38px; box-sizing: border-box;" class="box-harga-container">
                    <span style="color: #7f8c8d; font-weight: bold; font-size: 13px; margin-right: 5px;">Rp</span>
                    <input type="text" class="inp-harga-tindakan" placeholder="0" style="border: none; outline: none; width: 100%; padding: 8px 4px; border-radius: 0 4px 4px 0; background: transparent; height: 36px;" disabled required>
                </div>
                
                <div style="flex: 2; min-width: 200px; display: flex; gap: 5px; align-items: center;">
                    <input type="text" class="inp-catatan-tindakan" placeholder="Catatan Klinis (Gigi/Bahan)..." style="width:100%; padding:8px; border-radius:4px; border:1px solid #bdc3c7; height: 38px; box-sizing: border-box;">
                    <button type="button" class="btn-mic" style="padding: 0 10px; height: 38px; display: inline-flex; align-items: center;" onclick="mulaiDikteInputDinamis('${rowId}')">🎙️</button>
                </div>
                
                <div>
                    <button type="button" style="background-color:#e74c3c; color:white; border:none; padding:0 12px; height:38px; cursor:pointer; border-radius:4px; font-weight:bold; display:inline-flex; align-items:center;" onclick="hapusBarisTindakan('${rowId}')">🗑️</button>
                </div>
            </div>
            
            <div class="info-tindakan-detail" style="font-size: 11px; color: #7f8c8d; margin-top: 8px; display: none; line-height: 1.6;">
                <span class="lbl-kategori" style="display: inline-block; background: #34495e; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold; margin-right: 10px; margin-bottom: 4px;"></span>
                <span class="lbl-keterangan" style="display: inline-block; font-style: italic; margin-bottom: 4px;"></span>
            </div>
        `;


        kontainer.appendChild(rowWrapper);

        const elemenKategori = rowWrapper.querySelector('.sel-kategori-tindakan');
        const elemenTindakan = rowWrapper.querySelector('.sel-nama-tindakan');
        const elemenHarga = rowWrapper.querySelector('.inp-harga-tindakan');
        const elemenCatatan = rowWrapper.querySelector('.inp-catatan-tindakan');

        if (elemenKategori) elemenKategori.addEventListener('change', simpanDraftRME);
        if (elemenTindakan) {
            elemenTindakan.addEventListener('change', () => {
                simpanDraftRME();
                if (typeof periksaKebutuhanConsentUI === "function") periksaKebutuhanConsentUI();
            });
        }
        if (elemenHarga) {
            elemenHarga.addEventListener('input', simpanDraftRME);
            elemenHarga.addEventListener('change', simpanDraftRME);
        }
        if (elemenCatatan) elemenCatatan.addEventListener('input', simpanDraftRME);

        // Otomatisasi handling jika ada pengisian data awal draft/edit
        if (dataAwal) {
            const matchTindakan = window.masterTindakanGlobal.find(t => t.nama === dataAwal.namaTindakan);
            if (matchTindakan) {
                rowWrapper.querySelector('.sel-kategori-tindakan').value = matchTindakan.kategori;
                filterTindakanPerKategori(rowId, matchTindakan.kategori);
                rowWrapper.querySelector('.sel-nama-tindakan').value = dataAwal.namaTindakan;
                pilihTindakanDinamis(rowId, dataAwal.namaTindakan);
                
                const inpHarga = rowWrapper.querySelector('.inp-harga-tindakan');
                inpHarga.value = Number(dataAwal.hargaDiinput).toLocaleString('en-US');
                rowWrapper.querySelector('.inp-catatan-tindakan').value = dataAwal.catatanKlinis || "";
            }
        }

        // =========================================================================
        // 🔥 EKSEKUSI PEMBEKUAN JIKA LUNAS (UPGRADE AGRESIF)
        // =========================================================================
        if (window.isPasienLunasAktif) {
            const elemenKategori = rowWrapper.querySelector('.sel-kategori-tindakan');
            const elemenTindakan = rowWrapper.querySelector('.sel-nama-tindakan');
            const elemenHarga = rowWrapper.querySelector('.inp-harga-tindakan');
            
            // Matikan fungsi klik & ubah warna jadi abu-abu
            if (elemenKategori) { elemenKategori.disabled = true; elemenKategori.style.backgroundColor = "#e9ecef"; }
            if (elemenTindakan) { elemenTindakan.disabled = true; elemenTindakan.style.backgroundColor = "#e9ecef"; }
            if (elemenHarga) { elemenHarga.readOnly = true; elemenHarga.style.backgroundColor = "#e9ecef"; }
            
            // 🚀 PENARGETAN AGRESIF: Sapu bersih semua tombol hapus/tong sampah
            const elemenTombolHapus = rowWrapper.querySelectorAll('button, [class*="hapus"], [onclick*="hapus"]');
            elemenTombolHapus.forEach(tombol => {
                tombol.style.display = 'none';
            });
        }

        // Picu penyimpanan draft sesaat setelah baris baru ditambahkan ke layar
        simpanDraftRME();
        if (typeof periksaKebutuhanConsentUI === "function") periksaKebutuhanConsentUI();

        // 🔥 TAMBAHAN DINAMIS: Setiap kali baris tindakan ditambah/diubah, otomatis simpan ke Draf!
        setTimeout(() => {
            if (typeof simpanDraftRME === "function") simpanDraftRME();
            if (typeof periksaKebutuhanConsentUI === "function") periksaKebutuhanConsentUI();
        }, 150);
    }

    // 🔥 FUNGSI: Menghapus Baris Tindakan Tertentu
    function hapusBarisTindakan(rowId) {
        const row = document.getElementById(rowId);
        if (row) row.remove();
    }

    // =========================================================================
    // 🎯 FILTER TINDAKAN PER KATEGORI (WITH AUTO-TRIM & DATA-CONSENT INJECTION)
    // =========================================================================
    function filterTindakanPerKategori(rowId, kategoriTerpilih) {
        const row = document.getElementById(rowId);
        if (!row) return;

        let selTindakan = row.querySelector('.sel-nama-tindakan');
        const inpHarga = row.querySelector('.inp-harga-tindakan');
        const boxHarga = row.querySelector('.box-harga-container');
        const divInfo = row.querySelector('.info-tindakan-detail');

        if (!selTindakan) return;

        // 🔥 FIX DINAMIS (AUTO-REVERT): Kembalikan input teks Kustom menjadi SELECT dropdown standar
        if (selTindakan.tagName.toLowerCase() === 'input') {
            let cellTindakan = selTindakan.parentElement;
            if (cellTindakan && cellTindakan.classList.contains('wrapper-kustom-input')) {
                cellTindakan = cellTindakan.parentElement;
            }
            
            if (cellTindakan) {
                cellTindakan.innerHTML = `
                    <select class="sel-nama-tindakan" style="width:100%; padding:8px; border-radius:4px; border:1px solid #bdc3c7; background-color: #f5f6fa; height: 38px;" onchange="pilihTindakanDinamis('${rowId}', this.value)" required>
                        <option value="">-- Pilih Tindakan Medis --</option>
                    </select>
                `;
                selTindakan = row.querySelector('.sel-nama-tindakan');
                if (selTindakan) {
                    selTindakan.addEventListener('change', () => {
                        if (typeof simpanDraftRME === "function") simpanDraftRME();
                        if (typeof periksaKebutuhanConsentUI === "function") periksaKebutuhanConsentUI();
                    });
                }
            }
        }

        // 🔥 FIX DINAMIS: Sembunyikan badge consent saat kategori baru dipilih
        const badgeConsent = row.querySelector('.badge-wajib-consent');
        if (badgeConsent) badgeConsent.style.display = "none";

        // Reset status bawahan jika kategori dikosongkan
        selTindakan.innerHTML = `<option value="" data-butuh-consent="0">-- Pilih Tindakan Medis --</option>`;
        if (inpHarga) {
            inpHarga.value = "";
            inpHarga.disabled = true;
        }
        if (boxHarga) boxHarga.style.backgroundColor = "#f5f6fa";
        if (divInfo) divInfo.style.display = "none";

        const cleanKategoriTerpilih = String(kategoriTerpilih || "").trim().toLowerCase();
        if (!cleanKategoriTerpilih) {
            selTindakan.disabled = true;
            selTindakan.style.backgroundColor = "#f5f6fa";
            if (typeof periksaKebutuhanConsentUI === "function") periksaKebutuhanConsentUI();
            return;
        }

        // Aktifkan dropdown tindakan
        selTindakan.disabled = false;
        selTindakan.style.backgroundColor = "white";

        // 🔥 SUNTIKKAN OPSI TINDAKAN + ATRIBUT data-butuh-consent SECARA DINAMIS & ANTI-WHITESPACE
        const masterList = window.masterTindakanGlobal || [];
        masterList.forEach(t => {
            const katMaster = String(t.kategori || t.Kategori || "").trim().toLowerCase();
            
            if (katMaster === cleanKategoriTerpilih) {
                const namaBersih = String(t.nama || t.Nama_Tindakan || t.namaTindakan || "").trim();
                
                // Cek nilai Butuh_Consent dari database
                const valConsent = t.Butuh_Consent || t.butuhConsent || t.butuh_consent || t[3] || 0;
                const isWajib = (String(valConsent).trim() === "1" || valConsent === 1 || String(valConsent).toLowerCase() === "true");
                
                // Tanamkan atribut data-butuh-consent pada setiap tag <option>
                selTindakan.innerHTML += `<option value="${namaBersih}" data-butuh-consent="${isWajib ? '1' : '0'}">${namaBersih}</option>`;
            }
        });

        selTindakan.innerHTML += `<option value="KUSTOM" data-butuh-consent="0">Lain-lain / Tindakan Kustom</option>`;
        
        // Periksa ulang label consent agar antarmuka selalu akurat
        if (typeof periksaKebutuhanConsentUI === "function") periksaKebutuhanConsentUI();
    }

    // =========================================================================
    // 🎯 PEMILIH TINDAKAN DINAMIS (FULL FITUR: CONSENT, KOMA, & RANGE ALARM)
    // =========================================================================
    function pilihTindakanDinamis(rowId, namaTindakan) {
        const row = document.getElementById(rowId);
        if (!row) return;

        const inpHarga = row.querySelector('.inp-harga-tindakan');
        const boxHarga = row.querySelector('.box-harga-container');
        const lblKeterangan = row.querySelector('.lbl-keterangan');
        
        // 🔥 FIX 1: Tangkap elemen Label Kategori yang sebelumnya terlupakan
        const lblKategori = row.querySelector('.lbl-kategori'); 
        
        const infoDetail = row.querySelector('.info-tindakan-detail');
        let selTindakan = row.querySelector('.sel-nama-tindakan');

        const cleanNamaPilihan = String(namaTindakan || "").trim();

        // =====================================================================
        // 🛠️ MESIN KETIK PINTAR + ALARM RANGE HARGA
        // =====================================================================
        const pasangAutoFormatHarga = (minHarga = 0, maxHarga = 0) => {
            if (!inpHarga) return;
            inpHarga.oninput = function() {
                let valMurni = this.value.replace(/[^0-9]/g, '');
                if (valMurni) {
                    // 1. Format koma
                    this.value = Number(valMurni).toLocaleString('en-US');
                    
                    // 2. 🔥 VALIDASI RANGE HARGA BLOKIR SISTEM (Hanya aktif jika maxHarga > 0)
                    if (maxHarga > 0) {
                        const angkaInput = Number(valMurni);
                        if (angkaInput < minHarga || angkaInput > maxHarga) {
                            const pesanError = `Harga harus di antara Rp ${minHarga.toLocaleString('en-US')} - Rp ${maxHarga.toLocaleString('en-US')}`;
                            this.setCustomValidity(pesanError); 
                            this.style.color = "#c0392b"; 
                            if (boxHarga) boxHarga.style.border = "2px solid #e74c3c"; 
                        } else {
                            this.setCustomValidity(''); 
                            this.style.color = "inherit";
                            if (boxHarga) boxHarga.style.border = "1px solid #bdc3c7";
                        }
                    } else {
                        this.setCustomValidity('');
                        this.style.color = "inherit";
                        if (boxHarga) boxHarga.style.border = "1px solid #bdc3c7";
                    }
                } else {
                    this.value = "";
                    this.setCustomValidity('');
                    this.style.color = "inherit";
                    if (boxHarga) boxHarga.style.border = "1px solid #bdc3c7";
                }
                if (typeof simpanDraftRME === "function") simpanDraftRME();
            };
        };

        // =====================================================================
        // 🛑 JIKA DIKOSONGKAN (-- Pilih Tindakan --)
        // =====================================================================
        if (!cleanNamaPilihan) {
            if (inpHarga) { 
                inpHarga.value = ""; 
                inpHarga.disabled = true; 
                inpHarga.setCustomValidity(''); 
                inpHarga.style.color = "inherit";
            }
            if (boxHarga) {
                boxHarga.style.backgroundColor = "#f5f6fa"; 
                boxHarga.style.border = "1px solid #bdc3c7";
            }
            if (infoDetail) infoDetail.style.display = 'none';
            const badgeLama = row.querySelector('.badge-wajib-consent');
            if (badgeLama) badgeLama.style.display = 'none';
            if (typeof periksaKebutuhanConsentUI === "function") periksaKebutuhanConsentUI();
            return;
        }

        // =====================================================================
        // 🔥 SKENARIO 1: TINDAKAN "KUSTOM"
        // =====================================================================
        if (cleanNamaPilihan.toUpperCase() === "KUSTOM") {
            if (selTindakan && selTindakan.tagName.toLowerCase() === 'select') {
                const parentCell = selTindakan.parentElement;
                parentCell.innerHTML = `
                    <div class="wrapper-kustom-input" style="display:flex; width:100%;">
                        <input type="text" class="sel-nama-tindakan" placeholder="Ketik nama tindakan..." style="width:100%; padding:8px; border-radius:4px; border:1px solid #bdc3c7; height: 38px;" onchange="simpanDraftRME(); periksaKebutuhanConsentUI();" required>
                    </div>
                `;
                setTimeout(() => {
                    const newInp = row.querySelector('.sel-nama-tindakan');
                    if (newInp) newInp.focus();
                }, 50);
            }
            
            if (inpHarga) {
                inpHarga.disabled = false;
                inpHarga.readOnly = false;
                inpHarga.value = "";
                inpHarga.placeholder = "Ketik harga manual...";
                inpHarga.setCustomValidity(''); 
                inpHarga.style.color = "inherit";
                
                if (boxHarga) {
                    boxHarga.style.backgroundColor = "white"; 
                    boxHarga.style.border = "1px solid #bdc3c7";
                }
                pasangAutoFormatHarga(0, 0); 
            }
            
            if (infoDetail) infoDetail.style.display = 'none';
            const badgeLama = row.querySelector('.badge-wajib-consent');
            if (badgeLama) badgeLama.style.display = 'none';

            if (typeof simpanDraftRME === "function") simpanDraftRME();
            if (typeof periksaKebutuhanConsentUI === "function") periksaKebutuhanConsentUI();
            return;
        }

        // =====================================================================
        // 🔥 SKENARIO 2: TINDAKAN DARI DATABASE (RANGE ATAU FIXED)
        // =====================================================================
        const match = (window.masterTindakanGlobal || []).find(t => {
            const n1 = String(t.nama || "").trim().toLowerCase();
            return n1 === cleanNamaPilihan.toLowerCase();
        });

        let isWajibConsent = false;

        if (match) {
            const hargaDasar = Number(match.harga || 0);
            const hargaMaksimal = Number(match.hargaMaksimal || 0);
            
            if (inpHarga) {
                inpHarga.value = hargaDasar > 0 ? hargaDasar.toLocaleString('en-US') : "";
                inpHarga.setCustomValidity(''); 
                inpHarga.style.color = "inherit";
                if (boxHarga) boxHarga.style.border = "1px solid #bdc3c7";
                
                if (hargaMaksimal > 0 && hargaMaksimal !== hargaDasar) {
                    inpHarga.disabled = false;
                    inpHarga.readOnly = false;
                    inpHarga.placeholder = `Rp ${hargaDasar.toLocaleString('en-US')} - ${hargaMaksimal.toLocaleString('en-US')}`;
                    if (boxHarga) boxHarga.style.backgroundColor = "white"; 
                    pasangAutoFormatHarga(hargaDasar, hargaMaksimal); 
                } else {
                    inpHarga.disabled = true; 
                    inpHarga.placeholder = "0";
                    if (boxHarga) boxHarga.style.backgroundColor = "#f5f6fa"; 
                    inpHarga.oninput = null; 
                }
                inpHarga.dispatchEvent(new Event('input'));
                inpHarga.dispatchEvent(new Event('change'));
            }
            
            // =====================================================================
            // 🔥 FIX 2: SUNTIKKAN DATA KATEGORI DAN KETERANGAN KE LABEL HTML
            // =====================================================================
            const teksKet = String(match.keterangan || "").trim();
            const teksKategori = String(match.kategori || "").trim();
            
            if (lblKeterangan) lblKeterangan.innerText = teksKet;
            
            // Cek jika kategori ada, cetak huruf besar. Jika tidak, hilangkan background-nya agar rapi.
            if (lblKategori) {
                if (teksKategori) {
                    lblKategori.innerText = teksKategori.toUpperCase();
                    lblKategori.style.display = 'inline-block';
                } else {
                    lblKategori.innerText = "";
                    lblKategori.style.display = 'none'; // Sembunyikan kotaknya jika kategori kosong
                }
            }
            
            // Tampilkan kontainer detail jika Kategori ATAU Keterangan ada isinya
            if (infoDetail) {
                infoDetail.style.display = (teksKet || teksKategori) ? 'block' : 'none';
            }
            // =====================================================================

            const butuhConsentVal = match.Butuh_Consent || match.butuhConsent || 0;
            isWajibConsent = (String(butuhConsentVal).trim() === "1" || butuhConsentVal === 1 || String(butuhConsentVal).toLowerCase() === "true");
        }

        // =====================================================================
        // 🛡️ PENANGANAN BADGE CONSENT 
        // =====================================================================
        selTindakan = row.querySelector('.sel-nama-tindakan');
        if (!isWajibConsent && selTindakan && selTindakan.tagName.toLowerCase() === 'select' && selTindakan.selectedIndex >= 0) {
            const optAktif = selTindakan.options[selTindakan.selectedIndex];
            if (optAktif && optAktif.getAttribute('data-butuh-consent') === "1") {
                isWajibConsent = true;
            }
        }

        let badge = row.querySelector('.badge-wajib-consent');
        if (isWajibConsent) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'badge-wajib-consent';
                badge.style = "display: inline-block; background-color: #e67e22; color: white; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 3px; margin-top: 4px; align-self: flex-start;";
                badge.innerHTML = "⚠️ Wajib Informed Consent";
                if (selTindakan && selTindakan.parentElement) selTindakan.parentElement.appendChild(badge);
            } else {
                badge.style.display = "inline-block";
            }
        } else if (badge) {
            badge.style.display = "none";
        }

        if (typeof simpanDraftRME === "function") simpanDraftRME();
        if (typeof periksaKebutuhanConsentUI === "function") periksaKebutuhanConsentUI();
    }

    // 🔥 FUNGSI PEMBANTU: Menghubungkan Mic dengan Input Catatan Klinis Dinamis
    function mulaiDikteInputDinamis(rowId) {
        const row = document.getElementById(rowId);
        if (!row) return;
        const inputCatatan = row.querySelector('.inp-catatan-tindakan');
        
        // Berikan ID sementara khusus pada input catatan agar fungsi dikte kita bisa menguncinya
        const tempId = "temp_mic_" + rowId;
        inputCatatan.id = tempId;
        
        if (typeof mulaiDikte === "function") {
            mulaiDikte(tempId);
        }
    }

    // 🔥 FUNGSI UTAMA KASIR: Menarik dan Memetakan Antrean Billing Pasien
    // =========================================================================
    // 💰 PEMUAT ANTREAN KASIR (DENGAN SMART RADAR CETAK CONSENT)
    // =========================================================================
    function muatAntreanKasir() {
        const tbody = document.getElementById('tbodyAntreanKasir');
        if (!tbody) return;

        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #7f8c8d; font-weight: bold;">Mengambil data antrean kasir... ⏳</td></tr>`;

        // =====================================================================
        // 🔥 PANGGIL LAYAR HITAM LOADING DI SINI (Sebelum Fetch dimulai)
        // =====================================================================
        if (typeof tampilkanLoading === "function") tampilkanLoading("⏳ Menarik Data Antrean Kasir dari Server...");

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getAntreanKasir" })
        })
        .then(res => res.json())
        .then(res => {
            // =====================================================================
            // 🔥 MATIKAN LAYAR HITAM LOADING DI SINI (Begitu balasan dari server tiba)
            // =====================================================================
            if (typeof sembunyikanLoading === "function") sembunyikanLoading();

            tbody.innerHTML = ""; 
            
            if (res.result !== "success") {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #e74c3c; font-weight: bold;">❌ Gagal memuat data: ${res.message}</td></tr>`;
                return;
            }

            if (!res.data || res.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: #27ae60; font-weight: bold;">🎉 Semua antrean pembayaran hari ini telah lunas dibayar!</td></tr>`;
                return;
            }

            window.currentKasirQueueData = res.data;

            res.data.forEach(p => {
                // 🔥 ENGINE RINGKASAN & RADAR CONSENT
                let htmlTindakanRingkas = "-";
                let butuhConsent = false;
                
                const savedPdf = localStorage.getItem('pdf_url_consent_' + p.noRM);
                const savedTtd = localStorage.getItem('ttd_consent_' + p.noRM);
                if ((savedPdf && savedPdf !== "-" && savedPdf !== "undefined") || 
                    (savedTtd && savedTtd !== "-" && savedTtd !== "undefined")) {
                    butuhConsent = true;
                }

                try {
                    let arrTindakan = JSON.parse(p.tindakanRaw);
                    if (Array.isArray(arrTindakan) && arrTindakan.length > 0) {
                        if (arrTindakan.length > 1) {
                            htmlTindakanRingkas = `<strong style="color: #2c3e50;">${arrTindakan[0].namaTindakan}</strong> <span style="color: #ebd3c7; background: #fdf2e9; padding: 2px 5px; border-radius: 3px; font-size: 11px; font-weight: bold; margin-left: 4px;">+${arrTindakan.length - 1} lainnya</span>`;
                        } else {
                            htmlTindakanRingkas = `<span style="color: #2c3e50; font-weight: 500;">${arrTindakan[0].namaTindakan}</span>`;
                        }

                        if (!butuhConsent) {
                            arrTindakan.forEach(t => {
                                let teks = String(t.namaTindakan || "").trim().toLowerCase();
                                let isBerisiko = false;
                                
                                const masterArray = window.masterTindakanGlobal || [];
                                const foundItem = masterArray.find(item => String(item.nama || "").trim().toLowerCase() === teks);
                                if (foundItem) {
                                    const valConsent = foundItem.Butuh_Consent || foundItem.butuhConsent || 0;
                                    if (String(valConsent) === "1" || valConsent === 1 || String(valConsent).toLowerCase() === "true") isBerisiko = true;
                                }
                                
                                if (!isBerisiko) {
                                    if (teks.includes("odontektomi") || teks.includes("exo") || teks.includes("cabut") || 
                                        teks.includes("implan") || teks.includes("bedah") || teks.includes("insisi") || 
                                        teks.includes("gingiv") || teks.includes("frenektomi") || teks.includes("alveol") || 
                                        teks.includes("operkul") || teks.includes("kista") || teks.includes("graft") || 
                                        teks.includes("sinus") || teks.includes("valplas") || teks.includes("crown")) {
                                        isBerisiko = true;
                                    }
                                }
                                
                                if (isBerisiko) butuhConsent = true; 
                            });
                        }
                    }
                } catch (e) {
                    htmlTindakanRingkas = p.tindakanRaw || "-";
                }

                let btnCetakConsentHtml = "";
                const serverPdf = p.pdfConsentUrl || ""; 
                
                if (butuhConsent || serverPdf !== "") {
                    btnCetakConsentHtml = `
                        <button onclick="cetakConsentKasir('${p.noRM}', '${serverPdf}')" 
                                style="background-color: #3498db; color: white; border: none; padding: 6px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; margin-right: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" title="Cetak Dokumen Informed Consent Pasien">
                            🖨️ Cetak Consent
                        </button>
                    `;
                }

                const tr = document.createElement('tr');
                tr.style.borderBottom = "1px solid #dee2e6";

                tr.innerHTML = `
                    <td style="padding: 12px 10px; font-weight: bold; color: #2980b9; vertical-align: middle;">${p.noRM}</td>
                    <td style="padding: 12px 10px; font-weight: 600; vertical-align: middle; line-height: 1.4;">
                        ${p.namaPasien}
                    </td>
                    <td style="padding: 12px 10px; color: #7f8c8d; vertical-align: middle;">${p.tanggalDaftar}</td>
                    <td style="padding: 12px 10px; vertical-align: middle;">🩺 Dr. ${p.namaDokter}</td>
                    <td style="padding: 12px 10px; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle;" title="Klik Proses Bayar untuk detail lengkap">
                        ${htmlTindakanRingkas}
                    </td>
                    <td style="padding: 12px 10px; vertical-align: middle;">
                        <span style="background-color: #fce4d6; color: #c65911; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">
                            ${p.statusBayar}
                        </span>
                    </td>
                    <td style="padding: 12px 10px; text-align: center; vertical-align: middle;">
                        <div style="display: flex; gap: 6px; justify-content: center; align-items: stretch; flex-wrap: wrap;">
                            ${btnCetakConsentHtml}
                            <button onclick="kirimPingAsisten('${p.namaPasien}')" 
                                    style="background-color: #f39c12; color: white; border: none; padding: 6px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; white-space: nowrap;" title="Ingatkan dokter/asisten untuk input RME">
                                🔔 Ping
                            </button>
                            <button onclick="bukaModalProsesBilling('${p.noRM}', '${JSON.stringify(p.barisPendaftaran).replace(/"/g, '&quot;')}')" 
                                    style="background-color: #2ecc71; color: white; border: none; padding: 6px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; white-space: nowrap;">
                                💰 Proses Bayar
                            </button>
                        </div>
                    </td>
                `;

                tbody.appendChild(tr);
            });
        })
        .catch(err => {
            // =====================================================================
            // 🔥 MATIKAN LAYAR HITAM LOADING JIKA KONEKSI TERPUTUS
            // =====================================================================
            if (typeof sembunyikanLoading === "function") sembunyikanLoading();

            console.error(err);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #e74c3c; font-weight: bold;">⚠️ Gangguan koneksi jaringan antrean kasir.</td></tr>`;
        });
    }

    // =========================================================================
    // 🖨️ AKSI TOMBOL CETAK CONSENT DARI KASIR (FIX CROSS-DEVICE)
    // =========================================================================
    function cetakConsentKasir(noRM, serverPdfUrl = "") {
        const cleanNoRM = String(noRM).trim();
        
        // 🔥 1. PRIORITAS UTAMA: Gunakan URL resmi dari Database Server (Aman lintas komputer)
        if (serverPdfUrl && serverPdfUrl.startsWith('http')) {
            window.open(serverPdfUrl, '_blank');
            return;
        }

        // 2. FALLBACK LOKAL (Jika jaringan server delay)
        const savedPdf = localStorage.getItem('pdf_url_consent_' + cleanNoRM);
        const savedTtd = localStorage.getItem('ttd_consent_' + cleanNoRM);
        
        if (savedPdf && savedPdf.startsWith('http')) {
            window.open(savedPdf, '_blank');
        } else if (savedTtd && savedTtd.startsWith('http')) {
            window.open(savedTtd, '_blank');
        } else {
            alert("⚠️ Dokumen PDF masih dalam proses pembuatan di server, atau dokter belum menekan tombol 'Simpan Persetujuan'.\n\nSilakan klik tombol '🔄 Segarkan Antrean' dalam beberapa detik, lalu coba cetak kembali.");
        }
    }

    // 🔥 FUNGSI KEDUA: Simpan Pembukuan sekaligus Generate PDF
    function eksekusiFinalBilling(noRM) {
        const barisPendaftaran = document.getElementById('billBarisPendaftaran').value;
        const namaPasien = document.getElementById('billNama').innerText;
        const metodeBayar = document.getElementById('selBillMetode').value;
        const btnKunciCetak = document.getElementById('btnKunciCetak');
        
        const diskonMurni = Number(document.getElementById('inpBillDiskon').value.replace(/[^0-9]/g, '')) || 0;
        
        // Grand Total murni hanya dari tindakan dikurangi diskon
        const grandTotalMurni = window.totalTindakanAktifKasir - diskonMurni;
        
        const sessionData = JSON.parse(localStorage.getItem('anvaya_session'));
        const usernameAktif = sessionData ? sessionData.username : "Kasir";

        if (!barisPendaftaran) {
            alert("⚠️ Gagal memproses, indeks baris antrean terputus. Silakan muat ulang halaman.");
            return;
        }

        const pasien = window.currentKasirQueueData.find(p => p.noRM === noRM && JSON.stringify(p.barisPendaftaran) === barisPendaftaran);
        const tindakanRawStr = pasien ? pasien.tindakanRaw : "[]";

        // Teks Konfirmasi Dinamis 
        let pesanKonfirmasi = `Konfirmasi Pembayaran & Cetak Kuitansi:\nPasien: ${namaPasien}\n`;
        pesanKonfirmasi += `Tindakan Medis (Nett): Rp ${grandTotalMurni.toLocaleString('id-ID')}\n`;
        pesanKonfirmasi += `\nTOTAL DIBAYAR HARI INI: Rp ${grandTotalMurni.toLocaleString('id-ID')}\nMetode: ${metodeBayar}\n\nLanjutkan & Buat PDF?`;

        if (!confirm(pesanKonfirmasi)) return;

        if (btnKunciCetak) {
            btnKunciCetak.disabled = true;
            btnKunciCetak.innerText = "⏳ Sedang Mengukir Kuitansi...";
        }

        // 🔥 PANGGIL LAYAR HITAM LOADING DI SINI (Setelah Kasir Klik OK)
        // Teksnya dibuat meyakinkan agar kasir sabar menunggu PDF selesai digenerate
        if (typeof tampilkanLoading === "function") tampilkanLoading("⏳ Memproses Pembayaran & Membuat Kuitansi PDF...");

        // 🔥 LAPIS 1: Buat Token Kasir Unik jika belum ada
        if (!window.tokenKasirUnik) {
            window.tokenKasirUnik = "KASIR-" + new Date().getTime() + "-" + Math.floor(Math.random() * 10000);
        }

        // Payload yang dikirim ke Google Sheets 
        const payload = {
            action: "prosesFinalBilling",
            tokenId: window.tokenKasirUnik, 
            barisPendaftaran: barisPendaftaran,
            noRM: noRM,
            namaPasien: namaPasien,
            tindakanRaw: tindakanRawStr,
            totalTindakan: window.totalTindakanAktifKasir,
            diskon: diskonMurni,
            biayaLab: 0,        
            dpLab: 0,           
            labelCetakLab: "",  
            sisaPiutang: 0,     
            grandTotal: grandTotalMurni,
            metodePembayaran: metodeBayar,
            kasirOperator: usernameAktif
        };

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(res => {
            // 🔥 MATIKAN LAYAR HITAM LOADING DI SINI (Saat PDF sudah siap dan balasan server tiba)
            if (typeof sembunyikanLoading === "function") sembunyikanLoading();

            if (btnKunciCetak) {
                btnKunciCetak.disabled = false;
                btnKunciCetak.innerText = "🖨️ Kunci & Cetak Kuitansi PDF";
            }
            
            if (res.result === "success") {
                alert(`🎉 PEMBAYARAN & KUITANSI PDF BERHASIL DIBUAT!`);
                
                // 🔥 Reset token karena transaksi sudah benar-benar sukses dan selesai
                window.tokenKasirUnik = null; 
                
                // Buka PDF di tab baru
                if (res.pdfUrl) window.open(res.pdfUrl, '_blank');
                
                tutupModalBilling();
                if (typeof muatAntreanKasir === "function") muatAntreanKasir();
            } else {
                alert("❌ Gagal membuat kuitansi PDF: " + res.message);
            }
        })
        .catch(err => {
            // 🔥 MATIKAN LAYAR HITAM LOADING JIKA INTERNET TERPUTUS
            if (typeof sembunyikanLoading === "function") sembunyikanLoading();

            console.error(err);
            
            // 🔥 LAPIS 3 (MANAJEMEN PANIK UX KASIR)
            if (btnKunciCetak) {
                btnKunciCetak.innerText = "Koneksi Terputus...";
            }
            alert("⚠️ KONEKSI TERPUTUS SAAT MEMPROSES PEMBAYARAN!\n\nJangan panik. Transaksi Anda kemungkinan besar sudah berhasil dicatat dan PDF sedang dibuat oleh sistem.\n\nSistem akan memuat ulang antrean kasir. Jika nama pasien sudah hilang dari antrean, berarti pembayaran SUKSES masuk ke laporan keuangan.");
            
            tutupModalBilling();
            if (typeof muatAntreanKasir === "function") muatAntreanKasir();
            
            setTimeout(() => {
                if (btnKunciCetak) {
                    btnKunciCetak.disabled = false;
                    btnKunciCetak.innerText = "🖨️ Kunci & Cetak Kuitansi PDF";
                }
            }, 5000);
        });
    }

    window.totalTindakanAktifKasir = 0;

    
    // 🔥 FUNGSI: Membuka Jendela Kasir & Membongkar Rincian Objek JSON (ANTI-NaN)
    function bukaModalProsesBilling(noRM, barisPendaftaranStr) {
        if (!window.currentKasirQueueData) return;
        const pasien = window.currentKasirQueueData.find(p => p.noRM === noRM && JSON.stringify(p.barisPendaftaran) === barisPendaftaranStr);
        if (!pasien) {
            alert("⚠️ Data antrean pasien gagal dibaca dari memori.");
            return;
        }

        document.getElementById('billNoRM').innerText = pasien.noRM;
        document.getElementById('billNama').innerText = pasien.namaPasien;
        document.getElementById('billDokter').innerText = pasien.namaDokter;
        document.getElementById('billTanggal').innerText = pasien.tanggalDaftar;
        document.getElementById('billBarisPendaftaran').value = JSON.stringify(pasien.barisPendaftaran);
        
        // 🔥 Hanya menyisakan reset untuk Diskon. (Perintah reset Lab sudah dibuang)
        document.getElementById('inpBillDiskon').value = "";

        const tbody = document.getElementById('tbodyItemBilling');
        tbody.innerHTML = "";
        window.totalTindakanAktifKasir = 0;

        try {
            let arrTindakan = JSON.parse(pasien.tindakanRaw);
            if (Array.isArray(arrTindakan) && arrTindakan.length > 0) {
                arrTindakan.forEach(t => {
                    const hargaMurniItem = Number(t.hargaDiinput || t.hargaBersihPerItem) || 0;
                    window.totalTindakanAktifKasir += hargaMurniItem;
                    
                    let tr = document.createElement('tr');
                    tr.style.borderBottom = "1px solid #f2f4f4";
                    tr.innerHTML = `
                        <td style="padding: 8px; font-weight: 600; color: #34495e;">
                            ${t.namaTindakan} <br>
                            <span style="font-size:10px; color:#16a085; font-weight: bold;">👨‍⚕️ Dr. ${t.dokterPelaksana || 'Umum'}</span>
                        </td>
                        <td style="padding: 8px; color: #7f8c8d; font-style: italic;">${t.catatanKlinis || '-'}</td>
                        <td style="padding: 8px; text-align: right; font-weight: bold;">Rp ${hargaMurniItem.toLocaleString('id-ID')}</td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:15px; color:gray;">⚠️ Tidak ada rincian tindakan medis.</td></tr>`;
            }
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:15px; color:red;">⚠️ Error membaca data tindakan.</td></tr>`;
        }

        document.getElementById('lblBillTotalTindakan').innerText = "Rp " + window.totalTindakanAktifKasir.toLocaleString('id-ID');
        
        // Panggil kalkulator mode simpel
        hitungGrandTotalBillingRealtime();
        document.getElementById('modalBillingKasir').style.display = 'flex';
    }

    function tutupModalBilling() {
        document.getElementById('modalBillingKasir').style.display = 'none';
    }

    // 🔥 Mode Kasir Simpel (All-In)
    function hitungGrandTotalBillingRealtime() {
        const inpDiskon = document.getElementById('inpBillDiskon');
        let nominalDiskon = Number(inpDiskon.value.replace(/[^0-9]/g, '')) || 0;

        if (nominalDiskon > window.totalTindakanAktifKasir) nominalDiskon = window.totalTindakanAktifKasir;
        
        inpDiskon.value = nominalDiskon ? nominalDiskon.toLocaleString('id-ID') : '';

        let grandTotalHariIni = window.totalTindakanAktifKasir - nominalDiskon;
        document.getElementById('lblBillGrandTotal').innerText = "Rp " + grandTotalHariIni.toLocaleString('id-ID');
    }

    // 🔥 FUNGSI UTAMA: Mengunci Transaksi Finansial & Mengirim Data Rekap ke Sheets
    function eksekusiKunciPembayaranResmi() {
        const barisPendaftaran = document.getElementById('billBarisPendaftaran').value;
        const noRM = document.getElementById('billNoRM').innerText;
        const namaPasien = document.getElementById('billNama').innerText;
        const metodeBayar = document.getElementById('selBillMetode').value;
        const btnKunci = document.getElementById('btnKunciKuitansi');
        
        const diskonMurni = Number(document.getElementById('inpBillDiskon').value.replace(/[^0-9]/g, '')) || 0;
        
        // 🔥 Grand Total sekarang murni hanya dari tindakan dikurangi diskon
        const grandTotalMurni = window.totalTindakanAktifKasir - diskonMurni;
        
        const sessionData = JSON.parse(localStorage.getItem('anvaya_session'));
        const usernameAktif = sessionData ? sessionData.username : "Kasir";

        if (!barisPendaftaran) {
            alert("⚠️ Gagal memproses, indeks baris antrean terputus. Silakan muat ulang halaman.");
            return;
        }

        // 🔥 Teks Konfirmasi Dinamis (Bersih dari urusan Lab)
        let pesanKonfirmasi = `Konfirmasi Pembayaran:\nPasien: ${namaPasien}\n`;
        pesanKonfirmasi += `Tindakan Medis (Nett): Rp ${grandTotalMurni.toLocaleString('id-ID')}\n`;
        pesanKonfirmasi += `\nTOTAL DIBAYAR HARI INI: Rp ${grandTotalMurni.toLocaleString('id-ID')}\nMetode: ${metodeBayar}\n\nLanjutkan?`;

        if (!confirm(pesanKonfirmasi)) return;

        btnKunci.disabled = true;
        btnKunci.innerText = "⏳ Mengunci Nota & Pembukuan...";

        // 🔥 Payload yang dikirim ke Google Sheets (Lab diset 0 secara default)
        const payload = {
            action: "kunciPembayaran",
            barisPendaftaran: barisPendaftaran,
            noRM: noRM,
            namaPasien: namaPasien,
            totalTindakan: window.totalTindakanAktifKasir,
            diskon: diskonMurni,
            biayaLab: 0,    // <-- Diset 0 agar backend tidak error
            dpLab: 0,       // <-- Diset 0
            sisaPiutang: 0, // <-- Diset 0
            grandTotal: grandTotalMurni,
            metodePembayaran: metodeBayar,
            operator: usernameAktif
        };

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(res => {
            btnKunci.disabled = false;
            btnKunci.innerText = "💾 Kunci Pembukuan Saja";
            
            if (res.result === "success") {
                alert(`🎉 PEMBAYARAN SUKSES DIKUNCI!\n\nNomor Kuitansi Resmi:\n👉 ${res.noKuitansi}`);
                tutupModalBilling();
                if (typeof muatAntreanKasir === "function") muatAntreanKasir();
            } else {
                alert("❌ Gagal menyimpan data transaksi: " + res.message);
            }
        })
        .catch(err => {
            console.error(err);
            btnKunci.disabled = false;
            btnKunci.innerText = "💾 Kunci Pembukuan Saja";
            alert("⚠️ Terjadi gangguan jaringan internet. Silakan coba beberapa saat lagi.");
        });
    }

    function kirimPingAsisten(namaPasien) {
        if(!confirm(`Kirim notifikasi ke Ruang Dokter untuk segera menginput RME pasien ${namaPasien}?`)) return;

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ 
                action: "kirimPing", 
                namaPasien: namaPasien,
                pesan: "Pasien menunggu di Kasir. Mohon lengkapi tindakan RME."
            })
        })
        .then(res => res.json())
        .then(res => {
            if(res.result === "success") {
                alert("🔔 Pesan Ping berhasil dikirim ke Ruang Dokter!");
            } else {
                alert("Gagal mengirim Ping.");
            }
        });
    }

    // 1. Fungsi Pembuat UI Notifikasi Melayang (Toast)
    // =========================================================================
    // 🔥 FIX 1: TOAST NOTIFIKASI DENGAN TIPE CSS-TEXT YANG LEBIH STABIL
    // =========================================================================
    function tampilkanNotifikasiPing(namaPasien, pesan) {
        const toast = document.createElement('div');
        
        // 🚀 UPGRADE VISUAL: Menggunakan !important dan memindahkan posisi ke TOP-RIGHT 
        // agar kebal dari penumpukan (stacking) elemen dashboard utama
        toast.style.cssText = `
            position: fixed !important; 
            top: 20px !important; 
            right: 20px !important; 
            background-color: #e74c3c !important; 
            color: white !important; 
            padding: 15px 20px !important; 
            border-radius: 8px !important; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.3) !important; 
            z-index: 9999999 !important; 
            display: flex !important; 
            align-items: center !important; 
            gap: 15px !important; 
            font-family: sans-serif !important; 
            min-width: 320px !important; 
            max-width: 420px !important; 
            box-sizing: border-box !important;
            visibility: visible !important;
            opacity: 1 !important;
        `;
        
        toast.innerHTML = `
            <div style="font-size: 24px;">🔔</div>
            <div style="flex: 1;">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 3px;">PING DARI KASIR</div>
                <div style="font-size: 12px; opacity: 0.95;"><strong>${namaPasien}</strong>: ${pesan}</div>
            </div>
            <button style="background:none; border:none; color:white; font-size:16px; cursor:pointer; margin-left:10px; font-weight:bold;" onclick="this.parentElement.remove()">✖</button>
        `;

        // 🎯 TARGET STRATEGIS: Tempelkan ke dalam mainPage jika ada, jika tidak ada baru ke body
        const targetContainer = document.getElementById('mainPage') || document.body;
        targetContainer.appendChild(toast);

        // =========================================================================
        // 📢 GENERATOR BEEP LOKAL (WEB AUDIO API)
        // =========================================================================
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); 

            oscillator.start();
            
            setTimeout(() => {
                oscillator.stop();
                audioCtx.close();
            }, 200);
        } catch(e) {
            console.log("Audio autoplay diblokir browser.");
        }

        // Lenyap otomatis dalam 10 detik
        setTimeout(() => {
            if(targetContainer.contains(toast)) toast.remove();
        }, 10000);
    }

    // =========================================================================
    // 🔥 FIX 2: RADAR PING DENGAN INITIAL LOAD INSTAN (ANTI-WAIT)
    // =========================================================================
    // function jalankanRadarPing() {
    //     const session = JSON.parse(localStorage.getItem('anvaya_session'));
    //     if (!session) return;

    //     // Fungsi inti pengambil data dari Apps Script Notifikasi
    //     function periksaNotifikasiMasuk() {
    //         fetch(WEB_APP_URL, {
    //             method: 'POST',
    //             body: JSON.stringify({ action: 'cekPing' })
    //         })
    //         .then(res => res.json())
    //         .then(res => {
    //             if (res.result === 'success' && res.data && res.data.length > 0) {
    //                 res.data.forEach(ping => {
    //                     tampilkanNotifikasiPing(ping.namaPasien, ping.pesan);
    //                 });
    //             }
    //         })
    //         .catch(err => console.error("Gagal melakukan polling notifikasi:", err));
    //     }

    //     // 🚀 BYPASS INSTAN: Jalankan sekali langsung di milidetik pertama saat aplikasi dimuat
    //     periksaNotifikasiMasuk();

    //     // Jalankan siklus rutin pemindaian setiap 30 detik ke depan
    //     setInterval(periksaNotifikasiMasuk, 30000);
    // }
    function jalankanRadarPing() {
    // Kita hanya catat sekali saja di awal saat aplikasi dimuat
    console.log("🚀 RADAR PING AKTIF: Berjalan senyap di latar belakang...");

        function periksaNotifikasiMasuk() {
            // 🤫 Semua console.log pemeriksaan rutin telah dihapus agar konsol bersih
            fetch(WEB_APP_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'cekPing' })
            })
            .then(res => res.json())
            .then(res => {
                // Hanya munculkan log JIKA benar-benar ada pesan baru yang masuk
                if (res.result === 'success' && res.data && res.data.length > 0) {
                    //console.log(`🔔 Radar mendeteksi ${res.data.length} pesan PING baru!`);
                    res.data.forEach(ping => {
                        tampilkanNotifikasiPing(ping.namaPasien, ping.pesan);
                    });
                }
            })
            .catch(err => console.error("❌ Gagal melakukan polling notifikasi:", err));
        }

        periksaNotifikasiMasuk();
        setInterval(periksaNotifikasiMasuk, 30000); // Rutin memeriksa setiap 30 detik
    }

    // Fungsi untuk membuka dan menutup Sidebar (Burger Menu)
    function toggleSidebar() {
        const sidebar = document.getElementById('appSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        
        sidebar.classList.toggle('open');
        
        // Atur overlay gelap jika di layar HP
        if (sidebar.classList.contains('open')) {
            overlay.classList.add('show');
        } else {
            overlay.classList.remove('show');
        }
    }

    // =========================================================================
    // 🔒 NAVIGASI SUB-TAB ANALISIS BISNIS (ANTI-REKURSI & AUTO-REDIRECT)
    // =========================================================================
    function switchSubTabAnalisis(targetTab, btnElement) {
        // 1. 🔥 TENTUKAN TUJUAN YANG AMAN (AUTO-REDIRECT DALAM 1 KALI JALAN)
        let tabAman = targetTab;

        if (targetTab === 'finansial') {
            const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
            const perms = sessionData.permissions || {};
            const role = (sessionData.role || '').toLowerCase();
            
            const punyaAksesFinansial = perms.akseskokpitfinansial === 1 || 
                                        perms.Akses_KokpitFinansial === 1 || 
                                        perms.kokpitFinansial === 1 || 
                                        role === 'owner' || 
                                        role === 'super admin';

            if (!punyaAksesFinansial) {
                console.warn("🔒 [RBAC] Akses Kokpit Finansial ditolak. Mengalihkan otomatis ke Operasional...");
                tabAman = 'operasional'; // Belokkan tujuan ke Operasional tanpa rekursi/looping!
            }
        }

        // 2. Matikan semua highlight tombol sub-tab
        document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active'));
        
        // 3. Nyalakan highlight pada tombol yang sesuai dengan tabAman
        if (btnElement && tabAman === targetTab) {
            btnElement.classList.add('active'); 
        } else {
            // Cari tombol secara otomatis jika dialihkan atau dipanggil oleh sistem
            const autoBtn = tabAman === 'finansial' 
                ? document.getElementById('btnSubTabFinansial') 
                : (document.querySelector('.sub-tab-btn[onclick*="operasional"]') || document.getElementById('btnSubTabDemografi'));
            if (autoBtn) autoBtn.classList.add('active');
        }

        // 4. Sembunyikan semua kamar terlebih dahulu
        const kamarOperasional = document.getElementById('subTabOperasional');
        const kamarFinansial = document.getElementById('subTabFinansial');
        
        if (kamarOperasional) kamarOperasional.style.display = 'none';
        if (kamarFinansial) kamarFinansial.style.display = 'none';

        // 5. Tampilkan HANYA kamar yang aman
        if (tabAman === 'operasional' && kamarOperasional) {
            kamarOperasional.style.display = 'block';
        }
        if (tabAman === 'finansial' && kamarFinansial) {
            kamarFinansial.style.display = 'block';
        }
    }

    // === FUNGSI DINAMIS UNTUK PILLS LAPORAN KEUANGAN (ANTI CRASH) ===
    function switchPillFinansial(targetPill, btnElement) {
        // Matikan semua tombol pill
        document.querySelectorAll('.pill-btn').forEach(btn => btn.classList.remove('active'));
        if (btnElement) btnElement.classList.add('active');

        // Sembunyikan semua konten pill
        document.querySelectorAll('.pill-content').forEach(content => content.style.display = 'none');

        // Tampilkan konten pill yang dipilih
        let idKonten = '';
        if (targetPill === 'grafik') idKonten = 'pillGrafik';
        if (targetPill === 'kinerja') idKonten = 'pillKinerja';
        if (targetPill === 'tabel') idKonten = 'pillTabel';
        
        if (idKonten) {
            const el = document.getElementById(idKonten);
            if (el) el.style.display = 'block';
        }
    }

    // === FUNGSI FORMAT RUPIAH ===
    function formatRupiahFinansial(angka) {
        return new Intl.NumberFormat('id-ID', { 
            style: 'currency', 
            currency: 'IDR', 
            minimumFractionDigits: 0 
        }).format(angka);
    }

    // === FUNGSI MENARIK DATA KEUANGAN (BERDASARKAN DATE RANGE) ===
    function muatDataFinansial() {
        // Ambil elemen tanggal secara aman
        const elTglMulai = document.getElementById('tglMulaiFinansial');
        const elTglAkhir = document.getElementById('tglAkhirFinansial');
        const tglMulai = elTglMulai ? elTglMulai.value : "";
        const tglAkhir = elTglAkhir ? elTglAkhir.value : "";
        
        // Pencarian tombol menggunakan '*=' (Contains) sehingga tahan banting!
        const btnFilter = document.querySelector('button[onclick*="muatDataFinansial"]');
        let teksAsli = "Terapkan Filter";
        
        if (btnFilter) {
            teksAsli = btnFilter.innerText;
            btnFilter.innerText = "⏳ Menarik...";
            btnFilter.disabled = true;
        }

        fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: "getLaporanFinansial", 
                startDate: tglMulai, 
                endDate: tglAkhir 
            })
        })
        .then(res => res.json())
        .then(res => {
            if (btnFilter) {
                btnFilter.innerText = teksAsli;
                btnFilter.disabled = false;
            }

            if (res.result === "success") {
                // Suntik Metrik dengan Pelindung (Safety Check)
                const elPendapatan = document.getElementById('valPendapatanBersih');
                if(elPendapatan) elPendapatan.innerText = formatRupiahFinansial(res.metrik.pendapatan);
                
                const elTransaksi = document.getElementById('valTotalTransaksi');
                if(elTransaksi) elTransaksi.innerHTML = `${res.metrik.transaksi} <span style="font-size:14px; font-weight:normal;">Nota</span>`;
                
                const elRata = document.getElementById('valRataTransaksi');
                if(elRata) elRata.innerText = formatRupiahFinansial(res.metrik.rataRata);
                
                const elDiskon = document.getElementById('valTotalDiskon');
                if(elDiskon) elDiskon.innerText = formatRupiahFinansial(res.metrik.diskon);

                // TANGKAP ELEMEN DROPDOWN PEMBAYARAN DENGAN AMAN
                const selectDokter = document.getElementById('filterSelectDokter');
                const selectTindakan = document.getElementById('filterSelectTindakan');
                const selectPembayaran = document.getElementById('filterSelectPembayaran');
                
                if (selectDokter && selectTindakan && selectPembayaran) {
                    const valDokter = selectDokter.value;
                    const valTindakan = selectTindakan.value;
                    const valPembayaran = selectPembayaran.value; 

                    selectDokter.innerHTML = '<option value="">👨‍⚕️ Semua Dokter</option>';
                    selectTindakan.innerHTML = '<option value="">🩺 Semua Tindakan</option>';
                    selectPembayaran.innerHTML = '<option value="">💳 Semua Pembayaran</option>';
                    
                    if (res.opsiFilter) {
                        res.opsiFilter.dokter.forEach(d => selectDokter.innerHTML += `<option value="${d}">${d}</option>`);
                        res.opsiFilter.tindakan.forEach(t => selectTindakan.innerHTML += `<option value="${t}">${t}</option>`);
                        if(res.opsiFilter.pembayaran) {
                            res.opsiFilter.pembayaran.forEach(p => selectPembayaran.innerHTML += `<option value="${p}">${p}</option>`);
                        }
                    }
                    
                    selectDokter.value = valDokter;
                    selectTindakan.value = valTindakan;
                    selectPembayaran.value = valPembayaran; 
                }
                
                // Indikator Pertumbuhan
                const divTumbuh = document.getElementById('valPertumbuhan');
                if (divTumbuh) {
                    if (res.metrik.pertumbuhan.arah === "naik") {
                        divTumbuh.innerHTML = `📈 Naik ${res.metrik.pertumbuhan.persen}% vs sblmnya`;
                        divTumbuh.style.color = "#a8ffc4";
                    } else if (res.metrik.pertumbuhan.arah === "turun") {
                        divTumbuh.innerHTML = `📉 Turun ${res.metrik.pertumbuhan.persen}% vs sblmnya`;
                        divTumbuh.style.color = "#ffcccc";
                    } else {
                        divTumbuh.innerHTML = `➖ Stabil (0%)`;
                        divTumbuh.style.color = "#ffffff";
                    }
                }

                // Render Grafik jika fungsinya ada
                if (typeof renderGrafikFinansial === "function") {
                    renderGrafikFinansial(res.chartData);
                }
                
                // Suntik Tabel Detail
                const tbody = document.getElementById('tbodyLaporanFinansial');
                if (tbody) {
                    tbody.innerHTML = ''; 
                    
                    if (res.dataTabel && res.dataTabel.length > 0) {
                        res.dataTabel.forEach(nota => {
                            let btnPdf = nota.linkPdf !== "#" 
                                ? `<a href="${nota.linkPdf}" target="_blank" style="background:#e74c3c; color:white; padding:5px 12px; border-radius:4px; text-decoration:none; font-size:11px; white-space: nowrap; display: inline-block; font-weight: bold; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">📄 Buka</a>` 
                                : `<span style="color:#bdc3c7; font-size:11px; white-space: nowrap;">Tidak Ada</span>`;

                            // ====================================================================
                            // 🔥 FILTER CERDAS: MEMBERSIHKAN DATA DOKTER ("-" dan Duplikat)
                            // ====================================================================
                            let strDokter = nota.dokter || "";
                            // 1. Pecah tulisan berdasarkan Enter/Ganti Baris (<br>) atau Koma
                            let arrDokter = strDokter.split(/<br\s*\/?>|,|\n/i);
                            
                            // 2. Bersihkan masing-masing baris dari "-" dan kosong
                            let dokterBersih = arrDokter.map(d => d.trim()).filter(d => {
                                // Hapus ikon dokter sementara untuk mengecek apakah isinya cuma "-"
                                let textOnly = d.replace(/👨‍⚕️/g, "").trim(); 
                                return textOnly !== "" && textOnly !== "-"; // Buang yang kosong atau "-"
                            });
                            
                            // 3. Hapus nama ganda (misal Aldila masuk 2x, jadikan 1x saja)
                            let dokterUnik = [...new Set(dokterBersih)];
                            
                            // 4. Gabungkan lagi dengan <br>, beri teks default jika tidak ada dokter sama sekali
                            let dokterFinal = dokterUnik.length > 0 
                                ? dokterUnik.join('<br>') 
                                : `<span style="color:#bdc3c7; font-style:italic;">Tanpa Dokter</span>`;
                            // ====================================================================

                            tbody.innerHTML += `
                                <tr style="border-bottom: 1px solid #eee; vertical-align: top;">
                                    <td style="padding: 12px; font-family: monospace; color:#2980b9;"><b>${nota.noKuitansi}</b></td>
                                    <td style="padding: 12px;">${nota.tanggal}</td>
                                    <td style="padding: 12px; font-weight:bold;">${nota.namaPasien}</td>
                                    <td style="padding: 12px; font-size: 12px; line-height: 1.5;">${nota.tindakan}</td>
                                    
                                    <!-- 🔥 Menggunakan variabel dokterFinal yang sudah bersih -->
                                    <td style="padding: 12px; font-size: 12px; line-height: 1.5; color: #4b6584; font-weight: 500;">${dokterFinal}</td>
                                    
                                    <td style="padding: 12px; text-align:center;">
                                        <span style="background: #f1f2f6; border: 1px solid #dcdde1; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; color: #2f3640; display: inline-block;">
                                            ${nota.metodeBayar}
                                        </span>
                                    </td>
                                    <td style="padding: 12px; text-align:right; color:#e74c3c;">${nota.diskon > 0 ? formatRupiahFinansial(nota.diskon) : '-'}</td>
                                    <td style="padding: 12px; text-align:right; color:#27ae60; font-weight:bold;">${formatRupiahFinansial(nota.grandTotal)}</td>
                                    <td style="padding: 12px; text-align:center;">${btnPdf}</td>
                                </tr>
                            `;
                        });
                    } else {
                        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:gray;">Tidak ada transaksi di rentang tanggal tersebut.</td></tr>`;
                    }
                }

                if (typeof cariTabelFinansial === "function") {
                    setTimeout(cariTabelFinansial, 100);
                }

            } else {
                alert("⚠️ Gagal memuat laporan: " + res.message);
            }
        })
        .catch(err => {
            if (btnFilter) {
                btnFilter.innerText = teksAsli;
                btnFilter.disabled = false;
            }
            console.error("🚨 TERSANGKA ERROR DITEMUKAN:", err); 
            alert("⚠️ Terjadi kesalahan jaringan.");
        });
    }

    // === FUNGSI SAPU JAGAT (RESET FILTER) ===
    function resetFilterFinansial() {
        // Kosongkan nilai di form kalender
        document.getElementById('tglMulaiFinansial').value = '';
        document.getElementById('tglAkhirFinansial').value = '';
        
        // Tembak server dengan form kosong untuk menarik data ALL-TIME
        muatDataFinansial();
    }

    // === OTOMATISASI TOMBOL PRESET CEPAT ===
    function setPresetTanggal(tipe) {
        const today = new Date();
        let start = new Date(today);
        let end = new Date(today);

        if (tipe === 'hariIni') {
            // start & end sama-sama hari ini
        } 
        else if (tipe === 'mingguIni') {
            // Tarik ke hari Senin minggu ini
            const day = today.getDay(); // 0 (Minggu) sampai 6 (Sabtu)
            const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diffToMonday);
            // Akhir minggu diset ke hari Minggu (Senin + 6)
            end = new Date(start);
            end.setDate(start.getDate() + 6);
        } 
        else if (tipe === 'bulanIni') {
            start = new Date(today.getFullYear(), today.getMonth(), 1); // Tanggal 1
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Hari terakhir bulan ini
        } 
        else if (tipe === 'tahunIni') {
            start = new Date(today.getFullYear(), 0, 1); // 1 Januari
            end = new Date(today.getFullYear(), 11, 31); // 31 Desember
        }

        const format = (d) => {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        };

        // Isi input tanggal secara otomatis
        document.getElementById('tglMulaiFinansial').value = format(start);
        document.getElementById('tglAkhirFinansial').value = format(end);
        
        // Pemicu Cerdas: Langsung tarik data tanpa perlu klik tombol biru lagi!
        muatDataFinansial();
    }

    // Ubah default loader menjadi "Bulan Ini" saat halaman dimuat
    document.addEventListener("DOMContentLoaded", function() {
        if (document.getElementById('tglMulaiFinansial')) {
            setPresetTanggal('bulanIni'); // Otomatis mengisi form dengan awal s/d akhir bulan ini
        }
    });

    // === FUNGSI FILTER PENCARIAN REAL-TIME (MULTI-KRITERIA) ===
    function cariTabelFinansial() {
        const inputTeks = document.getElementById("inputCariFinansial").value.toLowerCase();
        const filterDokter = document.getElementById("filterSelectDokter").value.toLowerCase();
        const filterTindakan = document.getElementById("filterSelectTindakan").value.toLowerCase();
        const filterPembayaran = document.getElementById("filterSelectPembayaran").value.toLowerCase(); // Baru

        const barisTabel = document.querySelectorAll("#tbodyLaporanFinansial tr");

        barisTabel.forEach(baris => {
            if (baris.cells.length < 2) return; 
            
            const noNota = baris.cells[0].innerText.toLowerCase();
            const namaPasien = baris.cells[2].innerText.toLowerCase();
            const teksTindakan = baris.cells[3].innerText.toLowerCase(); 
            const teksDokter = baris.cells[4].innerText.toLowerCase();   
            
            // Kolom ke-5 (Index 5) adalah Pembayaran
            const teksPembayaran = baris.cells[5].innerText.toLowerCase(); // Baru

            let matchTeks = noNota.includes(inputTeks) || namaPasien.includes(inputTeks);
            let matchDokter = filterDokter === "" || teksDokter.includes(filterDokter);
            let matchTindakan = filterTindakan === "" || teksTindakan.includes(filterTindakan);
            let matchPembayaran = filterPembayaran === "" || teksPembayaran.includes(filterPembayaran); // Baru

            // 🔥 Keempat syarat harus cocok agar baris muncul
            if (matchTeks && matchDokter && matchTindakan && matchPembayaran) {
                baris.style.display = ""; 
            } else {
                baris.style.display = "none"; 
            }
        });
    }

    // === MESIN PENGGAMBAR GRAFIK (CHART.JS) ===
    let chartHarianInst = null;
    let chartTindakanInst = null;

    function renderGrafikFinansial(chartData) {
        // Hancurkan grafik lama jika ada
        if(chartHarianInst) chartHarianInst.destroy();
        if(chartTindakanInst) chartTindakanInst.destroy();

        // 1. Gambar Grafik Tren Harian & ATV (Garis Ganda)
        const ctxHarian = document.getElementById('canvasChartHarian').getContext('2d');
        chartHarianInst = new Chart(ctxHarian, {
            type: 'line',
            data: {
                labels: chartData.harian.labels,
                datasets: [
                    {
                        label: 'Omzet (Rp)',
                        data: chartData.harian.omzet,
                        borderColor: '#2ecc71', backgroundColor: 'rgba(46, 204, 113, 0.1)',
                        borderWidth: 3, fill: true, tension: 0.3, yAxisID: 'y'
                    },
                    {
                        label: 'ATV / Rata-rata Trx (Rp)',
                        data: chartData.harian.atv,
                        borderColor: '#3498db', borderWidth: 2, borderDash: [5, 5],
                        type: 'line', tension: 0.3, yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: { mode: 'index', intersect: false },
                plugins: { tooltip: { callbacks: { label: function(context) { return context.dataset.label + ': Rp ' + context.raw.toLocaleString('id-ID'); } } } },
                scales: {
                    y: { type: 'linear', display: true, position: 'left', ticks: { callback: function(val) { return 'Rp ' + (val/1000000).toFixed(1) + ' Jt'; } } },
                    y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: function(val) { return 'Rp ' + (val/1000).toLocaleString('id-ID') + 'k'; } } }
                }
            }
        });

        // 🔥 SUNTIKAN BARU: Gabungkan Nama Tindakan dengan Nilai Rupiahnya untuk Label Keterangan
        let labelTindakanRupiah = chartData.tindakan.labels.map((namaTindakan, index) => {
            let nilaiRupiah = chartData.tindakan.omzet[index];
            return `${namaTindakan} (Rp ${nilaiRupiah.toLocaleString('id-ID')})`;
        });

        // 2. Gambar Grafik Kontribusi Tindakan (Kue Donat)
        const ctxTindakan = document.getElementById('canvasChartTindakan').getContext('2d');
        chartTindakanInst = new Chart(ctxTindakan, {
            type: 'doughnut',
            data: {
                // Gunakan array label baru yang sudah diisi angka Rupiah
                labels: labelTindakanRupiah, 
                datasets: [{
                    data: chartData.tindakan.omzet,
                    backgroundColor: ['#e74c3c', '#f1c40f', '#3498db', '#9b59b6', '#34495e', '#1abc9c', '#e67e22', '#d35400', '#c0392b', '#7f8c8d'],
                    borderWidth: 2, hoverOffset: 5
                }]
            },
            options: { 
                responsive: true, maintainAspectRatio: false,
                plugins: { 
                    legend: { 
                        position: 'right', 
                        labels: { 
                            font: { size: 11, weight: '500' }, // Sedikit ditebalkan agar mudah dibaca
                            padding: 15 // Beri jarak antar baris keterangan
                        } 
                    },
                    tooltip: { 
                        callbacks: { 
                            label: function(context) { return ' Kontribusi: Rp ' + context.raw.toLocaleString('id-ID'); } 
                        } 
                    }
                } 
            }
        });
    }

    // ==========================================================
    // 🔥 FITUR EXPORT: EXCEL (CSV) & CETAK PDF
    // ==========================================================
    
    // 1. Fungsi Export ke Excel (CSV)
    // ==========================================================
    // 🔥 FITUR EXPORT: EXCEL (CSV) & CETAK PDF (Versi Rapi)
    // ==========================================================
    
    // 1. Fungsi Export ke Excel (CSV)
    function exportKeCSV() {
        let csv = [];
        let header = ["No. Kuitansi", "Tanggal", "Nama Pasien", "Rincian Tindakan", "Dokter Pelaksana", "Pembayaran", "Diskon", "Grand Total"];
        csv.push(header.join(","));

        let barisTabel = document.querySelectorAll("#tbodyLaporanFinansial tr");
        
        barisTabel.forEach(row => {
            if (row.style.display !== "none" && row.cells.length > 1) { 
                let barisCsv = [];
                for (let i = 0; i < 8; i++) { 
                    let teks = "";
                    let spans = row.cells[i].querySelectorAll('span');
                    
                    // 🔥 TRIK CERDAS: Jika ini kolom Tindakan (3) atau Dokter (4), pisahkan tiap kapsul dengan Koma
                    if (spans.length > 0 && (i === 3 || i === 4)) {
                        let arrSpan = Array.from(spans).map(s => s.innerText.trim());
                        teks = arrSpan.join(", "); 
                    } else {
                        teks = row.cells[i].innerText.trim().replace(/(\r\n|\n|\r)/gm, " "); 
                    }

                    teks = teks.replace(/"/g, '""'); 
                    barisCsv.push(`"${teks}"`); 
                }
                csv.push(barisCsv.join(","));
            }
        });

        let csvString = csv.join("\n");
        let blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
        let link = document.createElement("a");
        let url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "Laporan_Keuangan_Klinik.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // 2. Fungsi Cetak & Save as PDF
    function cetakTabelPDF() {
        let tableHtml = `<table border="1" cellpadding="8" style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; text-align: left;">`;
        tableHtml += `<thead style="background-color: #f2f2f2;"><tr>
            <th>No. Kuitansi</th><th>Tanggal</th><th>Nama Pasien</th>
            <th>Tindakan</th><th>Dokter</th><th>Bayar</th>
            <th style="text-align:right;">Diskon</th><th style="text-align:right;">Grand Total</th>
        </tr></thead><tbody>`;

        let barisTabel = document.querySelectorAll("#tbodyLaporanFinansial tr");
        let adaData = false;

        barisTabel.forEach(row => {
            if (row.style.display !== "none" && row.cells.length > 1) {
                adaData = true;
                tableHtml += `<tr>`;
                for(let i = 0; i < 8; i++){
                    let align = (i === 6 || i === 7) ? 'text-align:right;' : '';
                    let teksBersih = "";
                    let spans = row.cells[i].querySelectorAll('span');
                    
                    // 🔥 TRIK CERDAS: Jika ini kolom Tindakan (3) atau Dokter (4), susun ke bawah (garis baru)
                    if (spans.length > 0 && (i === 3 || i === 4)) {
                        let arrSpan = Array.from(spans).map(s => s.innerText.trim());
                        teksBersih = arrSpan.join("<br>"); 
                    } else {
                        teksBersih = row.cells[i].innerText.trim().replace(/(\r\n|\n|\r)/gm, "<br>");
                    }

                    tableHtml += `<td style="${align}; vertical-align: top;">${teksBersih}</td>`;
                }
                tableHtml += `</tr>`;
            }
        });
        tableHtml += `</tbody></table>`;

        if(!adaData) {
            alert("⚠️ Tidak ada data untuk dicetak!"); return;
        }

        let jendelaCetak = window.open('', '_blank', 'width=900,height=600');
        jendelaCetak.document.write(`
            <html>
                <head><title>Cetak Laporan Keuangan</title></head>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2 style="text-align: center; margin-bottom: 5px;">Laporan Keuangan Klinik</h2>
                    <p style="text-align: center; font-size: 14px; color: gray; margin-top: 0; margin-bottom: 20px;">Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
                    ${tableHtml}
                    <div style="margin-top:30px; text-align:right; font-size:12px;">
                        <p>Mengetahui,</p><br><br><br><p><b>Bagian Keuangan</b></p>
                    </div>
                </body>
            </html>
        `);
        jendelaCetak.document.close();
        jendelaCetak.focus();
        
        setTimeout(() => { 
            jendelaCetak.print(); 
            jendelaCetak.close();
        }, 500);
    }

    // 2. Fungsi Cetak & Save as PDF
    // 2. Fungsi Cetak & Save as PDF (Versi Super Rapi & Terstruktur)
    function cetakTabelPDF() {
        // 🔥 TRIK 1: Kunci lebar masing-masing kolom dengan persentase (%) agar proporsional
        let tableHtml = `<table border="1" cellpadding="8" style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 11px; text-align: left;">`;
        tableHtml += `<thead style="background-color: #f2f2f2;"><tr>
            <th style="width: 12%;">No. Nota</th>
            <th style="width: 10%;">Tanggal</th>
            <th style="width: 14%;">Nama Pasien</th>
            <th style="width: 25%;">Rincian Tindakan</th>
            <th style="width: 15%;">Dokter</th>
            <th style="width: 7%; text-align:center;">Bayar</th>
            <th style="width: 8%; text-align:right;">Diskon</th>
            <th style="width: 9%; text-align:right;">Total</th>
        </tr></thead><tbody>`;

        let barisTabel = document.querySelectorAll("#tbodyLaporanFinansial tr");
        let adaData = false;

        barisTabel.forEach(row => {
            if (row.style.display !== "none" && row.cells.length > 1) {
                adaData = true;
                tableHtml += `<tr>`;
                for(let i = 0; i < 8; i++){
                    // Atur tata letak teks per kolom
                    let align = (i === 6 || i === 7) ? 'text-align:right;' : (i === 5 ? 'text-align:center;' : '');
                    let teksBersih = "";
                    let spans = row.cells[i].querySelectorAll('span');
                    
                    // 🔥 TRIK 2: Ubah Kapsul menjadi Daftar Titik (Bullet Points) <ul><li>
                    if (spans.length > 0 && (i === 3 || i === 4)) {
                        let arrSpan = Array.from(spans).map(s => `<li style="margin-bottom: 2px;">${s.innerText.trim()}</li>`);
                        teksBersih = `<ul style="margin: 0; padding-left: 14px;">${arrSpan.join("")}</ul>`; 
                    } else {
                        teksBersih = row.cells[i].innerText.trim().replace(/(\r\n|\n|\r)/gm, "<br>");
                    }

                    tableHtml += `<td style="${align} vertical-align: top;">${teksBersih}</td>`;
                }
                tableHtml += `</tr>`;
            }
        });
        tableHtml += `</tbody></table>`;

        if(!adaData) {
            alert("⚠️ Tidak ada data untuk dicetak!"); return;
        }

        let jendelaCetak = window.open('', '_blank', 'width=900,height=600');
        jendelaCetak.document.write(`
            <html>
                <head>
                    <title>Cetak Laporan Keuangan</title>
                    <style>
                        /* 🔥 TRIK 3: Anti-Potong Halaman (Mencegah 1 baris terbelah jadi 2 halaman) */
                        tr { page-break-inside: avoid; }
                        @media print {
                            @page { margin: 1.5cm; } /* Beri margin putih elegan di kertas */
                        }
                    </style>
                </head>
                <body style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                    <h2 style="text-align: center; margin-bottom: 5px; color: #2c3e50;">Laporan Keuangan Klinik</h2>
                    <p style="text-align: center; font-size: 12px; color: #7f8c8d; margin-top: 0; margin-bottom: 25px;">Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
                    
                    ${tableHtml}
                    
                    <div style="margin-top:40px; text-align:right; font-size:12px;">
                        <p>Mengetahui,</p><br><br><br><p><b>Bagian Keuangan</b></p>
                    </div>
                </body>
            </html>
        `);
        jendelaCetak.document.close();
        jendelaCetak.focus();
        
        setTimeout(() => { 
            jendelaCetak.print(); 
            jendelaCetak.close();
        }, 500);
    }

    // Variabel penyimpan data mentah dari backend
    let rawDataBagiHasil = [];
    window.dataBagiHasilGlobal = []; 
    window.periodeBagiHasilGlobal = ""; 

    function muatDataBagiHasil() {
        document.getElementById('areaBagiHasil').innerHTML = '<h4 style="text-align:center; padding:20px;">Memuat Kalkulasi Bagi Hasil... ⏳</h4>';
        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify({ action: "getBagiHasilDokter" }) })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                rawDataBagiHasil = res.data;
                kalkulasiDanRenderBagiHasil();
            } else {
                alert("Gagal memuat data: " + res.message);
            }
        });
    }

    // Fungsi Utama: Eksekusi Rumus Bisnis & Render UI (Reaktif terhadap filter)
    async function kalkulasiDanRenderBagiHasil() {
        let tglMulai = document.getElementById('tglMulaiFinansial').value;
        let tglAkhir = document.getElementById('tglAkhirFinansial').value;
        window.periodeBagiHasilGlobal = tglMulai === tglAkhir ? tglMulai : `${tglMulai} s/d ${tglAkhir}`;

        // 🔥 MENYALAKAN RADAR INGATAN PERMANEN
        if (!window.arsipGajiTerkunci) {
            try {
                // Diam-diam bertanya ke server siapa saja yang sudah dikunci
                let req = await fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify({ action: "getDaftarSlipTerkunci" }) });
                let res = await req.json();
                window.arsipGajiTerkunci = (res.result === "success") ? res.data : [];
            } catch (err) {
                window.arsipGajiTerkunci = [];
                console.log("Gagal menyalakan radar arsip", err);
            }
        }

        // Ambil "Bulan" dari tanggal filter akhir (Contoh: "2026-08-31" -> "2026-08")
        let defaultBulanFilter = tglAkhir ? tglAkhir.substring(0, 7) : "";

        let dataTerfilter = rawDataBagiHasil.filter(item => item.tanggal >= tglMulai && item.tanggal <= tglAkhir);

        let invoiceMap = {};
        dataTerfilter.forEach(item => {
            if (item.jenis !== "LAB") {
                if (!invoiceMap[item.invoice]) invoiceMap[item.invoice] = { subtotal: 0, diskon: item.diskonInvoice };
                invoiceMap[item.invoice].subtotal += (item.hargaAsli || 0);
            }
        });

        let doctorMap = {};
        dataTerfilter.forEach(item => {
            if (item.jenis !== "LAB") {
                if (!doctorMap[item.dokterPelaksana]) doctorMap[item.dokterPelaksana] = { nama: item.dokterPelaksana, jmlTindakan: 0, totalBagiHasil: 0, rincian: [] };
                let inv = invoiceMap[item.invoice];
                let rasio = inv.subtotal > 0 ? (item.hargaAsli / inv.subtotal) : 0;
                let diskonProrataItem = rasio * inv.diskon;
                
                doctorMap[item.dokterPelaksana].jmlTindakan++;
                doctorMap[item.dokterPelaksana].rincian.push({
                    tanggal: item.tanggal, invoice: item.invoice, pasien: item.namaPasien, tindakan: item.namaTindakan,
                    hargaAsli: item.hargaAsli, diskonProrata: diskonProrataItem, hargaLabVendor: 0, feeFinal: 0 
                });
            }
        });

        dataTerfilter.forEach(item => {
            if (item.jenis === "LAB") {
                let doc = doctorMap[item.dokterPelaksana];
                if (doc) {
                    let namaTindakanAsli = item.namaTindakan.replace("Potongan Lab Vendor: ", "");
                    let match = doc.rincian.find(r => r.invoice === item.invoice && r.tindakan === namaTindakanAsli);
                    if (match) match.hargaLabVendor += (item.bebanPotongan / 0.4);
                }
            }
        });

        // 🔥 KUMPULKAN TOTAL UNTUK MENGHITUNG PROFIT KLINIK
        let totalDasarBagiHasil = 0; 

        Object.values(doctorMap).forEach(doc => {
            doc.rincian.forEach(r => {
                let dasarBagiHasil = r.hargaAsli - r.hargaLabVendor - r.diskonProrata;
                totalDasarBagiHasil += dasarBagiHasil; 
                
                r.feeFinal = dasarBagiHasil * 0.4;
                doc.totalBagiHasil += r.feeFinal;
            });
        });

        let arrayDokter = Object.values(doctorMap);
        arrayDokter.sort((a, b) => b.totalBagiHasil - a.totalBagiHasil);
        window.dataBagiHasilGlobal = arrayDokter; 

        //let defaultBulanFilter = tglAkhir ? tglAkhir.substring(0, 7) : "";
        let totalBagiHasilPeriode = arrayDokter.reduce((sum, d) => sum + d.totalBagiHasil, 0);
        let totalDokterAktif = arrayDokter.length;

        // 🔥 HITUNG BONUS & POTONGAN YANG SUDAH DI-ACC (KUNCI)
        let totalBonusTerkunci = 0;
        let totalPotonganTerkunci = 0;
        if (window.arsipGajiTerkunci) {
            arrayDokter.forEach(d => {
                let dataTerkunci = window.arsipGajiTerkunci.find(x => x.namaDokter === d.nama && x.periode === defaultBulanFilter);
                if (dataTerkunci) {
                    totalBonusTerkunci += dataTerkunci.bonus;
                    totalPotonganTerkunci += dataTerkunci.potongan;
                }
            });
        }

        // 🔥 LOGIKA AKUNTANSI: Profit Klinik (60%) dikurangi Bonus yang diberikan ke Dokter, ditambah uang cicilan/kasbon yang masuk
        let profitKlinik = (totalDasarBagiHasil * 0.6) - totalBonusTerkunci + totalPotonganTerkunci;

        // --- RENDER 3 KOTAK INFO CARD BARU ---
        let htmlContent = `
            <div style="display:flex; gap:15px; margin-bottom:20px;">
                <div style="flex:1; background:#fff; padding:15px; border-radius:8px; border-left:5px solid #2ecc71; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                    <h4 style="margin:0 0 5px 0; color:#7f8c8d; font-size:12px; text-transform:uppercase; font-weight:bold;">Total Gaji Dokter</h4>
                    <h2 style="margin:0; color:#2c3e50; font-size:22px;">Rp ${totalBagiHasilPeriode.toLocaleString('id-ID')}</h2>
                    <div style="font-size:11px; color:#95a5a6; margin-top:5px;">Pokok 40% (Belum termsk bonus)</div>
                </div>
                
                <div style="flex:1; background:#fff; padding:15px; border-radius:8px; border-left:5px solid #9b59b6; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                    <h4 style="margin:0 0 5px 0; color:#7f8c8d; font-size:12px; text-transform:uppercase; font-weight:bold;">Profit Hak Klinik</h4>
                    <h2 style="margin:0; color:#9b59b6; font-size:22px;">Rp ${profitKlinik.toLocaleString('id-ID')}</h2>
                    <div style="font-size:11px; color:#95a5a6; margin-top:5px;">(Hak 60% Klinik - Bonus + Potongan)</div>
                </div>

                <div style="flex:1; background:#fff; padding:15px; border-radius:8px; border-left:5px solid #3498db; box-shadow:0 2px 5px rgba(0,0,0,0.1);">
                    <h4 style="margin:0 0 5px 0; color:#7f8c8d; font-size:12px; text-transform:uppercase; font-weight:bold;">Dokter Aktif</h4>
                    <h2 style="margin:0; color:#2c3e50; font-size:22px;">${totalDokterAktif} Dokter</h2>
                    <div style="font-size:11px; color:#95a5a6; margin-top:5px;">Dalam rentang filter terpilih</div>
                </div>
            </div>
            
            <table style="width:100%; border-collapse:collapse; background:white; box-shadow:0 1px 3px rgba(0,0,0,0.1); border-radius:8px; overflow:hidden;">
                <thead>
                    <tr>
                        <th style="padding:15px; background-color:#34495e !important; color:white !important; text-align:left; border:none; width:25%;">Nama Dokter</th>
                        <th style="padding:15px; background-color:#34495e !important; color:white !important; text-align:center; border:none; width:15%;">Jml Tindakan</th>
                        <th style="padding:15px; background-color:#34495e !important; color:white !important; text-align:center; border:none; width:35%;">Injeksi Manual & Keterangan</th>
                        <th style="padding:15px; background-color:#2c3e50 !important; color:#2ecc71 !important; text-align:right; border:none; width:25%;">Gaji Final (Take Home Pay)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if(arrayDokter.length === 0) htmlContent += `<tr><td colspan="4" style="padding:20px; text-align:center;">Tidak ada data.</td></tr>`;

        arrayDokter.forEach((d, idx) => {
            let rowId = `detail_dokter_${idx}`;
            let chevronId = `chevron_${idx}`;
            
            // 🔥 LOGIKA TARIK DATA ARSIP KE LAYAR
            let dataTerkunci = null;
            if (window.arsipGajiTerkunci) {
                dataTerkunci = window.arsipGajiTerkunci.find(x => x.namaDokter === d.nama && x.periode === defaultBulanFilter);
            }
            
            let isLocked = !!dataTerkunci;
            
            // Jika terkunci, isi dengan angka arsip (FORMAT RUPIAH). Jika belum, biarkan kosong
            let valBonus = isLocked && dataTerkunci.bonus > 0 ? dataTerkunci.bonus.toLocaleString('id-ID') : "";
            let valPotongan = isLocked && dataTerkunci.potongan > 0 ? dataTerkunci.potongan.toLocaleString('id-ID') : "";
            let valTHP = isLocked ? dataTerkunci.thp : d.totalBagiHasil;

            // Pecah Keterangan teks (Bonus: THR | Potongan: Kasbon)
            let ketBonus = "";
            let ketPotongan = "";
            if (isLocked && dataTerkunci.teksKeterangan) {
                let splitKet = dataTerkunci.teksKeterangan.split(" | Potongan: ");
                if (splitKet.length === 2) {
                    ketBonus = splitKet[0].replace("Bonus: ", "");
                    if (ketBonus === "Injeksi Bonus / Insentif") ketBonus = ""; // Kosongkan jika default
                    
                    ketPotongan = splitKet[1];
                    if (ketPotongan === "Pemotongan Lain (Kasbon dll)") ketPotongan = "";
                }
            }

            let btnCetakHtml = isLocked 
                ? `<button id="btnCekSlip_${idx}" onclick="bukaPreviewSlip(${idx}, event)" style="margin-top:8px; background:#27ae60; color:white; border:none; padding:6px 12px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer; box-shadow:none;">✅ Terkunci (${defaultBulanFilter})</button>`
                : `<button id="btnCekSlip_${idx}" onclick="bukaPreviewSlip(${idx}, event)" style="margin-top:8px; background:#3498db; color:white; border:none; padding:6px 12px; border-radius:4px; font-size:11px; font-weight:bold; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.2);">👁️ Cek Slip</button>`;
            
            htmlContent += `
                <tr style="border-bottom:1px solid #ecf0f1;">
                    <td style="padding:15px; font-weight:bold; color:#2980b9; font-size:15px; cursor:pointer;" onclick="toggleDetailDokter('${rowId}', '${chevronId}')">
                        <span id="${chevronId}" style="display:inline-block; transition:transform 0.3s; margin-right:10px; font-size:12px; color:#7f8c8d;">▶</span>
                        ${d.nama}
                    </td>
                    <td style="padding:15px; text-align:center; font-weight:500;">${d.jmlTindakan}</td>
                    
                    <!-- 🔥 KOTAK INPUT OTOMATIS TERISI DARI ARSIP -->
                    <td style="padding:15px; text-align:center;">
                        <div style="display:flex; flex-direction:column; gap:8px; align-items:center;">
                            <div style="display:flex; gap:5px;">
                                <input type="text" id="inpKetBonus_${idx}" value="${ketBonus}" placeholder="Ket: THR, dll" style="width:110px; padding:6px; border:1px solid #bdc3c7; border-radius:4px; font-size:11px;">
                                <input type="text" id="inpBonus_${idx}" value="${valBonus}" placeholder="+ Rp Bonus" oninput="formatRupiahInput(this); hitungRealtimeGaji(${idx}, ${d.totalBagiHasil})" style="width:100px; padding:6px; border:1px solid #2ecc71; border-radius:4px; font-size:12px; text-align:right;">
                            </div>
                            <div style="display:flex; gap:5px;">
                                <input type="text" id="inpKetPotongan_${idx}" value="${ketPotongan}" placeholder="Ket: Kasbon, dll" style="width:110px; padding:6px; border:1px solid #bdc3c7; border-radius:4px; font-size:11px;">
                                <input type="text" id="inpPotongan_${idx}" value="${valPotongan}" placeholder="- Rp Potong" oninput="formatRupiahInput(this); hitungRealtimeGaji(${idx}, ${d.totalBagiHasil})" style="width:100px; padding:6px; border:1px solid #e74c3c; border-radius:4px; font-size:12px; text-align:right;">
                            </div>
                        </div>
                    </td>
                    
                    <!-- 🔥 LABEL GAJI MENAMPILKAN THP YANG TERKUNCI -->
                    <td style="padding:15px; text-align:right; font-weight:bold; color:#27ae60; background-color:#fcfdfd; font-size:15px;">
                        <span id="lblGajiFinal_${idx}">Rp ${valTHP.toLocaleString('id-ID')}</span>
                        <br>
                        ${btnCetakHtml}
                    </td>
                </tr>
            `;

            // (Kode rincian tabelHTML sama seperti sebelumnya...)
            htmlContent += `
                <tr id="${rowId}" style="display:none; background-color:#f8f9fa;">
                    <td colspan="4" style="padding: 0;">
                        <div style="margin: 0 0 15px 40px; padding: 15px; border-left: 4px solid #3498db; background-color: white; box-shadow: -2px 2px 5px rgba(0,0,0,0.03); border-radius: 0 8px 8px 0;">
                            <h5 style="margin-top:0; color:#7f8c8d; font-size:12px; margin-bottom:10px; text-transform:uppercase; letter-spacing:1px;">📋 Detail Tindakan & Pemotongan</h5>
                            <table style="width:100%; border-collapse:collapse; font-size:12px;">
                                <tr style="background-color: #ecf0f1; color: #2c3e50;">
                                    <th style="padding:8px; text-align:left; border:none !important;">Tanggal</th>
                                    <th style="padding:8px; text-align:left; border:none !important;">Pasien</th>
                                    <th style="padding:8px; text-align:left; border:none !important;">Tindakan</th>
                                    <th style="padding:8px; text-align:right; border:none !important;">Tarif (Rp)</th>
                                    <th style="padding:8px; text-align:right; border:none !important;">Biaya Lab</th>
                                    <th style="padding:8px; text-align:right; border:none !important;">Diskon</th>
                                    <th style="padding:8px; text-align:right; border:none !important; color:#2980b9;">Dasar Fee</th>
                                    <th style="padding:8px; text-align:right; border:none !important;">Fee Bersih (40%)</th>
                                </tr>
            `;
            d.rincian.forEach(rin => {
                let labTxt = rin.hargaLabVendor > 0 ? `-${rin.hargaLabVendor.toLocaleString('id-ID')}` : '-';
                let diskonTxt = rin.diskonProrata > 0 ? `-${rin.diskonProrata.toLocaleString('id-ID')}` : '-';
                let dasarBagiHasil = rin.hargaAsli - rin.hargaLabVendor - rin.diskonProrata;

                htmlContent += `
                                <tr style="border-bottom:1px solid #f1f2f6;">
                                    <td style="padding:8px; color:#7f8c8d;">${rin.tanggal}</td>
                                    <td style="padding:8px; color:#2c3e50; font-weight:bold;">${rin.pasien}</td>
                                    <td style="padding:8px; color:#7f8c8d;">${rin.tindakan}</td>
                                    <td style="padding:8px; text-align:right; color:#7f8c8d;">${rin.hargaAsli.toLocaleString('id-ID')}</td>
                                    <td style="padding:8px; text-align:right; color:#e74c3c;">${labTxt}</td>
                                    <td style="padding:8px; text-align:right; color:#e74c3c;">${diskonTxt}</td>
                                    <td style="padding:8px; text-align:right; font-weight:bold; color:#2980b9;">${dasarBagiHasil.toLocaleString('id-ID')}</td>
                                    <td style="padding:8px; text-align:right; font-weight:bold; color:#27ae60;">${rin.feeFinal.toLocaleString('id-ID')}</td>
                                </tr>
                `;
            });
            htmlContent += `</table></div></td></tr>`;
        });
        htmlContent += `</tbody></table>`;
        document.getElementById('areaBagiHasil').innerHTML = htmlContent;
    }

    // =====================================================================
    // 🔥 1. FUNGSI BUKA PREVIEW SLIP (TAMPIL DI LAYAR)
    // =====================================================================
    function bukaPreviewSlip(idx, event) {
        if (event) event.stopPropagation();

        if (!window.dataBagiHasilGlobal || !window.dataBagiHasilGlobal[idx]) {
            alert("⚠️ Data dokter tidak ditemukan.");
            return;
        }
        
        // Simpan index yang sedang dibuka ke memori global agar bisa dibaca saat tombol Kunci ditekan
        window.currentPreviewIdx = idx;
        
        let dataDokter = window.dataBagiHasilGlobal[idx];
        let elBonus = document.getElementById(`inpBonus_${idx}`);
        let elPotongan = document.getElementById(`inpPotongan_${idx}`);
        let elKetBonus = document.getElementById(`inpKetBonus_${idx}`);
        let elKetPotongan = document.getElementById(`inpKetPotongan_${idx}`);

        // Bersihkan titik gaya Rupiah sebelum konversi ke angka murni
        let strBonus = elBonus ? elBonus.value.replace(/[^0-9]/g, '') : "0";
        let strPotongan = elPotongan ? elPotongan.value.replace(/[^0-9]/g, '') : "0";
        
        let nominalBonus = Number(strBonus) || 0;
        let nominalPotongan = Number(strPotongan) || 0;
        
        let teksBonus = (elKetBonus && elKetBonus.value.trim() !== "") ? elKetBonus.value.trim() : "Injeksi Bonus / Insentif";
        let teksPotongan = (elKetPotongan && elKetPotongan.value.trim() !== "") ? elKetPotongan.value.trim() : "Pemotongan Lain (Kasbon dll)";
        
        // Simpan variabel ke global untuk dikirim ke backend
        window.dataDraftSlip = {
            pokokGaji: dataDokter.totalBagiHasil,
            bonus: nominalBonus,
            potongan: nominalPotongan,
            finalGaji: (dataDokter.totalBagiHasil + nominalBonus) - nominalPotongan,
            teksBonus: teksBonus,
            teksPotongan: teksPotongan
        };
        
        // =====================================================================
        // 🔥 FITUR AUDIT UI: DETEKSI LAB MENGGANTUNG UNTUK BANNER VISUAL
        // =====================================================================
        let labMenggantung = dataDokter.rincian.filter(r => {
            let isButuhLab = false;
            
            // 1. Cek dari nama (Deteksi darurat jika diketik manual dengan kata "lab")
            if (String(r.tindakan).match(/\blab\b/i)) {
                isButuhLab = true;
            }
            
            // 2. Cek cerdas silang ke Database Master Tindakan (Mendeteksi Crown, Bleaching, dll)
            if (window.masterTindakanGlobal && window.masterTindakanGlobal.length > 0) {
                let dataMaster = window.masterTindakanGlobal.find(m => 
                    String(m.nama).trim().toLowerCase() === String(r.tindakan).trim().toLowerCase()
                );
                
                // Jika di master terdeteksi tindakan ini Butuh_Lab = 1
                if (dataMaster && (dataMaster.Butuh_Lab === 1 || dataMaster.butuhLab === 1 || String(dataMaster.Butuh_Lab) === "1")) {
                    isButuhLab = true;
                }
            }
            
            // Jika tindakan ini terkonfirmasi BUTUH LAB, TAPI tagihan dari vendor masih Rp 0 (menggantung)
            return isButuhLab && (r.hargaLabVendor === 0 || !r.hargaLabVendor);
        });

        let bannerPeringatanHtml = "";
        let isBlokirKunci = false;

        if (labMenggantung.length > 0) {
            isBlokirKunci = true;
            bannerPeringatanHtml = `
                <div class="no-print" style="background-color: #fff3cd; color: #856404; padding: 15px; border-left: 5px solid #e74c3c; margin-bottom: 20px; border-radius: 4px; font-weight: bold; font-size: 13px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <span style="font-size:16px;">🚨</span> PERINGATAN AUDIT KEUANGAN!<br>
                    Terdapat <b>${labMenggantung.length} tindakan Lab</b> (Contoh pasien: ${labMenggantung[0].pasien}) yang belum diinput tagihan eksternalnya oleh Perawat.<br>
                    <span style="color:#c0392b;">Sistem secara otomatis MEMBLOKIR penerbitan slip gaji ini untuk mencegah Klinik menanggung kerugian (membayar fee dokter dari uang Lab).</span>
                </div>
            `;
        }
        // =====================================================================

        let htmlRincian = '';
        dataDokter.rincian.forEach((rin, urut) => {
            let labTxt = rin.hargaLabVendor > 0 ? `-${rin.hargaLabVendor.toLocaleString('id-ID')}` : '-';
            let diskonTxt = rin.diskonProrata > 0 ? `-${rin.diskonProrata.toLocaleString('id-ID')}` : '-';
            let dasarBagiHasil = rin.hargaAsli - rin.hargaLabVendor - rin.diskonProrata;

            htmlRincian += `
                <tr style="border-bottom: 1px dashed #e9ecef;">
                    <td style="padding:8px 5px; text-align:center; font-size:11px;">${urut + 1}</td>
                    <td style="padding:8px 5px; font-size:11px;">${rin.tanggal}</td>
                    <td style="padding:8px 5px; font-size:11px; font-weight:bold;">${rin.pasien}</td>
                    <td style="padding:8px 5px; font-size:11px;">${rin.tindakan}</td>
                    <td style="padding:8px 5px; text-align:right; font-size:11px;">${rin.hargaAsli.toLocaleString('id-ID')}</td>
                    <td style="padding:8px 5px; text-align:right; font-size:11px; color:#e74c3c;">${labTxt}</td>
                    <td style="padding:8px 5px; text-align:right; font-size:11px; color:#e74c3c;">${diskonTxt}</td>
                    <td style="padding:8px 5px; text-align:right; font-size:11px; font-weight:bold; color:#2c3e50;">${dasarBagiHasil.toLocaleString('id-ID')}</td>
                    <td style="padding:8px 5px; text-align:right; font-weight:bold; font-size:11px; color:#27ae60;">${rin.feeFinal.toLocaleString('id-ID')}</td>
                </tr>
            `;
        });

        const tglCetak = new Date().toLocaleString('id-ID');
        
        // --- DESAIN KERTAS HTML ---
        const htmlSlip = `
            <!-- 🔥 CSS JUBAH GAIB (VERSI BERSIH TOTAL, AUTO-PAGINATION & ANTI-TERPOTONG) -->
                <style>
                    @media print {
                        @page { 
                            size: auto;
                            margin: 15mm 20mm; 
                        }
                        body { visibility: hidden; background: white !important; }
                        #modalPreviewSlip, .modal-content, .modal-dialog {
                            position: absolute !important;
                            left: 0 !important; top: 0 !important;
                            width: 100% !important; height: auto !important;
                            display: block !important; overflow: visible !important;
                            background: transparent !important;
                            border: none !important; box-shadow: none !important; outline: none !important;
                        }
                        #kertasPreviewPDF, #kertasPreviewPDF * { visibility: visible !important; }
                        #kertasPreviewPDF {
                            position: absolute !important;
                            left: 0 !important; top: 0 !important;
                            margin: 0 !important;
                            padding: 0 !important; 
                            width: 100% !important;
                            border: none !important; box-shadow: none !important;
                        }
                        #modalPreviewSlip button, .no-print { display: none !important; }
                        table { page-break-inside: auto; width: 100%; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                        thead { display: table-header-group; }
                        tfoot { display: table-footer-group; }
                        .hindari-terpotong { 
                            page-break-inside: avoid !important; 
                            break-inside: avoid !important; 
                        }
                    }
                </style>

            <div style="font-family: 'Segoe UI', Tahoma, sans-serif; color: #2c3e50; line-height: 1.5; position: relative;">
                
                <div class="no-print" style="text-align: right; margin-bottom: 20px; border-bottom: 1px dashed #bdc3c7; padding-bottom: 15px;">
                    <button onclick="window.print()" style="background:#3498db; color:white; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:14px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); transition: 0.3s;">
                        🖨️ Cetak / Simpan PDF
                    </button>
                </div>

                <!-- 🔥 SUNTIKAN BANNER PERINGATAN -->
                ${bannerPeringatanHtml}

                <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #2c3e50; padding-bottom: 10px;">
                    <h2 style="margin:0; letter-spacing: 2px;">KLINIK ANVAYA</h2>
                    <h3 style="margin:5px 0 0 0; color:#7f8c8d; font-weight:normal;">SLIP GAJI & RINCIAN TINDAKAN</h3>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px; background: #f8f9fa; padding: 15px; border-radius: 6px;">
                    <div>
                        <div style="font-size: 12px; color: #7f8c8d;">Nama Dokter</div>
                        <div style="font-weight: bold; font-size: 16px;">${dataDokter.nama}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 11px; margin-top: 3px; color:#95a5a6;">Dirender pada: ${tglCetak}</div>
                    </div>
                </div>

                <div style="font-weight: bold; background: #34495e; color: white; padding: 5px 10px; font-size: 12px;">A. DETAIL TINDAKAN & PERHITUNGAN FEE (40%)</div>
                <table style="width: 100%; border-collapse: collapse; margin-top: 15px; table-layout: fixed; word-break: break-word;">
                    <thead>
                        <tr>
                            <th style="background:#ecf0f1; padding:10px 5px; font-size:11px; border-bottom:2px solid #bdc3c7; width:4%;">No</th>
                            <th style="background:#ecf0f1; padding:10px 5px; font-size:11px; border-bottom:2px solid #bdc3c7; width:11%; text-align:left;">Tanggal</th>
                            <th style="background:#ecf0f1; padding:10px 5px; font-size:11px; border-bottom:2px solid #bdc3c7; width:15%; text-align:left;">Pasien</th>
                            <th style="background:#ecf0f1; padding:10px 5px; font-size:11px; border-bottom:2px solid #bdc3c7; width:20%; text-align:left;">Tindakan</th>
                            <th style="background:#ecf0f1; padding:10px 5px; font-size:11px; border-bottom:2px solid #bdc3c7; width:10%; text-align:right;">Tarif (Rp)</th>
                            <th style="background:#ecf0f1; padding:10px 5px; font-size:11px; border-bottom:2px solid #bdc3c7; width:10%; text-align:right;">Biaya Lab</th>
                            <th style="background:#ecf0f1; padding:10px 5px; font-size:11px; border-bottom:2px solid #bdc3c7; width:9%; text-align:right;">Diskon</th>
                            <th style="background:#ecf0f1; padding:10px 5px; font-size:11px; border-bottom:2px solid #bdc3c7; width:10%; text-align:right; color:#2980b9;">Dasar Fee</th>
                            <th style="background:#ecf0f1; padding:10px 5px; font-size:11px; border-bottom:2px solid #bdc3c7; width:11%; text-align:right;">Fee Bersih</th>
                        </tr>
                    </thead>
                    <tbody>${htmlRincian}</tbody>
                </table>
                <div style="text-align:right; font-weight:bold; padding: 10px 5px; border-top: 2px solid #2c3e50; margin-top:5px; font-size: 14px;">
                    Total Fee Bersih: Rp ${window.dataDraftSlip.pokokGaji.toLocaleString('id-ID')}
                </div>

                <!-- 🔥 KOTAK KALKULASI: Diberi class hindari-terpotong -->
                <div class="hindari-terpotong" style="border: 2px solid #2ecc71; padding: 15px; margin-top: 25px; background: #f9fffb; border-radius: 6px;">
                    <div style="font-weight:bold; color:#2c3e50; margin-bottom:15px; border-bottom:1px solid #ccc; padding-bottom:5px;">B. KALKULASI FINAL (TAKE HOME PAY)</div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:15px;"><span>Total Pokok Fee Bersih (Dari Tindakan)</span><span>Rp ${window.dataDraftSlip.pokokGaji.toLocaleString('id-ID')}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:15px; color:#27ae60;"><span>(+) ${teksBonus}</span><span>Rp ${nominalBonus.toLocaleString('id-ID')}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:15px; color:#e74c3c;"><span>(-) ${teksPotongan}</span><span>(Rp ${nominalPotongan.toLocaleString('id-ID')})</span></div>
                    <div style="border-top:2px dashed #2ecc71; margin: 15px 0;"></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px; font-size:20px; font-weight:bold; color:#27ae60;">
                        <span>TOTAL DITERIMA</span><span>Rp ${window.dataDraftSlip.finalGaji.toLocaleString('id-ID')}</span>
                    </div>
                </div>
                
                <!-- 🔥 KOTAK TTD: Diberi class hindari-terpotong juga! -->
                <div class="hindari-terpotong" style="display:flex; justify-content:flex-end; margin-top:50px; text-align:center;">
                    <div>
                        <p style="margin-bottom:60px;">Manajemen Klinik Anvaya,</p>
                        <p style="font-weight:bold; border-bottom:1px solid #2c3e50; display:inline-block; padding:0 20px;">( ..................................... )</p>
                    </div>
                </div>
            </div>
        `;
        
        // Suntikkan ke HTML
        document.getElementById('kertasPreviewPDF').innerHTML = htmlSlip;
        
        let tglAkhirFilter = document.getElementById('tglAkhirFinansial').value; 
        let tglSekarang = new Date();
        let blnStr = ("0" + (tglSekarang.getMonth() + 1)).slice(-2);
        
        let defaultBulan = tglAkhirFilter ? tglAkhirFilter.substring(0, 7) : (tglSekarang.getFullYear() + "-" + blnStr);
        
        let elInpBulan = document.getElementById('inpBulanGaji');
        if (elInpBulan) elInpBulan.value = defaultBulan;

        // =====================================================================
        // 🔥 EKSEKUSI PEMBLOKIRAN TOMBOL KUNCI
        // =====================================================================
        let btnKunci = document.getElementById('btnKunciSlip');
        if (btnKunci) {
            if (isBlokirKunci) {
                btnKunci.disabled = true;
                btnKunci.style.backgroundColor = "#95a5a6"; // Berubah warna jadi abu-abu kusam
                btnKunci.style.cursor = "not-allowed";
                btnKunci.innerText = "🚫 TERKUNCI (BIAYA LAB MENGGANTUNG)";
            } else {
                btnKunci.disabled = false;
                btnKunci.style.backgroundColor = "#27ae60"; // Kembali ke warna hijau asli
                btnKunci.style.cursor = "pointer";
                btnKunci.innerText = "🔒 KUNCI & TERBITKAN SLIP";
            }
        }
        // =====================================================================

        // Tampilkan Modal
        let elModal = document.getElementById('modalPreviewSlip');
        if (elModal) elModal.style.display = 'flex';
    }

    // =====================================================================
    // 🔥 2. FUNGSI MENGUNCI SLIP & MENYIMPAN KE ARSIP GAJI
    // =====================================================================
    function kunciDanSimpanSlip() {
        let bulanGaji = document.getElementById('inpBulanGaji').value; 
        if (!bulanGaji) {
            alert("⚠️ Harap pilih 'Gaji Bulan' terlebih dahulu sebelum mengunci!");
            return;
        }

        let dataDokter = window.dataBagiHasilGlobal[window.currentPreviewIdx];
        
        // =====================================================================
        // 🔥 FITUR AUDIT KEUANGAN: DETEKSI LAB MENGGANTUNG (ANTI-BOCOR)
        // =====================================================================
        // Sistem mencari semua tindakan yang mengandung kata "lab" (berdiri sendiri) 
        // tetapi tagihan dari vendor pihak ketiganya masih Rp 0.
        let labMenggantung = dataDokter.rincian.filter(r => 
            r.tindakan.match(/\blab\b/i) && r.hargaLabVendor === 0
        );

        if (labMenggantung.length > 0) {
            alert(`🚫 SISTEM MENOLAK (POTENSI KERUGIAN KLINIK)!\n\nDitemukan ${labMenggantung.length} tindakan Lab yang belum diinput tagihan eksternalnya (Contoh pasien: ${labMenggantung[0].pasien}).\n\nHarap instruksikan Perawat/Admin untuk melengkapi menu [Tagihan Eksternal / Lab] terlebih dahulu agar Klinik tidak nombok fee dokter!`);
            return; // 🛑 HENTIKAN PROSES! Tombol kunci batal bekerja.
        }
        // =====================================================================

        // 🔥 POP-UP KONFIRMASI REVISI
        let isAlreadyLocked = window.arsipGajiTerkunci && window.arsipGajiTerkunci.some(x => x.namaDokter === dataDokter.nama && x.periode === bulanGaji);
        if (isAlreadyLocked) {
            let konfirmasi = confirm(`⚠️ PERHATIAN!\nSlip Gaji periode ${bulanGaji} untuk dr. ${dataDokter.nama} SUDAH PERNAH DITERBITKAN.\n\nApakah Anda yakin ingin MEREVISI (menimpa) data lama dengan angka yang baru ini?`);
            if (!konfirmasi) return; // Batalkan proses jika owner klik "Cancel"
        }

        let draft = window.dataDraftSlip;
        let btn = document.getElementById('btnKunciSlip');
        btn.disabled = true;
        btn.innerText = "⏳ MENGUNCI DATA...";

        let payload = {
            action: "kunciSlipGaji",
            namaDokter: dataDokter.nama,
            periodeBulan: bulanGaji,
            pokokFee: draft.pokokGaji,
            bonus: draft.bonus,
            potongan: draft.potongan,
            thp: draft.finalGaji,
            teksKeterangan: `Bonus: ${draft.teksBonus} | Potongan: ${draft.teksPotongan}`,
            rincianJson: JSON.stringify(dataDokter.rincian) 
        };

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(res => {
            btn.disabled = false;
            btn.innerText = "🔒 KUNCI & TERBITKAN SLIP";
            
            if (res.result === "success") {
                alert("✅ BERHASIL: " + res.message);
                document.getElementById('modalPreviewSlip').style.display = 'none';
                
                // 🔥 TAMBAH INGATAN KE RADAR LOKAL (Agar tidak perlu refresh halaman)
                if (!window.arsipGajiTerkunci) window.arsipGajiTerkunci = [];
                // Hapus data lama jika sedang me-revisi
                window.arsipGajiTerkunci = window.arsipGajiTerkunci.filter(x => !(x.namaDokter === dataDokter.nama && x.periode === bulanGaji));
                // Masukkan memori baru
                window.arsipGajiTerkunci.push({ namaDokter: dataDokter.nama, periode: bulanGaji });
                
                // Ubah Visual Tombol
                let btnCek = document.getElementById('btnCekSlip_' + window.currentPreviewIdx);
                if (btnCek) {
                    btnCek.innerHTML = `✅ Terkunci (${bulanGaji})`;
                    btnCek.style.background = "#27ae60"; 
                    btnCek.style.boxShadow = "none";
                }

            } else {
                alert("❌ Gagal Mengunci: " + res.message);
            }
        })
        .catch(err => {
            btn.disabled = false;
            btn.innerText = "🔒 KUNCI & TERBITKAN SLIP";
            alert("⚠️ Terjadi gangguan koneksi jaringan.");
        });
    }

    // 🔥 FUNGSI BARU (Wajib ditambahkan tepat di bawah fungsi di atas)
    // Berfungsi mengkalkulasi ketikan Owner secara Real-Time tanpa membebani server
    // =====================================================================
    // 🧮 UPDATE FUNGSI HITUNG REALTIME (KEBAL TANDA TITIK)
    // =====================================================================
    function hitungRealtimeGaji(idx, pokokGaji) {
        let elBonus = document.getElementById(`inpBonus_${idx}`);
        let elPotongan = document.getElementById(`inpPotongan_${idx}`);
        
        // Bersihkan tanda titik sebelum kalkulasi matematika
        let strBonus = elBonus ? elBonus.value.replace(/[^0-9]/g, '') : "0";
        let strPotongan = elPotongan ? elPotongan.value.replace(/[^0-9]/g, '') : "0";
        
        let nominalBonus = Number(strBonus) || 0;
        let nominalPotongan = Number(strPotongan) || 0;
        
        let finalGaji = (pokokGaji + nominalBonus) - nominalPotongan;
        
        let elLabel = document.getElementById(`lblGajiFinal_${idx}`);
        if(elLabel) {
            elLabel.innerText = "Rp " + finalGaji.toLocaleString('id-ID');
        }
    }

    // =========================================================
    // Fungsi Eksekutor Cetak (Anti-Spam & Anti-Drive Penuh)
    // =========================================================
    function cetakSlipDokter(index, event) {
        event.stopPropagation(); // Mencegah baris Rincian ikut terbuka saat tombol diklik
        const btn = event.target;
        const teksAsli = btn.innerText;
        
        btn.innerText = "⏳ Mencetak...";
        btn.disabled = true;

        const dataDokter = window.dataBagiHasilGlobal[index];
        
        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "cetakSlipBagiHasil",
                namaDokter: dataDokter.nama,
                periode: window.periodeBagiHasilGlobal,
                rincian: JSON.stringify(dataDokter.rincian)
            })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                // 1. Langsung buka tab baru pertama kali
                window.open(res.pdfUrl, '_blank');
                
                // 🔥 2. UBAH WUJUD TOMBOL (ANTI-SPAM)
                btn.innerHTML = "📂 Buka Slip";
                btn.style.backgroundColor = "#27ae60"; // Berubah jadi hijau elegan
                btn.style.boxShadow = "0 1px 3px rgba(39, 174, 96, 0.4)";
                btn.disabled = false;
                
                // 🔥 3. GANTI TUGAS TOMBOL: Hanya buka tab, jangan request cetak lagi!
                btn.onclick = function(e) {
                    e.stopPropagation();
                    window.open(res.pdfUrl, '_blank');
                };

            } else {
                // Jika gagal, kembalikan ke tombol cetak merah
                btn.innerText = teksAsli;
                btn.disabled = false;
                alert("Gagal mencetak: " + res.message);
            }
        })
        .catch(err => {
            // Jika error jaringan, kembalikan ke tombol cetak merah
            btn.innerText = teksAsli;
            btn.disabled = false;
            alert("Kesalahan jaringan saat mencetak slip.");
        });
    }

    // Fungsi animasi Expand/Collapse Chevron
    function toggleDetailDokter(rowId, chevronId) {
        const row = document.getElementById(rowId);
        const chevron = document.getElementById(chevronId);
        if (row.style.display === "none") {
            row.style.display = "table-row";
            chevron.style.transform = "rotate(90deg)";
        } else {
            row.style.display = "none";
            chevron.style.transform = "rotate(0deg)";
        }
    }

    // =========================================================
    // MESIN WORKLIST PENGINGAT KONTROL
    // =========================================================
    let rawDataKontrol = []; // Menyimpan data sementara agar filter cepat tanpa loading

    function muatDataPengingat() {
        const tbody = document.getElementById('tabelPengingatBody');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Menarik data dari server... ⏳</td></tr>';

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getJadwalKontrol" })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                rawDataKontrol = res.data;
                renderTabelPengingat(); // Lanjut merender tabel sesuai filter
            } else {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Gagal: ${res.message}</td></tr>`;
            }
        })
        .catch(err => {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Koneksi jaringan terputus.</td></tr>`;
        });
    }

    function renderTabelPengingat() {
        const filter = document.getElementById('filterWaktuKontrol').value;
        const tbody = document.getElementById('tabelPengingatBody');
        
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

        // 🔥 LOGIKA FILTER DINAMIS
        let dataTerfilter = rawDataKontrol.filter(item => {
            let isSelesai = item.status.toLowerCase() === "telah datang (selesai)";
            
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
            
            if (item.status.toLowerCase() === "telah datang (selesai)") {
                // Tampilan khusus untuk pasien yang sudah datang (Tombol WA dinonaktifkan agar tidak di-spam)
                badgeStatus = `<span style="background:#2980b9; color:#fff; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:bold;">🏁 Telah Datang</span>`;
                tombolAksi = `<button disabled style="background:#bdc3c7; color:#fff; border:none; padding:6px 12px; border-radius:4px; font-size:12px; font-weight:bold; cursor:not-allowed;">✔️ Selesai</button>`;
            } else if (item.status === "Menunggu") {
                badgeStatus = `<span style="background:#f39c12; color:#fff; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:bold;">⏳ Menunggu</span>`;
                let amanPesan = item.pesan.replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/(\r\n|\n|\r)/gm, "\\n");
                let amanNama = item.namaPasien.replace(/'/g, "\\'").replace(/"/g, "&quot;");
                tombolAksi = `<button onclick="kirimWaKontrol('${item.noWA}', '${amanNama}', '${item.tanggal}', '${amanPesan}', ${item.row})" style="background:#25D366; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><i style="font-style:normal;">📲</i> Hubungi via WA</button>`;
            } else {
                badgeStatus = `<span style="background:#27ae60; color:#fff; padding:4px 8px; border-radius:12px; font-size:11px; font-weight:bold;">✅ Di-WA</span>`;
                let amanPesan = item.pesan.replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/(\r\n|\n|\r)/gm, "\\n");
                let amanNama = item.namaPasien.replace(/'/g, "\\'").replace(/"/g, "&quot;");
                tombolAksi = `<button onclick="kirimWaKontrol('${item.noWA}', '${amanNama}', '${item.tanggal}', '${amanPesan}', ${item.row})" style="background:#25D366; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"><i style="font-style:normal;">📲</i> Hubungi via WA</button>`;
            }

            let pesanTabel = item.pesan.replace(/\n/g, '<br>');

            html += `
                <tr style="background-color: ${bgRow}; transition: 0.3s;">
                    <td style="font-weight:bold; color:#c0392b;">${item.tanggal}</td>
                    <td>${item.noRM}</td>
                    <td style="font-weight:bold; color:#2c3e50;">${item.namaPasien}</td>
                    <td>${item.noWA}</td>
                    <td style="color:#555;"><small>${pesanTabel}</small></td>
                    <td style="text-align:center;">${badgeStatus}</td>
                    <td style="text-align:center;">${tombolAksi}</td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }

    // =========================================================
    // EKSEKUTOR MAGIC WHATSAPP & UPDATE STATUS (REVISI FORMAT NOMOR)
    // =========================================================
    function kirimWaKontrol(noWA, namaPasien, tanggal, pesan, rowSheet) {
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
                    muatDataPengingat();
                }, 2000);
            }
        })
        .catch(err => console.error("Gagal update status otomatis", err));
    }

    // =========================================================
    // 🚀 MESIN PENCARIAN PASIEN LAMA (FRONTEND CACHING)
    // =========================================================
    let cacheMasterPasien = []; // Memori penampung di RAM Browser

    function bukaModalCariPasien() {
        const modal = document.getElementById('modalCariPasienLama');
        const spinner = document.getElementById('spinnerCariPasien');
        const areaTabel = document.getElementById('areaTabelCariPasien');
        const inputCari = document.getElementById('inputCariModalPasien');
        
        // 🔥 SAFETY CHECK: Jika HTML modal belum terpasang, beri peringatan jelas (bukan error console)
        if (!modal || !spinner || !areaTabel || !inputCari) {
            alert("⚠️ Gagal membuka jendela pencarian: Struktur HTML Modal belum terpasang dengan benar di index.html!");
            console.error("Elemen modal bernilai null. Pastikan tag <div id='modalCariPasienLama'> sudah terpasang sebelum </body>.");
            return;
        }
        
        modal.style.display = 'flex';
        inputCari.value = '';
        document.getElementById('bodyTabelCariPasien').innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #888;">Silakan ketik nama pasien di kotak pencarian atas.</td></tr>';
        
        // 🔥 CEK CACHE: Jika data sudah ada di RAM, jangan loading lagi dari server!
        if (cacheMasterPasien.length > 0) {
            inputCari.focus();
            return;
        }

        // Jika cache masih kosong, nyalakan Loading Spinner Animasi
        spinner.style.display = 'block';
        areaTabel.style.display = 'none';

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getPasien" }) 
        })
        .then(res => res.json())
        .then(res => {
            spinner.style.display = 'none';
            areaTabel.style.display = 'block';
            
            if (res.result === "success" || res.status === "success") {
                cacheMasterPasien = res.data || res.pasien || [];
                inputCari.focus();
            } else {
                alert("⚠️ Gagal mengsinkronkan data pasien: " + (res.message || "Error tidak diketahui"));
            }
        })
        .catch(err => {
            spinner.style.display = 'none';
            areaTabel.style.display = 'block';
            console.error("Error cache pasien:", err);
            alert("❌ Terjadi kesalahan koneksi saat memuat database pasien.");
        });
    }

    function tutupModalPasien() {
        document.getElementById('modalCariPasienLama').style.display = 'none';
    }

    // 🔥 MESIN PENCARI ZERO-LAG (100% dari RAM lokal)
    function filterPasienDariCache() {
        const kataKunci = document.getElementById('inputCariModalPasien').value.toLowerCase().trim();
        const tbody = document.getElementById('bodyTabelCariPasien');

        if (kataKunci.length < 1) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #888;">Silakan ketik nama pasien di kotak pencarian atas.</td></tr>';
            return;
        }

        // Filter array di dalam memori
        const hasil = cacheMasterPasien.filter(p => {
            const rm   = (p.noRM || p[0] || "").toString().toLowerCase();
            const nama = (p.namaPasien || p.nama || p[1] || "").toString().toLowerCase();
            const wa   = (p.noWA || p.whatsapp || p[5] || "").toString().toLowerCase();
            return rm.includes(kataKunci) || nama.includes(kataKunci) || wa.includes(kataKunci);
        });

        if (hasil.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #e74c3c;">😢 Pasien tidak ditemukan. Coba kata kunci lain atau daftarkan sebagai Pasien Baru.</td></tr>';
            return;
        }

        // Batasi render maksimal 15 baris teratas agar browser tidak berat (Ultra Fast DOM)
        let html = "";
        hasil.slice(0, 15).forEach(p => {
            // Pemetaan fleksibel (mendukung format Object maupun Array dari spreadsheet)
            let noRM   = p.noRM || p[0] || "-";
            let nama   = p.namaPasien || p.nama || p[1] || "-";
            let tgl    = p.tanggalLahir || p.tglLahir || p[3] || "-";
            let wa     = p.noWA || p.whatsapp || p[5] || "-";
            let alamat = p.alamat || p[8] || "-";
            
            // Sanitasi data untuk dimasukkan ke fungsi pilih
            let amanObj = encodeURIComponent(JSON.stringify(p));

            html += `
                <tr style="border-bottom: 1px solid #eee; transition: background 0.2s;" onmouseover="this.style.background='#f1f8ff'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 10px; font-weight: bold; color: #2a5298;">${noRM}</td>
                    <td style="padding: 10px; font-weight: bold;">${nama}</td>
                    <td style="padding: 10px;">${tgl}</td>
                    <td style="padding: 10px;">${wa}</td>
                    <td style="padding: 10px; color: #555;"><small>${alamat}</small></td>
                    <td style="padding: 10px; text-align: center;">
                        <button onclick="pilihPasienKeForm('${amanObj}')" style="background-color: #27ae60; color: white; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            ✔ Pilih
                        </button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    // 🔥 AUTOMATISASI PENGISIAN FORM (PRE-FILL & LOCK)
    function pilihPasienKeForm(encodedData) {
        const p = JSON.parse(decodeURIComponent(encodedData));
        
        // Pemetaan data dari array / object cache ke variabel
        let noRM   = p.noRM || p[0] || "";
        let nama   = p.namaPasien || p.nama || p[1] || "";
        let tmpLhr = p.tempatLahir || p[2] || "";
        let tglLhr = p.tanggalLahir || p[3] || "";
        let gender = p.gender || p[4] || "Laki-laki";
        let wa     = p.noWA || p.whatsapp || p[5] || "";
        let kerja  = p.pekerjaan || p[6] || "";
        let email  = p.email || p[7] || "";
        let alamat = p.alamat || p[8] || "";
        let ktp    = p.noKTP || p.ktp || p[9] || "";
        let kec    = p.kecamatan || p[11] || "";
        let kota   = p.kota || p[12] || "";

        // 🔥 SUNTIKAN TEPAT SASARAN KE ID ASLI FORM PENDAFTARAN ANDA:
        if (document.getElementById('txtNoRM'))      document.getElementById('txtNoRM').value = noRM;
        if (document.getElementById('nama'))         document.getElementById('nama').value = nama;
        if (document.getElementById('txtKTP'))       document.getElementById('txtKTP').value = ktp.toString().replace(/'/g, '');
        if (document.getElementById('tempatLahir'))  document.getElementById('tempatLahir').value = tmpLhr;
        if (document.getElementById('tanggalLahir')) document.getElementById('tanggalLahir').value = tglLhr;
        if (document.getElementById('pekerjaan'))    document.getElementById('pekerjaan').value = kerja;
        if (document.getElementById('whatsapp'))     document.getElementById('whatsapp').value = wa.toString().replace(/'/g, '');
        if (document.getElementById('email'))        document.getElementById('email').value = email;
        if (document.getElementById('alamat'))       document.getElementById('alamat').value = alamat;
        if (document.getElementById('kecamatan'))    document.getElementById('kecamatan').value = kec;
        if (document.getElementById('kota'))         document.getElementById('kota').value = kota;

        // 🔥 ATUR RADIO BUTTON JENIS KELAMIN (Menggunakan ID asli: rbLaki & rbPerempuan)
        const rbLaki = document.getElementById('rbLaki');
        const rbPerempuan = document.getElementById('rbPerempuan');
        if (gender.toString().toLowerCase().includes('perempuan') && rbPerempuan) {
            rbPerempuan.checked = true;
        } else if (rbLaki) {
            rbLaki.checked = true;
        }

        // 🔥 KUNCI IDENTITAS UTAMA (Menggunakan ID asli agar No. RM & KTP tidak rusak diedit manual)
        ['txtNoRM', 'nama', 'txtKTP'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.readOnly = true;
                el.style.backgroundColor = "#e9ecef"; // Warna abu penanda terkunci
            }
        });

        // Tutup modal popup
        tutupModalPasien();
        
        // Beri konfirmasi & langsung alihkan fokus kursor ke kolom Tujuan / Keluhan
        alert(`✅ Pasien Terpilih:\nNo. RM: ${noRM}\nNama: ${nama}\n\nSilakan lengkapi Rencana Tanggal Kunjungan & Dokter!`);
        if (document.getElementById('tujuan')) {
            document.getElementById('tujuan').focus();
        }
    }

    // =========================================================================
    // 📅 MESIN KALENDER PRAKTIK DOKTER (FRONTEND CACHING - ZERO LAG)
    // =========================================================================

    // 1. Variabel Penampung Status Bulan & Tahun Kalender
    let kalenderBulanAktif = new Date().getMonth(); // 0 = Januari, 6 = Juli, dst.
    let kalenderTahunAktif = new Date().getFullYear();
    let cacheDataKalender = []; // Memori RAM untuk menyimpan antrean 1 bulan penuh

    const namaBulanIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

    // =========================================================================
    // 📅 MESIN KALENDER DOKTER (DENGAN PELACAK BUG / DEBUG MODE)
    // =========================================================================

    function muatKalenderDokter() {
        const gridBody = document.getElementById('gridKalenderBody');
        const labelBulan = document.getElementById('labelBulanTahunKalender');
        if (!gridBody) return;

        if (labelBulan) {
            labelBulan.innerText = `${namaBulanIndo[kalenderBulanAktif]} ${kalenderTahunAktif}`;
        }

        gridBody.innerHTML = `
            <div style="grid-column: span 7; background: #e0f2fe; color: #0369a1; padding: 40px; text-align: center; font-weight: bold; border-radius: 6px; border: 1px dashed #0284c7;">
                ⏳ Mengsinkronkan jadwal bulan ${namaBulanIndo[kalenderBulanAktif]} ${kalenderTahunAktif} dari server...
            </div>
        `;

        const tglMulai = `${kalenderTahunAktif}-${String(kalenderBulanAktif + 1).padStart(2, '0')}-01`;
        const hariTerakhir = new Date(kalenderTahunAktif, kalenderBulanAktif + 1, 0).getDate();
        const tglSelesai = `${kalenderTahunAktif}-${String(kalenderBulanAktif + 1).padStart(2, '0')}-${String(hariTerakhir).padStart(2, '0')}`;

        const sesiAktif = JSON.parse(localStorage.getItem('anvaya_session') || '{}');

        const payload = {
            action: "getTodayQueue", 
            startDate: tglMulai,
            endDate: tglSelesai,
            realToday: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`,
            role: sesiAktif.role || "",
            idDokter: sesiAktif.idUser || "",
            username: sesiAktif.username || "",
            statusFilter: "Semua", 
            page: 1,
            limit: 500 
        };

        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
        .then(response => response.json())
        .then(data => {
            if (data && (data.result === "success" || data.status === "success")) {
                cacheDataKalender = data.queue || data.data || [];
                renderKalenderInstan();
            } else {
                gridBody.innerHTML = `<div style="grid-column: span 7; background: #fee2e2; color: #991b1b; padding: 30px; text-align: center; font-weight: bold;">❌ Gagal dari server: ${data.message || "Format respon tidak dikenali."}</div>`;
            }
        })
        .catch(err => {
            console.error("Gagal koneksi kalender:", err);
            gridBody.innerHTML = `<div style="grid-column: span 7; background: #fee2e2; color: #991b1b; padding: 30px; text-align: center; font-weight: bold;">⚠️ Terjadi gangguan jaringan saat memuat jadwal kalender.</div>`;
        });
    }

    // =========================================================================
    // 🎨 MESIN RENDER KALENDER (GAYA GOOGLE SHEET - 100% PRESISI & ANTI-POTONG)
    // =========================================================================
    function renderKalenderInstan() {
        const gridBody = document.getElementById('gridKalenderBody');
        if (!gridBody) return;

        // Paksa buka tab pembungkus agar tidak tersembunyi
        const tabPembungkus = gridBody.closest('.tab-content');
        if (tabPembungkus) {
            document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
            tabPembungkus.style.display = 'block';
            tabPembungkus.classList.add('active');
        }

        gridBody.innerHTML = ""; 

        // 1. Cetak Header Hari ala Spreadsheet
        const namaHari = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
        namaHari.forEach((hari, idx) => {
            const selHeader = document.createElement('div');
            selHeader.style.cssText = `
                background: #1e3c72; 
                color: white; 
                font-weight: bold; 
                padding: 12px 5px; 
                text-align: center; 
                font-size: 14px; 
                ${idx === 5 ? 'color: #fcd34d;' : ''} 
                ${idx === 6 ? 'color: #fca5a5;' : ''} 
            `;
            selHeader.innerText = hari;
            gridBody.appendChild(selHeader);
        });

        const hariIni = new Date();
        const formatHariIni = `${hariIni.getFullYear()}-${String(hariIni.getMonth() + 1).padStart(2, '0')}-${String(hariIni.getDate()).padStart(2, '0')}`;

        let hariPertama = new Date(kalenderTahunAktif, kalenderBulanAktif, 1).getDay();
        let indexKolomMulai = (hariPertama === 0) ? 6 : hariPertama - 1;
        const totalHariBulanIni = new Date(kalenderTahunAktif, kalenderBulanAktif + 1, 0).getDate();

        // 2. Buat sel kosong sebelum tanggal 1
        for (let i = 0; i < indexKolomMulai; i++) {
            const selKosong = document.createElement('div');
            selKosong.style.cssText = "background: #f8fafc; min-height: 110px; opacity: 0.6;";
            gridBody.appendChild(selKosong);
        }

        // 3. Buat sel kotak tanggal 1 s/d akhir bulan
        for (let tgl = 1; tgl <= totalHariBulanIni; tgl++) {
            const strTgl = `${kalenderTahunAktif}-${String(kalenderBulanAktif + 1).padStart(2, '0')}-${String(tgl).padStart(2, '0')}`;
            const tglIndo1 = `${String(tgl).padStart(2, '0')}/${String(kalenderBulanAktif + 1).padStart(2, '0')}/${kalenderTahunAktif}`;
            const tglIndo2 = `${String(tgl).padStart(2, '0')}-${String(kalenderBulanAktif + 1).padStart(2, '0')}-${kalenderTahunAktif}`;
            
            const apakahHariIni = (strTgl === formatHariIni);

            const kotakHari = document.createElement('div');
            kotakHari.style.cssText = `
                background: ${apakahHariIni ? '#fefce8' : '#ffffff'}; 
                min-height: 115px; 
                padding: 6px; 
                display: flex; 
                flex-direction: column;
                ${apakahHariIni ? 'outline: 2px solid #f59e0b; z-index: 2;' : ''}
            `;

            let htmlKartu = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px;">
                    <span style="font-weight: bold; font-size: 13px; color: ${apakahHariIni ? '#d97706' : '#334155'};">
                        ${apakahHariIni ? '📍 ' : ''}${tgl}
                    </span>
                </div>
            `;

            // Pencarian pasien dengan mesin Omni-Matcher
            const pasienHariIni = cacheDataKalender.filter(p => {
                const teksPasien = JSON.stringify(p);
                return teksPasien.includes(strTgl) || teksPasien.includes(tglIndo1) || teksPasien.includes(tglIndo2);
            });

            if (pasienHariIni.length > 0) {
                pasienHariIni.forEach(p => {
                    const namaPasien = p.nama || p.namaPasien || p[1] || "Pasien";
                    const noRM       = p.noRM || p[0] || "";
                    const idAntrean  = p.idAntrean || p.rowNumber || "";
                    const jam        = p.waktu || p.jam || p[3] || "";
                    const tujuan     = p.tujuan || p.keluhan || p[4] || "Konsultasi";
                    const statusBersih = (p.status || p[6] || "").toString().toLowerCase().trim();
                    
                    let bgKartu = "#e0f2fe"; let teksKartu = "#075985"; let borderKartu = "#0ea5e9"; let ikon = "🔵"; let dicoret = "";

                    if (statusBersih.includes("sudah") || statusBersih.includes("selesai")) {
                        bgKartu = "#d1fae5"; teksKartu = "#065f46"; borderKartu = "#10b981"; ikon = "🟢"; 
                    } else if (statusBersih.includes("batal") || statusBersih.includes("absen") || statusBersih.includes("tidak datang")) {
                        bgKartu = "#f1f5f9"; teksKartu = "#64748b"; borderKartu = "#cbd5e1"; ikon = "🔘"; dicoret = "text-decoration: line-through;"; 
                    } else if (apakahHariIni) {
                        bgKartu = "#fef3c7"; teksKartu = "#92400e"; borderKartu = "#f59e0b"; ikon = "🟠"; 
                    }

                    htmlKartu += `
                        <div class="kartu-pasien-kalender" 
                            onclick="klikKartuPasienKalender('${noRM}', '${namaPasien}', '${idAntrean}')"
                            style="background: ${bgKartu}; color: ${teksKartu}; border-left: 3px solid ${borderKartu}; ${dicoret}"
                            title="Klik untuk lihat detail ${namaPasien}">
                            <strong>${ikon} ${jam}</strong><br>
                            <span style="font-size:11px; font-weight:bold;">${namaPasien}</span><br>
                            <small style="opacity: 0.85; font-size:9px;">${tujuan}</small>
                        </div>
                    `;
                });
            }

            kotakHari.innerHTML = htmlKartu;
            gridBody.appendChild(kotakHari);
        }
    }

    // -------------------------------------------------------------------------
    // 4. KONTROL NAVIGASI BULAN (◀ Bulan Lalu / Bulan Depan ▶ / 📍 Hari Ini)
    // -------------------------------------------------------------------------
    function navigasiBulanKalender(step) {
        kalenderBulanAktif += step;
        if (kalenderBulanAktif < 0) {
            kalenderBulanAktif = 11;
            kalenderTahunAktif--;
        } else if (kalenderBulanAktif > 11) {
            kalenderBulanAktif = 0;
            kalenderTahunAktif++;
        }
        muatKalenderDokter(); // Sinkronisasi data bulan baru
    }

    function resetKeBulanIni() {
        const hariIni = new Date();
        kalenderBulanAktif = hariIni.getMonth();
        kalenderTahunAktif = hariIni.getFullYear();
        muatKalenderDokter();
    }

    // =========================================================================
    // ⚡ MESIN POP-UP MODAL KALENDER & SMART ROUTING KE RME
    // =========================================================================

    function klikKartuPasienKalender(noRM, namaPasien, idAntrean) {
        // 1. Cari data pasien dari memori RAM (cacheDataKalender)
        const dataPasien = cacheDataKalender.find(p => (p.noRM || p[0]) === noRM && (p.idAntrean || p.rowNumber || "") == idAntrean) || {};
        
        // 2. Ekstrak data
        const keluhan    = dataPasien.tujuan || dataPasien.keluhan || dataPasien[4] || "Konsultasi Umum";
        const jam        = dataPasien.waktu || dataPasien.jam || dataPasien[3] || "-";
        const status     = (dataPasien.status || dataPasien[6] || "Belum Diperiksa").toString().trim();
        const namaDokter = dataPasien.dokter || dataPasien.namaDokter || dataPasien[5] || "Dokter Praktik";

        // 3. Masukkan data ke dalam elemen-elemen Modal Pop-up
        document.getElementById('modKalNamaPasien').innerText = namaPasien;
        document.getElementById('modKalNoRM').innerText = `NO. RM: ${noRM}`;
        document.getElementById('modKalDokter').innerText = namaDokter;
        document.getElementById('modKalJam').innerText = jam;
        document.getElementById('modKalKeluhan').innerText = keluhan;

        // Atur warna badge status di dalam modal
        const elStatus = document.getElementById('modKalStatus');
        elStatus.innerText = status;
        if (status.toLowerCase().includes("sudah") || status.toLowerCase().includes("selesai")) {
            elStatus.style.cssText = "background: #d1fae5; color: #065f46; padding: 3px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; display: inline-block;";
        } else if (status.toLowerCase().includes("batal") || status.toLowerCase().includes("absen")) {
            elStatus.style.cssText = "background: #f1f5f9; color: #64748b; padding: 3px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; display: inline-block;";
        } else {
            elStatus.style.cssText = "background: #fef3c7; color: #92400e; padding: 3px 10px; border-radius: 15px; font-size: 12px; font-weight: bold; display: inline-block;";
        }

        // 4. Pasang fungsi pada tombol "👁️ Lihat RME"
        const btnLihatRME = document.getElementById('btnModKalLihatRME');
        btnLihatRME.onclick = function() {
            bukaRMEOtomatisDariKalender(noRM, namaPasien);
        };

        // 5. Tampilkan Modal Pop-up ke layar
        const modal = document.getElementById('modalSummaryKalender');
        if (modal) modal.style.display = 'flex';
    }

    function tutupModalKalender() {
        const modal = document.getElementById('modalSummaryKalender');
        if (modal) modal.style.display = 'none';
    }

    // =========================================================================
    // 🔥 MESIN JALAN TOL KE RME (DISESUAIKAN DENGAN CARIPASIENGLOBAL)
    // =========================================================================
    function bukaRMEOtomatisDariKalender(noRM, namaPasien) {
        // 1. Tutup modal pop-up terlebih dahulu
        tutupModalKalender();

        // 2. Alihkan layar ke tab Riwayat Medis
        if (typeof switchTab === "function") {
            switchTab('riwayatMedis');
        }

        // 3. Jeda 350ms agar tab Riwayat Medis selesai terbuka sempurna
        setTimeout(() => {
            // Bersihkan data dari spasi gaib
            const rmBersih = (noRM || "").toString().trim().toUpperCase();
            const namaBersih = (namaPasien || "").toString().trim();
            
            // 🔥 TARGETKAN KE ID INPUT ASLI MILIK ANDA: txtCariRiwayatGlobal
            const inputGlobal = document.getElementById('txtCariRiwayatGlobal');
            
            if (inputGlobal) {
                // Prioritaskan cari pakai No RM. Jika RM kosong/minus, baru cari pakai Nama Pasien
                const kataKunci = (rmBersih && rmBersih !== "-" && rmBersih !== "UNDEFINED") ? rmBersih : namaBersih;
                
                inputGlobal.value = kataKunci;
                
                // Pancing event browser
                inputGlobal.dispatchEvent(new Event('input', { bubbles: true }));
                inputGlobal.dispatchEvent(new Event('change', { bubbles: true }));

                console.log(`🚀 [SMART ROUTING] Mengirim keyword "${kataKunci}" ke cariPasienGlobal()...`);

                // 🔥 PANGGIL FUNGSI ASLI MILIK ANDA: cariPasienGlobal()
                if (typeof cariPasienGlobal === "function") {
                    cariPasienGlobal();
                } else {
                    // Alternatif fisik jika fungsi terblokir scope: klik tombol carinya langsung
                    const btnCari = document.querySelector('#riwayatMedis button[onclick*="cariPasienGlobal"]') || 
                                    document.querySelector('button[onclick*="cariPasienGlobal"]');
                    if (btnCari) btnCari.click();
                }
            } else {
                alert("❌ ERROR: Input dengan ID 'txtCariRiwayatGlobal' tidak ditemukan di layar ini.");
            }
        }, 350); 
    }

    // =========================================================================
    // 🎂 MESIN TARGET CAMPAIGN ULANG TAHUN (KHUSUS DIGITAL MARKETING)
    // =========================================================================

    // Variabel global untuk menyimpan cache data ulang tahun agar bisa diekspor ke CSV tanpa fetch ulang
    window.cacheDataUlangTahun = [];

    /**
     * 1. FUNGSI MUAT DATA: Menarik data pasien ulang tahun bulan ini dari server
     */
    function muatDataUlangTahun() {
        const tbody = document.getElementById('bodyTabelUlangTahun');
        const lblBulan = document.getElementById('lblBulanUlangTahun');
        const btnRefresh = document.getElementById('btnRefreshUlangTahun');

        if (!tbody) return;

        // --- PROTEKSI RBAC (Cek Hak Akses Analisis Bisnis) ---
        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        const perms = sessionData.permissions || {};
        
        // Mengecek izin dari berbagai kemungkinan nama properti yang kita temukan di Langkah 2
        const punyaAkses = perms.aksesanalisisbisnis === 1 || 
                        perms.Akses_AnalisisBisnis === 1 || 
                        perms.analisisBisnis === 1 || 
                        sessionData.role === 'owner' || 
                        sessionData.role === 'admin';

        if (!punyaAkses) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 30px; background: #fef2f2; color: #991b1b; font-weight: bold;">🔒 Akses Ditolak: Fitur ini khusus untuk peran yang memiliki izin Analisis Bisnis / Digital Marketing.</td></tr>';
            return;
        }

        // Ubah status tombol dan tabel menjadi loading
        if (btnRefresh) btnRefresh.innerHTML = '⏳ Memuat...';
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 35px 20px; color: #0ea5e9; font-weight: bold;">⏳ Mengambil data pasien ulang tahun bulan ini dari Master Pasien...</td></tr>';

        // Nama-nama bulan dalam bahasa Indonesia
        const namaBulanIndo = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const bulanSekarangIdx = new Date().getMonth() + 1;
        if (lblBulan) lblBulan.innerText = namaBulanIndo[bulanSekarangIdx] || "Bulan Ini";

        // Panggil Action Server yang sudah kita buat di Langkah 1
        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getPasienUlangTahunBulanIni" })
        })
        .then(res => res.json())
        .then(res => {
            if (btnRefresh) btnRefresh.innerHTML = '🔄 Refresh Data';
            tbody.innerHTML = '';

            if (res.result === "success" && res.data && res.data.length > 0) {
                // Simpan ke cache global untuk fitur Ekspor CSV
                window.cacheDataUlangTahun = res.data;

                console.log(`🎉 [CAMPAIGN ULANG TAHUN] Berhasil memuat ${res.data.length} pasien!`);

                // Gambar setiap baris pasien ke dalam tabel
                res.data.forEach((p, idx) => {
                    const noRM = p.noRM || "-";
                    const nama = p.namaPasien || "Pasien";
                    const tglLahir = p.tanggalLahirTampil || "-";
                    const umur = p.umur && p.umur !== "-" ? `${p.umur} Thn` : "-";
                    const noWA = p.noWA && p.noWA !== "-" ? p.noWA : "Tidak Ada";

                    // Siapkan tombol WA jika nomor teleponnya valid
                    let tombolActionHtml = `<span style="color: #94a3b8; font-size: 11px;">WA Tidak Ada</span>`;
                    if (noWA !== "Tidak Ada" && noWA.length >= 8) {
                        // Gunakan replace karakter kutip agar aman saat dimasukkan ke parameter fungsi
                        const namaAman = nama.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                        tombolActionHtml = `
                            <button onclick="kirimWAUlangTahun('${noWA}', '${namaAman}')" style="background: #25d366; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; font-size: 12px; box-shadow: 0 2px 4px rgba(37, 211, 102, 0.2); transition: 0.2s;">
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
            if (btnRefresh) btnRefresh.innerHTML = '🔄 Refresh Data';
            console.error("❌ Gagal memuat data ulang tahun:", err);
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 30px; color: #c0392b; font-weight: bold;">⚠️ Terjadi kesalahan koneksi saat memuat data dari server. Silakan coba lagi.</td></tr>';
        });
    }

    /**
     * 2. FUNGSI KIRIM WA: Membuka WhatsApp Web/App dengan template ucapan + voucher
     */
    function kirimWAUlangTahun(noWA, namaPasien) {
        if (!noWA || noWA === "-" || noWA === "Tidak Ada") {
            alert("⚠️ Nomor WhatsApp pasien ini tidak valid atau tidak tercatat di database.");
            return;
        }

        // Bersihkan karakter selain angka (spasi, strip, plus, dll)
        let waBersih = String(noWA).replace(/[^0-9]/g, '');
        
        // Ubah angka 0 di depan menjadi kode negara 62
        if (waBersih.startsWith('0')) {
            waBersih = '62' + waBersih.slice(1);
        } else if (!waBersih.startsWith('62')) {
            waBersih = '62' + waBersih; // Antisipasi jika terketik tanpa 0 atau tanpa 62
        }

        // Nama bulan untuk masa berlaku promo
        const namaBulanIndo = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const bulanSekarang = namaBulanIndo[new Date().getMonth() + 1] || "bulan ini";

        // Template Ucapan & Promo Retensi dari Digital Marketing
        const pesan = `Halo Kak *${namaPasien}*! 🎉\n\n` +
                    `Segenap manajemen dan tim medis *Klinik Anvaya* mengucapkan *Selamat Ulang Tahun*! 🎂✨ Semoga Kakak senantiasa diberikan kesehatan, kebahagiaan, dan kelancaran dalam setiap aktivitas.\n\n` +
                    `🎁 *KADO SPESIAL ULANG TAHUN UNTUK KAKAK*\n` +
                    `Sebagai bentuk apresiasi kami, Kakak mendapatkan *Voucher Diskon 20%* untuk perawatan elektif / estetika di Klinik Anvaya!\n\n` +
                    `📌 *Cara Klaim:* Cukup tunjukkan pesan WhatsApp ini kepada kasir kami saat kunjungan.\n` +
                    `⏳ *Masa Berlaku:* Selama bulan *${bulanSekarang}* ini.\n\n` +
                    `Yuk, reservasi jadwal perawatan Kakak sekarang dan rayakan hari spesial dengan senyuman yang lebih sehat dan cerah! 🏥💖\n\n` +
                    `Salam sehat,\n` +
                    `*Customer Relationship - Klinik Anvaya*`;

        // Eksekusi buka link WhatsApp Web / App
        const urlWA = `https://api.whatsapp.com/send?phone=${waBersih}&text=${encodeURIComponent(pesan)}`;
        window.open(urlWA, '_blank');
    }

    /**
     * 3. FUNGSI EKSPOR CSV (VERSI AMAN TIPE DATA INT & STRING)
     */
    function eksporUlangTahunCSV() {
        if (!window.cacheDataUlangTahun || window.cacheDataUlangTahun.length === 0) {
            alert("⚠️ Belum ada data pasien ulang tahun yang ditampilkan. Silakan klik tombol [🔄 Refresh Data] terlebih dahulu.");
            return;
        }

        const namaBulanIndo = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const bulanSekarang = namaBulanIndo[new Date().getMonth() + 1] || "Bulan_Ini";
        const tahunSekarang = new Date().getFullYear();

        // Susun Header Kolom CSV
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "No RM,Nama Pasien,Tanggal Lahir,Umur,No WhatsApp\r\n";

        // 🔥 FIX UTAMA: Bungkus dengan String(...) agar angka seperti umur '36' tidak crash saat di-.replace()
        window.cacheDataUlangTahun.forEach(p => {
            const rm = `"${String(p.noRM || '').replace(/"/g, '""')}"`;
            const nama = `"${String(p.namaPasien || '').replace(/"/g, '""')}"`;
            const tgl = `"${String(p.tanggalLahirTampil || '').replace(/"/g, '""')}"`;
            const umur = `"${String(p.umur || '').replace(/"/g, '""')}"`;
            
            // Format angka telepon dengan tanda kutip agar angka 0 atau 62 tidak hilang di Excel
            let wa = p.noWA && p.noWA !== "-" ? String(p.noWA).replace(/[^0-9]/g, '') : "";
            if (wa.startsWith('0')) wa = '62' + wa.slice(1);
            const waCsv = `"${wa}"`;

            csvContent += `${rm},${nama},${tgl},${umur},${waCsv}\r\n`;
        });

        // Proses Download File secara otomatis
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Target_Campaign_Ulang_Tahun_${bulanSekarang}_${tahunSekarang}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log("✔️ [EKSPOR CSV] Berhasil mengunduh data campaign ulang tahun.");
    }

    // =========================================================================
    // 🎨 ENGINE SIGNATURE PAD & INFORMED CONSENT
    // =========================================================================
    let isDrawing = false;
    let canvas, ctx;

    // 1. Inisialisasi Canvas saat halaman siap
    function initSignaturePad() {
        canvas = document.getElementById('canvasTTD');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Event untuk Mouse (PC)
        canvas.addEventListener('mousedown', mulaiGambar);
        canvas.addEventListener('mousemove', gambar);
        canvas.addEventListener('mouseup', stopGambar);
        canvas.addEventListener('mouseout', stopGambar);

        // Event untuk Layar Sentuh (Tablet/HP)
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            canvas.dispatchEvent(mouseEvent);
        }, { passive: false });
    }

    function getPosisiCanvas(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    function mulaiGambar(e) {
        isDrawing = true;
        const pos = getPosisiCanvas(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    }

    function gambar(e) {
        if (!isDrawing) return;
        const pos = getPosisiCanvas(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }

    function stopGambar() {
        isDrawing = false;
    }

    function bersihkanTTD() {
        if (typeof canvas !== 'undefined' && typeof ctx !== 'undefined' && canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        // Sembunyikan banner pratinjau
        const bannerTTD = document.getElementById('bannerPratinjauTTD');
        if (bannerTTD) bannerTTD.style.display = "none";

        // 🔥 TAMBAHAN DINAMIS: Buka kunci (Enable) semua checkbox agar bisa diedit ulang!
        document.querySelectorAll('#modalInformedConsent input[type="checkbox"]').forEach(chk => {
            chk.disabled = false;
        });

        // 🔥 TAMBAHAN DINAMIS: Buka kunci dropdown tujuan tindakan saat direvisi!
        const selTujuan = document.getElementById('selTujuanConsent');
        const inpKustom = document.getElementById('inpTujuanKustomConsent');
        if (selTujuan) selTujuan.disabled = false;
        if (inpKustom) inpKustom.disabled = false;
    }

    // =========================================================================
    // 🔓 PEMBUKA MODAL CONSENT (FIX STATE LEAKAGE - ISOLASI PER PASIEN)
    // =========================================================================
    function bukaModalConsent(noRM, namaPasien, tindakan) {
        // 1. SMART RM FALLBACK
        let rawRM = noRM;
        if (!rawRM || rawRM === "-" || rawRM === "undefined") {
            rawRM = document.getElementById('modalNoRM')?.value || document.getElementById('lblProfilRM')?.innerText || "-";
        }
        const cleanNoRM = String(rawRM).trim();

        document.getElementById('lblConsentRM').innerText = cleanNoRM;
        document.getElementById('lblConsentNama').innerText = namaPasien || document.getElementById('modalNama')?.value || "-";
        
        // 2. SMART ACTION EXTRACTOR
        let daftarTindakanBersih = [];
        const elemenTindakan = document.querySelectorAll('#kontainerTindakanDinamis .sel-nama-tindakan, #kontainerTindakanDinamis input[type="text"]');
        
        elemenTindakan.forEach(el => {
            if (el.classList.contains('inp-harga-tindakan') || el.classList.contains('inp-catatan-tindakan') || el.classList.contains('sel-kategori-tindakan')) return;
            let nama = String(el.value).trim();
            if (nama && nama !== "KUSTOM" && nama !== "") {
                daftarTindakanBersih.push(nama);
            }
        });
        
        let teksTindakanFinal = [...new Set(daftarTindakanBersih)].join(", ");
        if (!teksTindakanFinal) teksTindakanFinal = tindakan || document.getElementById('lblConsentTindakan')?.innerText || "-";
        document.getElementById('lblConsentTindakan').innerText = teksTindakanFinal;

        const modal = document.getElementById('modalInformedConsent');
        const btnSimpan = document.getElementById('btnSimpanConsent');
        const chkSetuju = document.getElementById('chkSayaSetuju');
        const bannerTTD = document.getElementById('bannerPratinjauTTD');
        const imgTTD = document.getElementById('imgPratinjauTTD');
        const btnCetak = document.getElementById('btnCetakConsentPDF');

        // 🔥 FIX UTAMA: JANGAN gunakan window.consentSudahDisimpanHariIni!
        // Ganti dengan cek SPESIFIK apakah pasien ini (berdasarkan RM-nya) sudah punya TTD di memori lokal.
        const urlFotoLokalRMIni = localStorage.getItem('ttd_consent_' + cleanNoRM);
        const isConsentPasienIniAda = (urlFotoLokalRMIni && urlFotoLokalRMIni !== "-" && urlFotoLokalRMIni !== "undefined");

        if (isConsentPasienIniAda) {
            // ==========================================
            // MODE PRATINJAU (Khusus Pasien Ini)
            // ==========================================
            if (btnSimpan) {
                btnSimpan.style.backgroundColor = "#e67e22";
                btnSimpan.innerHTML = "🔄 Simpan Ulang / Revisi Consent";
            }
            
            const savedRisiko = JSON.parse(localStorage.getItem('risiko_consent_' + cleanNoRM) || '[]');
            document.querySelectorAll('#modalInformedConsent input[type="checkbox"]').forEach(chk => {
                let label = chk.parentElement ? chk.parentElement.innerText.trim() : "";
                if (label && !label.toLowerCase().includes("saya yang bertanda tangan")) {
                    chk.checked = savedRisiko.includes(label) || savedRisiko.includes(chk.value);
                    chk.disabled = true;
                }
            });

            // 🔥 FIX: Hapus fallback ke window.tujuanConsentAktif
            const savedTujuan = localStorage.getItem('tujuan_consent_' + cleanNoRM); 
            const selTujuan = document.getElementById('selTujuanConsent');
            const inpKustom = document.getElementById('inpTujuanKustomConsent');
            
            if (selTujuan && savedTujuan && savedTujuan !== "-" && savedTujuan !== "undefined") {
                let opsiCocok = false;
                for (let i = 0; i < selTujuan.options.length; i++) {
                    if (selTujuan.options[i].value === savedTujuan || selTujuan.options[i].text === savedTujuan) {
                        selTujuan.selectedIndex = i;
                        opsiCocok = true;
                        break;
                    }
                }
                if (!opsiCocok) {
                    selTujuan.selectedIndex = selTujuan.options.length - 1;
                    if (inpKustom) {
                        inpKustom.style.display = 'block';
                        inpKustom.value = savedTujuan;
                        inpKustom.disabled = true;
                    }
                } else if (inpKustom) {
                    inpKustom.style.display = 'none';
                }
                selTujuan.disabled = true;
            }

            if (chkSetuju) {
                chkSetuju.checked = true;
                chkSetuju.disabled = true;
            }
            
            if (btnCetak) {
                btnCetak.style.display = "inline-block";
                // 🔥 FIX: Hapus fallback ke window.pdfConsentAktif
                const savedPdf = localStorage.getItem('pdf_url_consent_' + cleanNoRM);
                if (savedPdf && savedPdf !== "-" && savedPdf !== "undefined") {
                    btnCetak.innerHTML = "📄 Buka Ulang PDF Resmi";
                    btnCetak.style.backgroundColor = "#27ae60";
                } else {
                    btnCetak.innerHTML = "🖨️ Cetak / Unduh PDF Resmi";
                    btnCetak.style.backgroundColor = "#2980b9";
                }
            }

            let urlFoto = urlFotoLokalRMIni; // Murni dari RM pasien ini
            if (urlFoto && urlFoto !== "-" && urlFoto !== "undefined") {
                let fileId = "";
                const match = urlFoto.match(/id=([a-zA-Z0-9_-]+)/) || urlFoto.match(/d\/([a-zA-Z0-9_-]+)/);
                if (match && match[1]) {
                    fileId = match[1];
                } else if (urlFoto.indexOf("http") === -1 && urlFoto.length > 20) {
                    fileId = urlFoto;
                }
                if (fileId !== "") {
                    urlFoto = "https://lh3.googleusercontent.com/d/" + fileId;
                }
                if (imgTTD) imgTTD.src = urlFoto;
                if (bannerTTD) bannerTTD.style.display = "block";
            } else {
                if (bannerTTD) bannerTTD.style.display = "none";
            }
            
        } else {
            // ==========================================
            // MODE INPUT BARU (Kanvas Bersih)
            // ==========================================
            if (typeof bersihkanTTD === "function") bersihkanTTD();
            
            if (btnSimpan) {
                btnSimpan.style.backgroundColor = "#28a745";
                btnSimpan.innerHTML = "💾 Simpan Persetujuan";
            }
            
            document.querySelectorAll('#modalInformedConsent input[type="checkbox"]').forEach(chk => {
                chk.checked = false;
                chk.disabled = false;
            });

            if (btnCetak) btnCetak.style.display = "none";
            
            const selTujuan = document.getElementById('selTujuanConsent');
            const inpKustom = document.getElementById('inpTujuanKustomConsent');
            if (selTujuan) {
                selTujuan.selectedIndex = 0;
                selTujuan.disabled = false;
            }
            if (inpKustom) {
                inpKustom.style.display = 'none';
                inpKustom.value = '';
                inpKustom.disabled = false;
            }
            
            if (bannerTTD) bannerTTD.style.display = "none";
            if (imgTTD) imgTTD.src = "";
        }
        
        if (modal) modal.style.display = 'flex';
        
        setTimeout(() => {
            if (typeof initSignaturePad === "function") initSignaturePad();
        }, 200);
    }

    function tutupModalConsent() {
        const modal = document.getElementById('modalInformedConsent');
        if (modal) modal.style.display = 'none';
    }

    // 3. Validasi & Kirim ke Backend
    // =========================================================================
    // 💾 PENYIMPAN TTD CONSENT (FIX ID KANVAS & MENDUKUNG MODE REVISI)
    // =========================================================================
    function kirimDataConsent() {
        const chkSetuju = document.getElementById('chkSayaSetuju');
        if (!chkSetuju || !chkSetuju.checked) {
            alert("⚠️ Wajib mencentang kotak pernyataan persetujuan terlebih dahulu!");
            return;
        }

        // 🔥 1. PERBAIKAN FATAL: Membidik ID kanvas yang TEPAT ('canvasTTD')
        const canvasTepat = document.getElementById('canvasTTD');
        if (!canvasTepat) {
            alert("⚠️ Elemen kanvas tanda tangan tidak ditemukan di halaman!");
            return;
        }

        // 🔥 2. LOGIKA CERDAS: Pengecekan Kanvas vs Mode Pratinjau (Revisi)
        const blankCanvas = document.createElement('canvas');
        blankCanvas.width = canvasTepat.width;
        blankCanvas.height = canvasTepat.height;
        const isCanvasKosong = (canvasTepat.toDataURL() === blankCanvas.toDataURL());
        
        let ttdBase64Data = "";
        const bannerTTD = document.getElementById('bannerPratinjauTTD');

        if (isCanvasKosong) {
            // Jika kanvas kosong, cek apakah ini "Mode Revisi" (Banner TTD Lama Tampil)
            if (bannerTTD && bannerTTD.style.display === "block" && window.urlFotoConsentAktif) {
                // Aman! Pasien tidak perlu TTD ulang, pakai URL TTD yang lama
                ttdBase64Data = window.urlFotoConsentAktif; 
            } else {
                // Jika ini Consent Baru dan Kanvas benar-benar Kosong, blokir!
                alert("⚠️ Pasien atau wali wajib menorehkan tanda tangan pada area kotak yang disediakan!");
                return;
            }
        } else {
            // Jika ada coretan baru, ambil coretan tersebut
            ttdBase64Data = canvasTepat.toDataURL("image/png");
        }

        const risikoTerpilih = [];
        document.querySelectorAll('.chk-risiko:checked').forEach(el => {
            risikoTerpilih.push(el.value);
        });

        const btn = document.getElementById('btnSimpanConsent');
        if (btn) {
            btn.disabled = true;
            btn.innerText = "⏳ Mengirim & Menyimpan...";
        }

        const payload = {
            action: "simpanConsent",
            noRM: document.getElementById('lblConsentRM')?.innerText || "-",
            namaPasien: document.getElementById('lblConsentNama')?.innerText || "-",
            tindakan: document.getElementById('lblConsentTindakan')?.innerText || "-",
            risikoTerpilih: risikoTerpilih,
            statusTTD: "Digital",
            ttdBase64: ttdBase64Data // Data TTD sudah di-handle cerdas di atas
        };

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(res => {
            if (btn) {
                btn.disabled = false;
                btn.innerText = "💾 Simpan Persetujuan";
            }
            
            if (res.result === "success") {
                alert("✅ Informed Consent berhasil disimpan & diarsip ke Google Drive!");
                
                const cleanRM = String(payload.noRM || "-").trim();
                if (cleanRM && cleanRM !== "-") {
                    const urlSah = res.urlFoto || res.linkFoto || res.urlBukti || window.urlFotoConsentAktif;
                    localStorage.setItem('ttd_consent_' + cleanRM, urlSah);
                    localStorage.setItem('risiko_consent_' + cleanRM, JSON.stringify(risikoTerpilih));
                    
                    const selTujuan = document.getElementById('selTujuanConsent');
                    const inpKustom = document.getElementById('inpTujuanKustomConsent');
                    let nilaiTujuanSah = payload.tujuan || (selTujuan ? selTujuan.value : "");
                    if (selTujuan && selTujuan.value.includes("Lain-lain") && inpKustom && inpKustom.value) {
                        nilaiTujuanSah = inpKustom.value;
                    }
                    localStorage.setItem('tujuan_consent_' + cleanRM, nilaiTujuanSah);
                    if (window.tujuanConsentAktif) {
                        localStorage.setItem('tujuan_consent_' + cleanRM, window.tujuanConsentAktif);
                    }
                }
                
                window.consentSudahDisimpanHariIni = true;
                if (res.urlFoto || res.linkFoto) window.urlFotoConsentAktif = res.urlFoto || res.linkFoto;

                if (typeof simpanDraftRME === "function") {
                    console.log("💾 [Auto-Save] Menyimpan draf RME setelah Consent dibuat...");
                    simpanDraftRME();
                }

                if (typeof periksaKebutuhanConsentUI === "function") periksaKebutuhanConsentUI();

                // 🔥 FITUR KASIR (SILENT MODE): Picu pembuatan PDF diam-diam di latar belakang!
                if (typeof cetakInformedConsentPDF === "function") {
                    console.log("🚀 [Auto-PDF] Mengirim perintah pembuatan PDF diam-diam ke server...");
                    cetakInformedConsentPDF(true); 
                }

                const modalConsent = document.getElementById('modalInformedConsent');
                if(modalConsent) modalConsent.style.display = 'none';
            } else {
                alert("❌ Gagal menyimpan consent: " + (res.message || "Terjadi kesalahan server."));
            }
        })
        .catch(err => {
            if (btn) {
                btn.disabled = false;
                btn.innerText = "💾 Simpan Persetujuan";
            }
            console.error("Error consent:", err);
            alert("⚠️ Terjadi kesalahan koneksi sistem saat mengirim data.");
        });
    }

    // =========================================================================
    // 🚀 TRIGGER OTOMATIS INFORMED CONSENT DARI FORM INPUT RME
    // =========================================================================
    function triggerInformedConsentDariRME() {
        // 1. Ambil No. RM dan Nama Pasien dari input hidden yang sudah ada di form RME
        const noRM = document.getElementById('modalNoRM').value || "-";
        const namaPasien = document.getElementById('modalNama').value || "-";

        // 2. Kumpulkan seluruh tindakan yang sedang dipilih/diketik oleh dokter
        const kontainer = document.getElementById('kontainerTindakanDinamis');
        let daftarTindakan = [];

        if (kontainer) {
            // Cari semua elemen input, select, atau textarea di dalam kontainer tindakan
            const inputTindakan = kontainer.querySelectorAll('input[type="text"], select, textarea');
            inputTindakan.forEach(el => {
                if (el.value && el.value.trim() !== "") {
                    daftarTindakan.push(el.value.trim());
                }
            });
        }

        // Jika belum ada tindakan yang dipilih, beri peringatan santun atau gunakan teks default
        let teksTindakan = daftarTindakan.join(", ");
        if (daftarTindakan.length === 0) {
            teksTindakan = prompt("⚠️ Belum ada tindakan yang dipilih di form. Silakan ketik nama tindakan medis untuk persetujuan ini:", "Odontektomi / Tindakan Bedah Minor");
            if (!teksTindakan) return; // Batal jika dokter menutup prompt
        }

        // 3. Buka Modal Informed Consent dengan data yang sudah matang!
        bukaModalConsent(noRM, namaPasien, teksTindakan);
    }

    // =========================================================================
    // 🛡️ PENGATUR TOMBOL CONSENT (DENGAN FITUR SMART-DISABLE & LOCKING)
    // =========================================================================
    function periksaKebutuhanConsentUI() {
        const btnConsent = document.getElementById('btnBuatConsent');
        if (!btnConsent) return;

        // 1. Ambil No. RM Pasien yang sedang aktif
        const noRM = document.getElementById('modalNoRM')?.value || document.getElementById('lblProfilRM')?.innerText || "-";
        const cleanNoRM = String(noRM).trim();

        // 2. GEMBOK MEMORI: Cek apakah pasien sudah punya Consent sah di localStorage
        const savedTTD = localStorage.getItem('ttd_consent_' + cleanNoRM) || window.urlFotoConsentAktif;
        const savedRisiko = localStorage.getItem('risiko_consent_' + cleanNoRM);
        
        if ((savedTTD && savedTTD !== "-" && savedTTD !== "undefined") || (savedRisiko && savedRisiko !== "[]" && savedRisiko !== null)) {
            window.consentSudahDisimpanHariIni = true;
            if (savedTTD) window.urlFotoConsentAktif = savedTTD;
            
            // 🔥 PASTIKAN TOMBOL AKTIF BIKA SUDAH ADA TANDA TANGAN (Agar PDF bisa dilihat/dicetak)
            btnConsent.disabled = false;
            btnConsent.style.cursor = "pointer";
            btnConsent.style.opacity = "1";
            
            btnConsent.style.backgroundColor = "#27ae60"; // Hijau Sukses
            btnConsent.innerHTML = "✅ Informed Consent Tersimpan";
            btnConsent.style.display = "inline-flex";
            btnConsent.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
            btnConsent.style.border = "none";
            return; 
        }

        // --- 3. PEMINDAI AKURAT (HANYA CEK DROPDOWN TINDAKAN & INPUT TEKS) ---
        window.consentSudahDisimpanHariIni = false;
        let butuhConsent = false;

        const semuaInputTindakan = document.querySelectorAll('#kontainerTindakanDinamis .sel-nama-tindakan, #kontainerTindakanDinamis input[type="text"]');
        
        semuaInputTindakan.forEach(el => {
            if (el.classList.contains('inp-harga-tindakan') || el.classList.contains('inp-catatan-tindakan')) return;

            if (el && el.value) {
                const teks = String(el.value).trim().toLowerCase();
                let isBerisiko = false;

                // LAPIS 1: Atribut
                if (el.tagName.toLowerCase() === 'select' && el.selectedIndex >= 0) {
                    const opt = el.options[el.selectedIndex];
                    if (opt && opt.getAttribute('data-butuh-consent') === "1") isBerisiko = true;
                }

                // LAPIS 2: Array Memori
                if (!isBerisiko) {
                    const masterArray = window.masterTindakanGlobal || [];
                    const foundItem = masterArray.find(item => {
                        const namaItem = String(item.nama || item["Nama Tindakan"] || "").trim().toLowerCase();
                        return namaItem === teks;
                    });
                    if (foundItem) {
                        const valConsent = foundItem.Butuh_Consent || foundItem.butuhConsent || foundItem[6] || 0;
                        if (String(valConsent) === "1" || valConsent === 1 || String(valConsent).toLowerCase() === "true") isBerisiko = true;
                    }
                }

                // LAPIS 3: Keyword
                if (!isBerisiko) {
                    if (teks.includes("odontektomi") || teks.includes("exo") || teks.includes("cabut") || 
                        teks.includes("implan") || teks.includes("bedah") || teks.includes("insisi") || 
                        teks.includes("gingiv") || teks.includes("frenektomi") || teks.includes("alveol") || 
                        teks.includes("operkul") || teks.includes("kista") || teks.includes("graft") || 
                        teks.includes("sinus") || teks.includes("valplas") || teks.includes("crown")) {
                        isBerisiko = true;
                    }
                }

                if (isBerisiko) butuhConsent = true;
            }
        });

        // --- 4. EKSEKUSI VISUAL TOMBOL UTAMA (SMART DISABLE/ENABLE) ---
        if (butuhConsent) {
            // 🔴 MODE WAJIB: Nyalakan tombol
            btnConsent.disabled = false;
            btnConsent.style.cursor = "pointer";
            btnConsent.style.opacity = "1"; // Terang benderang
            
            btnConsent.style.backgroundColor = "#e67e22"; // Oranye Peringatan
            btnConsent.innerHTML = "⚠️ Buat Informed Consent (Wajib)";
            btnConsent.style.display = "inline-flex";
            btnConsent.style.boxShadow = "0 0 12px rgba(230, 126, 34, 0.85)";
            btnConsent.style.border = "2px solid #f39c12";
            btnConsent.style.fontWeight = "bold";
        } else {
            // ⚪ MODE AMAN: Matikan tombol (Disable)
            btnConsent.disabled = true;
            btnConsent.style.cursor = "not-allowed"; // Ubah kursor menjadi tanda coret
            btnConsent.style.opacity = "0.5"; // Jadikan transparan agar terlihat mati
            
            btnConsent.style.backgroundColor = "#95a5a6"; // Abu-abu pudar
            btnConsent.innerHTML = "✍️ Buat Informed Consent";
            btnConsent.style.display = "inline-flex";
            btnConsent.style.boxShadow = "none";
            btnConsent.style.border = "none";
            btnConsent.style.fontWeight = "normal";
        }
    }

    // 🔥 PASANG SENSOR OTOMATIS (EVENT DELEGATION):
    // Memantau setiap kali dokter memilih/mengganti tindakan di dropdown
    document.addEventListener('change', function(e) {
        if (e.target && e.target.classList.contains('sel-nama-tindakan')) {
            periksaKebutuhanConsentUI();
        }
    });

    // =========================================================================
    // 🔄 ENGINE RESET DINAMIS STATUS & TOMBOL INFORMED CONSENT
    // =========================================================================
    function resetStatusConsentUI() {
        // 1. Kembalikan memori global ke status awal (belum ada consent)
        window.consentSudahDisimpanHariIni = false;

        // 2. Cari tombol pemanggil consent dan kembalikan ke tampilan default
        const btnConsent = document.getElementById('btnBuatConsent');
        if (btnConsent) {
            btnConsent.classList.remove('btn-consent-wajib');
            btnConsent.style.backgroundColor = "#e67e22"; // Warna oranye default
            btnConsent.innerHTML = "✍️ Buat Informed Consent";
            btnConsent.disabled = false;
        }

        // 3. Bersihkan seluruh badge peringatan di dalam daftar tindakan jika ada
        document.querySelectorAll('.badge-consent').forEach(el => el.remove());
        
        console.log("🔄 [Consent UI] Status dan tombol Informed Consent telah di-reset ke default.");
    }

    // =========================================================================
    // 🖨️ PENCETAK PDF CONSENT (100% DINAMIS + DUKUNGAN SILENT MODE)
    // =========================================================================
    function cetakInformedConsentPDF(isSilent = false) {
        const noRM = document.getElementById('lblConsentRM')?.innerText || document.getElementById('modalNoRM')?.value || "-";
        
        // 1. CEK CACHE MEMORI (Murni berdasarkan Nomor RM, hindari global variable leakage!)
        const existingPdfUrl = localStorage.getItem('pdf_url_consent_' + noRM);
        if (existingPdfUrl && existingPdfUrl !== "-" && existingPdfUrl !== "undefined") {
            if (!isSilent) {
                console.log("♻️ [Smart Print] PDF sudah ada di memori.");
                alert("♻️ Membuka kembali dokumen PDF resmi yang telah dicetak sebelumnya...");
                window.open(existingPdfUrl, '_blank');
            }
            return; 
        }

        const btnCetak = document.getElementById('btnCetakConsentPDF');
        const teksAsli = btnCetak ? btnCetak.innerHTML : "🖨️ Cetak / Unduh PDF Resmi";
        
        // Hanya ubah UI tombol jika diklik manual oleh dokter (!isSilent)
        if (btnCetak && !isSilent) {
            btnCetak.disabled = true;
            btnCetak.innerHTML = "⏳ Membuat Dokumen PDF... (Mohon Tunggu)";
            btnCetak.style.backgroundColor = "#7f8c8d";
        }

        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        const namaPasien = document.getElementById('lblConsentNama')?.innerText || document.getElementById('modalNama')?.value || "-";
        const tindakan = document.getElementById('lblConsentTindakan')?.innerText || "-";
        
        // 🔥 FIX DINAMIS: Ambil nama dokter dan diagnosa secara cerdas, hapus teks kaku
        const diagnosa = document.getElementById('modalDiagnosa')?.value || document.getElementById('inputDiagnosaAktif')?.value || "Sesuai rekam medis aktif";
        const namaDokterDinamis = sessionData.username || document.getElementById('selDokter')?.value || document.getElementById('lblNamaDokter')?.innerText || "Dokter Klinik Anvaya";

        const pAktif = window.pasienRMEAktif || {};
        let detailAntrean = null;
        if (typeof dataAntreanGlobal !== 'undefined' && dataAntreanGlobal !== null) {
            detailAntrean = dataAntreanGlobal.find(p => p.noRM === noRM);
        }

        let umurTeks = "-";
        if (pAktif.tanggalLahir && typeof hitungUmur === "function") {
            umurTeks = `${hitungUmur(pAktif.tanggalLahir)} Thn (${pAktif.tanggalLahir})`;
        } else if (detailAntrean && detailAntrean.tanggalLahir && typeof hitungUmur === "function") {
            umurTeks = `${hitungUmur(detailAntrean.tanggalLahir)} Thn`;
        } else {
            const domUmur = document.getElementById('lblProfilUmur')?.innerText || "";
            const match = domUmur.match(/\((.*?)\)/);
            umurTeks = match ? match[1] : (domUmur !== "-" ? domUmur : "-");
        }

        let jenisKelamin = pAktif.jenisKelamin || detailAntrean?.jenisKelamin || "-";
        let alamat = pAktif.alamat || document.getElementById('lblProfilDomisili')?.innerText || detailAntrean?.alamat || "-";

        let daftarRisiko = [];
        document.querySelectorAll('#modalInformedConsent input[type="checkbox"]:checked').forEach(chk => {
            let label = chk.parentElement ? chk.parentElement.innerText.trim() : "";
            if (label && !label.toLowerCase().includes("saya yang bertanda tangan")) {
                daftarRisiko.push(label);
            }
        });

        const urlFotoTTD = window.urlFotoConsentAktif || localStorage.getItem('ttd_consent_' + noRM) || "-";
        
        // 🔥 FIX DINAMIS: Pengambilan tujuan tindakan yang aman
        let tujuanTindakan = "-";
        if (typeof getTujuanConsentAktif === "function") {
            tujuanTindakan = getTujuanConsentAktif();
        } else {
            tujuanTindakan = window.tujuanConsentAktif || localStorage.getItem('tujuan_consent_' + noRM) || document.getElementById('selTujuanConsent')?.value || "Penyembuhan klinis";
        }

        const payload = {
            action: "cetakConsentPDF",
            noRM: noRM,
            namaPasien: namaPasien,
            umur: umurTeks,
            jenisKelamin: jenisKelamin,
            alamat: alamat,
            namaDokter: namaDokterDinamis,
            diagnosa: diagnosa,
            tindakan: tindakan,
            tujuan: tujuanTindakan,
            risiko: daftarRisiko,
            namaPenandatangan: namaPasien,
            linkFoto: urlFotoTTD
        };

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(res => {
            if (btnCetak) {
                btnCetak.disabled = false;
                btnCetak.innerHTML = "📄 Buka Ulang PDF Resmi";
                btnCetak.style.backgroundColor = "#27ae60"; 
            }

            if (res.result === "success" && res.pdfUrl) {
                window.pdfConsentAktif = res.pdfUrl;
                if (noRM !== "-") localStorage.setItem('pdf_url_consent_' + noRM, res.pdfUrl);

                // Pop-up dan Tab Baru HANYA muncul jika dokter klik manual
                if (!isSilent) {
                    alert("✅ Dokumen PDF Resmi berhasil dibuat!\n\nDokumen akan dibuka secara otomatis di tab baru.");
                    window.open(res.pdfUrl, '_blank');
                } else {
                    console.log("🤫 [Background PDF] Dokumen PDF Consent dirakit diam-diam untuk Kasir.");
                }
            } else {
                if (!isSilent) alert("❌ Gagal membuat PDF: " + (res.message || "Terjadi kesalahan di server."));
            }
        })
        .catch(err => {
            if (btnCetak && !isSilent) {
                btnCetak.disabled = false;
                btnCetak.innerHTML = teksAsli;
                btnCetak.style.backgroundColor = "#2980b9";
            }
            if (!isSilent) alert("⚠️ Gangguan koneksi saat menghubungi mesin cetak server.");
        });
    }

    // =========================================================================
    // 🎯 HELPER TUJUAN TINDAKAN INFORMED CONSENT
    // =========================================================================
    function toggleTujuanKustomConsent(value) {
        const inpKustom = document.getElementById('inpTujuanKustomConsent');
        if (inpKustom) {
            if (value === "KUSTOM") {
                inpKustom.style.display = 'block';
                inpKustom.focus();
            } else {
                inpKustom.style.display = 'none';
                inpKustom.value = "";
            }
        }
    }

    function getTujuanConsentAktif() {
        const sel = document.getElementById('selTujuanConsent');
        const inpKustom = document.getElementById('inpTujuanKustomConsent');
        if (!sel) return "Penyembuhan & perbaikan fungsi klinis kedokteran gigi";
        
        if (sel.value === "KUSTOM" && inpKustom && inpKustom.value.trim() !== "") {
            return inpKustom.value.trim();
        }
        return sel.value !== "KUSTOM" ? sel.value : "Penyembuhan & perbaikan fungsi klinis kedokteran gigi";
    }

    // =====================================================================
    // 🔥 MODUL SMART WORKLIST LAB (JALUR B - AKSES PERAWAT)
    // =====================================================================
    
    // 1. Memanggil Data Antrean dari Server
    function muatAntreanLab() {
        const tbody = document.getElementById('tbodyAntreanLab');
        if(!tbody) return;
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:30px;">⏳ Menyinkronkan mesin pelacak dengan Kasir...</td></tr>';
        
        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getAntreanLab" })
        }).then(res => res.json()).then(res => {
            if (res.result === "success") {
                renderTabelAntreanLab(res.data);
            } else {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">Gagal memuat: ${res.message}</td></tr>`;
            }
        }).catch(err => {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:red;">⚠️ Gangguan jaringan.</td></tr>';
        });
    }

    // 2. Menggambar Tabel
    function renderTabelAntreanLab(data) {
        const tbody = document.getElementById('tbodyAntreanLab');
        tbody.innerHTML = "";
        
        if (!data || data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:40px; color:#7f8c8d; font-style:italic;">🎉 Yeaay! Semua tagihan vendor lab pasien sudah beres diselesaikan!</td></tr>';
            return;
        }

        data.forEach(item => {
            let tr = document.createElement('tr');
            tr.style.borderBottom = "1px solid #ecf0f1";
            tr.innerHTML = `
                <td style="padding:15px; font-weight:bold; color:#34495e;">${item.invoice}</td>
                <td style="padding:15px; font-weight:bold; color:#2980b9;">${item.namaPasien}</td>
                
                <!-- 🔥 DATA NAMA DOKTER DIRENDER DI SINI -->
                <td style="padding:15px; font-weight:bold; color:#8e44ad;">👨‍⚕️ ${item.namaDokter}</td>
                
                <td style="padding:15px; font-weight:bold; color:#e67e22; max-width: 250px; line-height: 1.6;">
                    <span style="display:inline-block; background:#fef5e7; padding:6px 10px; border-radius:6px; border:1px solid #f8c471; word-wrap:break-word; white-space:normal;">
                        ${item.namaTindakan}
                    </span>
                </td>
                <td style="padding:15px; text-align:center;">
                    <button onclick="bukaModalInputLab('${item.invoice}', '${item.namaPasien}', '${item.namaTindakan}', '${item.namaDokter}')" style="background:#27ae60; color:white; border:none; padding:8px 15px; border-radius:4px; font-weight:bold; cursor:pointer; box-shadow:0 2px 4px rgba(0,0,0,0.1);">💰 Input Harga</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // 3. Membuka Pop-up & Kalkulator Beban 40%
    // 🔥 PERBAIKAN: Menambahkan parameter 'dokter' di dalam kurung
    function bukaModalInputLab(invoice, pasien, tindakan, dokter) {
        document.getElementById('hdnLabInvoice').value = invoice;
        
        // Sekarang kata 'dokter' di bawah ini resmi berisi teks nama (bukan elemen HTML)
        document.getElementById('hdnLabDokter').value = dokter; 
        
        document.getElementById('lblLabPasien').innerText = pasien;
        document.getElementById('lblLabTindakan').innerText = tindakan;
        document.getElementById('inpLabHargaDinamis').value = "";
        document.getElementById('lblPotonganDokter').innerText = "Rp 0";
        document.getElementById('modalInputLab').style.display = 'flex';
        
        // Auto-focus ke kotak input agar perawat bisa langsung mengetik
        setTimeout(() => document.getElementById('inpLabHargaDinamis').focus(), 100);
    }

    function hitungRealtimePotonganLab() {
        // Tarik teks dari input, HAPUS KOMANYA dulu sebelum dihitung matematikanya!
        let strHarga = document.getElementById('inpLabHargaDinamis').value.replace(/[^0-9]/g, '');
        let harga = Number(strHarga) || 0;
        let beban = harga * 0.4; // 40% ditanggung dokter
        document.getElementById('lblPotonganDokter').innerText = "- Rp " + beban.toLocaleString('id-ID');
    }

    // 4. Menyimpan Final
    function simpanTagihanLabDinamis(e) {
        e.preventDefault();
        const btn = document.getElementById('btnSimpanLabDinamis');
        const invoice = document.getElementById('hdnLabInvoice').value;
        const pasien = document.getElementById('lblLabPasien').innerText;
        const tindakan = document.getElementById('lblLabTindakan').innerText;
        const dokter = document.getElementById('hdnLabDokter').value;
        
        // 🔥 HAPUS KOMA SEBELUM DIKIRIM KE DATABASE (Database harus angka murni)
        let strHarga = document.getElementById('inpLabHargaDinamis').value.replace(/[^0-9]/g, '');
        const harga = Number(strHarga);
        
        let beban = harga * 0.4; // 40%

        btn.disabled = true;
        btn.innerText = "⏳ Menyimpan...";

        const sessionData = JSON.parse(localStorage.getItem('anvaya_session'));

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({
                action: "simpanDataLab", 
                noKuitansi: invoice,
                tanggalBayar: new Date().toISOString().split('T')[0],
                hargaLab: harga, // Kirim angka murni tanpa koma
                pasien: pasien,
                perawatanLab: tindakan,
                operator: sessionData ? sessionData.username : "Perawat"
            })
        }).then(res => res.json()).then(res => {
            btn.disabled = false;
            btn.innerText = "💾 Simpan Lab";
            if(res.result === "success") {
                document.getElementById('modalInputLab').style.display = 'none';
                
                cetakStrukLabInternal(invoice, pasien, tindakan, dokter, harga, beban);
                muatAntreanLab(); 
            } else {
                alert("❌ Gagal menyimpan: " + res.message);
            }
        }).catch(err => {
            btn.disabled = false;
            btn.innerText = "💾 Simpan Lab";
            alert("⚠️ Gangguan jaringan.");
        });
    }

    // 🔥 FUNGSI BARU: GENERATOR STRUK CETAK (Tambahkan di bagian bawah)
    function cetakStrukLabInternal(invoice, pasien, tindakan, dokter, harga, beban) {
        const tglCetak = new Date().toLocaleString('id-ID');
        const jendelaCetak = window.open('', '_blank', 'width=400,height=600');
        
        const htmlStruk = `
            <html>
            <head>
                <title>Struk Tagihan Lab - ${invoice}</title>
                <style>
                    body { font-family: 'Courier New', Courier, monospace; font-size: 14px; padding: 20px; color: #000; }
                    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
                    .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
                    .bold { font-weight: bold; }
                    .divider { border-bottom: 1px dashed #000; margin: 10px 0; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2 style="margin:0; font-size: 18px;">KLINIK ANVAYA</h2>
                    <p style="margin:5px 0 0 0; font-size: 12px;">BUKTI INTERNAL TAGIHAN LAB</p>
                </div>
                
                <div class="row"><span>No. Invoice:</span> <span>${invoice}</span></div>
                <div class="row"><span>Waktu Cetak:</span> <span>${tglCetak}</span></div>
                
                <div class="divider"></div>
                
                <div class="row"><span>Nama Pasien:</span> <span class="bold">${pasien}</span></div>
                <div class="row"><span>Dokter PJP:</span> <span>${dokter}</span></div>
                <div class="row" style="margin-top: 10px;"><span>Tindakan Lab:</span></div>
                <div class="row bold" style="margin-left: 10px;">- ${tindakan}</div>
                
                <div class="divider"></div>
                
                <div class="row"><span>Tagihan Vendor:</span> <span class="bold">Rp ${Number(harga).toLocaleString('id-ID')}</span></div>
                <div class="row" style="color: #555; font-size: 12px;"><span>(Potongan Gaji Dokter 40%)</span> <span>(- Rp ${beban.toLocaleString('id-ID')})</span></div>
                
                <div class="divider"></div>
                
                <div style="text-align: center; margin-top: 20px; font-size: 12px;">
                    <p>Struk ini merupakan dokumen internal.<br>Harap lampirkan bersama form setoran.</p>
                </div>
            </body>
            </html>
        `;
        
        jendelaCetak.document.write(htmlStruk);
        jendelaCetak.document.close();
        jendelaCetak.focus();
        // Delay sedikit agar browser merender struknya sebelum memunculkan popup print
        setTimeout(() => {
            jendelaCetak.print();
        }, 500);
    }

    // 🔥 FUNGSI BARU: MEMBERI KOMA SAAT PERAWAT MENGETIK
    function formatRupiahRealtime(input) {
        // Hapus semua karakter selain angka (biar huruf tidak bisa masuk)
        let angkaMurni = input.value.replace(/[^0-9]/g, '');
        
        // Format ulang pakai koma (Format US/English menggunakan koma untuk ribuan)
        if (angkaMurni) {
            input.value = Number(angkaMurni).toLocaleString('en-US');
        } else {
            input.value = '';
        }
        
        // Panggil fungsi hitung potongan secara realtime
        hitungRealtimePotonganLab();
    }

    // =====================================================================
    // 🧮 FUNGSI BANTUAN: FORMAT RUPIAH OTOMATIS SAAT KETIK
    // =====================================================================
    function formatRupiahInput(inputElem) {
        // Hapus semua karakter selain angka
        let val = inputElem.value.replace(/[^0-9]/g, '');
        // Format dengan pemisah ribuan gaya Indonesia (Titik)
        if (val !== "") {
            inputElem.value = parseInt(val, 10).toLocaleString('id-ID');
        } else {
            inputElem.value = "";
        }
    }

    // =====================================================================
    // 🩺 FUNGSI 1: MENGUNDUH DATA SEBELUM MENGGAMBAR LAYAR
    // =====================================================================
    function initPendapatanDokter() {
        // 🔥 JALUR 2: SATPAM PENDETEKSI OWNER (CLONING DARI GOD MODE)
        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        const roleId = sessionData && sessionData.role ? String(sessionData.role).toLowerCase().trim() : "";
        const roleName = sessionData && sessionData.namaRole ? String(sessionData.namaRole).toLowerCase().trim() : "";
        
        // Logika ini sama persis 100% dengan fungsi aplikasikanHakAkses milik Anda!
        const isSuperAdmin = roleId === "rol-01" || roleName === "super admin" || roleName === "owner" || roleId === "owner";

        if (isSuperAdmin) {
            let jangkar = document.getElementById('filterBulanPendapatanDokter');
            if (jangkar) {
                // Mundur 3 langkah ke kontainer utama halaman
                let kontainerUtama = jangkar.parentElement.parentElement.parentElement; 
                kontainerUtama.innerHTML = `
                    <div style="text-align:center; padding:80px 20px; background:white; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.05); margin-bottom:20px;">
                        <div style="font-size:70px; margin-bottom:15px;">👔</div>
                        <h2 style="color:#2c3e50; margin:0 0 10px 0; font-size:26px;">Halo, Tim Manajemen!</h2>
                        <p style="color:#7f8c8d; font-size:15px; max-width:600px; margin:0 auto 30px auto; line-height:1.6;">
                            Halaman ini adalah area <b>Self-Service</b> yang dirancang khusus bagi para <b>Dokter</b> untuk memantau rincian fee tindakan dan slip gaji mereka masing-masing secara mandiri.<br><br>
                            Untuk melihat analitik klinik dan mengelola slip gaji seluruh dokter, silakan gunakan menu <b>Kokpit Finansial</b>.
                        </p>
                        <button onclick="
                        let tabAnalisis = document.getElementById('tabAnalisisBisnisBtn');
                        let tabBackend = document.getElementById('tabBackendBtn');
                        let subFinansial = document.getElementById('btnSubTabFinansial');
                        let subTabKeuangan = document.getElementById('subTabFinansialBtn');
                        
                        if (tabAnalisis && tabAnalisis.style.display !== 'none') {
                            // Skenario 1: Jika Kokpit Finansial ada di sidebar utama
                            tabAnalisis.click();
                        } else if (subFinansial || subTabKeuangan) {
                            // Skenario 2: Jika Kokpit Finansial adalah Sub-Tab di dalam menu Backend
                            if (tabBackend) tabBackend.click();
                            setTimeout(() => {
                                if (subFinansial) subFinansial.click();
                                else if (subTabKeuangan) subTabKeuangan.click();
                            }, 150);
                        } else {
                            alert('Silakan klik menu Kokpit Finansial / Analisis Bisnis secara manual di sidebar.');
                        }
                    " style="background:#3498db; color:white; border:none; padding:12px 30px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:15px; box-shadow:0 4px 10px rgba(52, 152, 219, 0.3); transition:0.3s;">
                        📊 Buka Kokpit Finansial
                    </button>
                    </div>
                `;
            }
            return; // 🛑 Hentikan proses, jangan download data dokter yang isinya 0
        }

        // ==========================================================
        // KODE ASLI UNTUK DOKTER (Sapu Bersih & Fetch Data)
        // ==========================================================
        let inpBulan = document.getElementById('filterBulanPendapatanDokter');
        if(!inpBulan.value) {
            let tglSekarang = new Date();
            let blnStr = ("0" + (tglSekarang.getMonth() + 1)).slice(-2);
            inpBulan.value = tglSekarang.getFullYear() + "-" + blnStr;
        }

        // "SAPU BERSIH" LAYAR
        if (document.getElementById('cardDokJmlTindakan')) document.getElementById('cardDokJmlTindakan').innerText = "⏳";
        if (document.getElementById('cardDokFeePokok')) document.getElementById('cardDokFeePokok').innerText = "Memuat...";
        if (document.getElementById('cardDokInjeksi')) document.getElementById('cardDokInjeksi').innerHTML = "-";
        if (document.getElementById('cardDokTHP')) document.getElementById('cardDokTHP').innerText = "Menghitung...";
        
        let banner = document.getElementById('bannerStatusSlip');
        if (banner) banner.style.display = 'none'; 
        
        let tbody = document.getElementById('tabelRincianDokterBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px; color:#7f8c8d; font-size:14px;">Mengunduh & menyinkronkan data dari server... ⏳</td></tr>`;

        // =====================================================================
        // 🔥 PANGGIL LAYAR HITAM LOADING DI SINI (Sebelum Fetch dimulai)
        // =====================================================================
        if (typeof tampilkanLoading === "function") tampilkanLoading("⏳ Mengunduh Data Pendapatan & Kalkulasi Slip Gaji...");

        // Unduh Arsip Gaji Terkunci
        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify({ action: "getDaftarSlipTerkunci" }) })
        .then(res => res.json())
        .then(resArsip => {
            window.arsipGajiTerkunci = (resArsip.result === "success") ? resArsip.data : [];
            return fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify({ action: "getBagiHasilDokter" }) });
        })
        .then(resTrx => resTrx.json())
        .then(resTrx => {
            // =====================================================================
            // 🔥 MATIKAN LAYAR HITAM LOADING DI SINI (Data sukses didapat)
            // =====================================================================
            if (typeof sembunyikanLoading === "function") sembunyikanLoading();

            window.rawDataBagiHasil = (resTrx.result === "success") ? resTrx.data : [];
            renderUIKinerjaDokter();
        })
        .catch(err => {
            // =====================================================================
            // 🔥 MATIKAN LAYAR HITAM LOADING JIKA KONEKSI TERPUTUS
            // =====================================================================
            if (typeof sembunyikanLoading === "function") sembunyikanLoading();

            console.error("Gagal menarik data dari server:", err);
            if (document.getElementById('cardDokFeePokok')) document.getElementById('cardDokFeePokok').innerText = "⚠️ Gagal Koneksi";
            if (tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:40px; color:#e74c3c; font-size:14px; font-weight:bold;">❌ Gagal menghubungi server. Silakan muat ulang.</td></tr>`;
        });
    }

    // =====================================================================
    // 🩺 RENDER DATA REAL-TIME / ARSIP PADA DASHBOARD DOKTER
    // =====================================================================
    function renderUIKinerjaDokter() {
        let inpBulan = document.getElementById('filterBulanPendapatanDokter');
        if (!inpBulan) return;
        
        let bulanTerpilih = inpBulan.value; // Format: "YYYY-MM"
        if (!bulanTerpilih) return;

        // 🔥 FIX DINAMIS: Deteksi Nama Dokter Super Aman (Tahan Banting)
        let namaDokterAktif = "Dian"; // Fallback awal
        if (window.currentUser && window.currentUser.nama) {
            namaDokterAktif = window.currentUser.nama;
        } else {
            // Ambil murni dari teks rendered body (Tidak akan terseret kode HTML lain)
            let bodyText = document.body.innerText;
            let match = bodyText.match(/User:\s*([A-Za-z0-9\s]+)/);
            if (match && match[1]) {
                namaDokterAktif = match[1].trim().split('\n')[0].trim();
            }
        }

        // 1. CEK KONDISI A: SLIP SUDAH DIKUNCI
        let dataArsip = null;
        if (window.arsipGajiTerkunci) {
            // Gunakan toLowerCase() agar kebal terhadap salah huruf besar/kecil (Dian vs dian)
            dataArsip = window.arsipGajiTerkunci.find(x => x.namaDokter.toLowerCase() === namaDokterAktif.toLowerCase() && x.periode === bulanTerpilih);
        }

        let banner = document.getElementById('bannerStatusSlip');

        if (dataArsip) {
            // --- MODE SLIP TERKUNCI (HIJAU) ---
            if (banner) {
                banner.style.display = 'flex';
                banner.style.background = '#e8f8f5';
                banner.style.borderLeft = '5px solid #27ae60';
                banner.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:24px;">✅</span>
                        <div>
                            <h4 style="margin:0; color:#27ae60; font-size:16px;">Slip Gaji Telah Diterbitkan!</h4>
                            <p style="margin:2px 0 0 0; color:#2c3e50; font-size:13px;">Data periode ${bulanTerpilih} sudah di-ACC oleh Manajemen dan bersifat final.</p>
                        </div>
                    </div>
                    <button onclick="tampilkanSlipGajiDokter('${dataArsip.namaDokter}', '${bulanTerpilih}')" style="background:#27ae60; color:white; border:none; padding:10px 20px; border-radius:4px; font-weight:bold; cursor:pointer; box-shadow:0 2px 5px rgba(0,0,0,0.2);">📄 Lihat Slip PDF Final</button>
                `;
            }

            let totalPokok = dataArsip.pokokFee || 0;
            let totalBonus = dataArsip.bonus || 0;
            let totalPotong = dataArsip.potongan || 0;
            let netInjeksi = totalBonus - totalPotong;
            let finalTHP = dataArsip.thp || (totalPokok + netInjeksi);

            document.getElementById('cardDokFeePokok').innerText = "Rp " + totalPokok.toLocaleString('id-ID');
            
            // 🔥 LOGIKA BARU: Tampilan Card Bonus & Potongan Terpisah
            let elInjeksi = document.getElementById('cardDokInjeksi');
            if (totalBonus === 0 && totalPotong === 0) {
                elInjeksi.innerHTML = `<span style="color:#9b59b6;">Rp 0</span>`;
            } else if (totalBonus > 0 && totalPotong > 0) {
                // Tampilkan 2 baris (font dikecilkan sedikit jadi 18px agar muat dan rapi)
                elInjeksi.innerHTML = `
                    <div style="color:#27ae60; font-size:18px; margin-bottom:4px;">+ Rp ${totalBonus.toLocaleString('id-ID')}</div>
                    <div style="color:#e74c3c; font-size:18px;">- Rp ${totalPotong.toLocaleString('id-ID')}</div>
                `;
            } else if (totalBonus > 0) {
                elInjeksi.innerHTML = `<span style="color:#27ae60;">+ Rp ${totalBonus.toLocaleString('id-ID')}</span>`;
            } else if (totalPotong > 0) {
                elInjeksi.innerHTML = `<span style="color:#e74c3c;">- Rp ${totalPotong.toLocaleString('id-ID')}</span>`;
            }

            document.getElementById('cardDokTHP').innerText = "Rp " + finalTHP.toLocaleString('id-ID');

            document.getElementById('cardDokFeePokok').innerText = "Rp " + totalPokok.toLocaleString('id-ID');
            // document.getElementById('cardDokInjeksi').innerText = (netInjeksi >= 0 ? "+ Rp " : "- Rp ") + Math.abs(netInjeksi).toLocaleString('id-ID');
            document.getElementById('cardDokTHP').innerText = "Rp " + finalTHP.toLocaleString('id-ID');

            let rincianJson = [];
            try { rincianJson = JSON.parse(dataArsip.rincianJson || "[]"); } catch(e) { rincianJson = dataArsip.rincian || []; }
            renderTabelRincianDokter(rincianJson);

        } else {
            // --- MODE LIVE TRACKING (ORANYE) ---
            if (banner) {
                banner.style.display = 'flex';
                banner.style.background = '#fff3cd';
                banner.style.borderLeft = '5px solid #f39c12';
                banner.innerHTML = `
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:24px;">⏳</span>
                        <div>
                            <h4 style="margin:0; color:#d35400; font-size:16px;">Live Tracking (Periode Berjalan)</h4>
                            <p style="margin:2px 0 0 0; color:#2c3e50; font-size:13px;">Gaji belum final. Angka di bawah adalah estimasi sementara yang akan di-review Manajemen.</p>
                        </div>
                    </div>
                    <div style="color:#f39c12; font-weight:bold; font-size:14px; padding-right:10px;">Masih Berjalan...</div>
                `;
            }

            let dataMentah = window.rawDataBagiHasil || [];
            if (dataMentah.length === 0) {
                document.getElementById('cardDokJmlTindakan').innerText = "0";
                document.getElementById('cardDokFeePokok').innerText = "Rp 0";
                document.getElementById('cardDokInjeksi').innerHTML = `<span style="color:#95a5a6; font-size:16px;">Rp 0 (Belum ACC)</span>`;
                document.getElementById('cardDokTHP').innerText = "Rp 0";
                renderTabelRincianDokter([]);
                return;
            }

            let tahun = parseInt(bulanTerpilih.split('-')[0]);
            let bulan = parseInt(bulanTerpilih.split('-')[1]);
            
            let tglMulai = bulanTerpilih + "-01";
            let lastDay = new Date(tahun, bulan, 0).getDate(); 
            let strLastDay = lastDay < 10 ? '0' + lastDay : lastDay;
            let tglAkhir = bulanTerpilih + "-" + strLastDay;

            let dataTerfilter = dataMentah.filter(item => item.tanggal >= tglMulai && item.tanggal <= tglAkhir);

            let invoiceMap = {};
            dataTerfilter.forEach(item => {
                if (item.jenis !== "LAB") {
                    if (!invoiceMap[item.invoice]) invoiceMap[item.invoice] = { subtotal: 0, diskon: item.diskonInvoice || 0 };
                    invoiceMap[item.invoice].subtotal += (item.hargaAsli || 0);
                }
            });

            let rincianDokter = [];
            dataTerfilter.forEach(item => {
                // Gunakan toLowerCase() pada filter dokter
                if (item.jenis !== "LAB" && item.dokterPelaksana.trim().toLowerCase() === namaDokterAktif.toLowerCase()) {
                    let inv = invoiceMap[item.invoice];
                    let rasio = inv.subtotal > 0 ? (item.hargaAsli / inv.subtotal) : 0;
                    let diskonProrataItem = rasio * inv.diskon;
                    
                    rincianDokter.push({
                        tanggal: item.tanggal, invoice: item.invoice, pasien: item.namaPasien, tindakan: item.namaTindakan,
                        hargaAsli: item.hargaAsli, diskonProrata: diskonProrataItem, hargaLabVendor: 0, feeFinal: 0 
                    });
                }
            });

            dataTerfilter.forEach(item => {
                if (item.jenis === "LAB" && item.dokterPelaksana.trim().toLowerCase() === namaDokterAktif.toLowerCase()) {
                    let namaTindakanAsli = item.namaTindakan.replace("Potongan Lab Vendor: ", "");
                    let match = rincianDokter.find(r => r.invoice === item.invoice && r.tindakan === namaTindakanAsli);
                    if (match) match.hargaLabVendor += (item.bebanPotongan / 0.4);
                }
            });

            let totalBagiHasil = 0;
            rincianDokter.forEach(r => {
                let dasarBagiHasil = r.hargaAsli - r.hargaLabVendor - r.diskonProrata;
                r.feeFinal = dasarBagiHasil * 0.4;
                totalBagiHasil += r.feeFinal;
            });

            document.getElementById('cardDokFeePokok').innerText = "Rp " + totalBagiHasil.toLocaleString('id-ID');
            document.getElementById('cardDokInjeksi').innerHTML = `<span style="color:#95a5a6; font-size:16px;">Rp 0 (Belum ACC)</span>`;
            document.getElementById('cardDokTHP').innerText = "Rp " + totalBagiHasil.toLocaleString('id-ID');
            
            renderTabelRincianDokter(rincianDokter);
        }
    }

    // =====================================================================
    // 📋 AUXILIARY: RENDER BARIS TABEL RINCIAN DOKTER
    // =====================================================================
    function renderTabelRincianDokter(listRincian) {
        let tbody = document.getElementById('tabelRincianDokterBody');
        if (!tbody) return;

        if (!listRincian || listRincian.length === 0) {
            // 🔥 PERBAIKAN 1: Ubah colspan="5" menjadi colspan="9" agar pesan kosong melintang di semua kolom
            tbody.innerHTML = `<tr><td colspan="9" style="padding:40px; text-align:center; color:#95a5a6; font-size:14px;">Belum ada tindakan tercatat pada periode ini.</td></tr>`;
            if (document.getElementById('cardDokJmlTindakan')) document.getElementById('cardDokJmlTindakan').innerText = "0";
            return;
        }

        if (document.getElementById('cardDokJmlTindakan')) {
            document.getElementById('cardDokJmlTindakan').innerText = listRincian.length;
        }

        let html = '';
        // 🔥 PERBAIKAN 2: Tambahkan parameter 'index' di dalam forEach untuk nomor urut
        listRincian.forEach((rin, index) => {
            let hargaAsli = rin.hargaAsli || 0;
            let lab = rin.hargaLabVendor || 0;
            let diskon = rin.diskonProrata || 0;
            
            let dasarBagiHasil = hargaAsli - lab - diskon;
            let feeDokter = rin.feeFinal || (dasarBagiHasil * 0.4);

            // Teks dinamis untuk Lab dan Diskon (Tampil merah jika ada potongan, strip jika nol)
            let txtLab = lab > 0 ? `-${lab.toLocaleString('id-ID')}` : '-';
            let txtDiskon = diskon > 0 ? `-${diskon.toLocaleString('id-ID')}` : '-';

            // 🔥 PERBAIKAN 3: Cetak 9 Kolom sesuai urutan Header HTML
            html += `
                <tr style="border-bottom:1px solid #ecf0f1;">
                    <td style="padding:12px; text-align:center; color:#7f8c8d; font-size:13px;">${index + 1}</td>
                    <td style="padding:12px; color:#7f8c8d; font-size:13px;">${rin.tanggal}</td>
                    <td style="padding:12px; color:#2c3e50; font-weight:bold; font-size:13px;">${rin.pasien}</td>
                    <td style="padding:12px; color:#34495e; font-size:13px;">${rin.tindakan}</td>
                    
                    <td style="padding:12px; text-align:right; color:#7f8c8d; font-size:13px;">${hargaAsli.toLocaleString('id-ID')}</td>
                    <td style="padding:12px; text-align:right; color:#e74c3c; font-size:13px;">${txtLab}</td>
                    <td style="padding:12px; text-align:right; color:#e74c3c; font-size:13px;">${txtDiskon}</td>
                    
                    <td style="padding:12px; text-align:right; font-weight:bold; color:#2980b9; font-size:13px;">${dasarBagiHasil.toLocaleString('id-ID')}</td>
                    <td style="padding:12px; text-align:right; font-weight:bold; color:#27ae60; font-size:13px;">${feeDokter.toLocaleString('id-ID')}</td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    // =====================================================================
    // 🩺 FUNGSI: MENAMPILKAN POP-UP SLIP GAJI (PRINTABLE PDF)
    // =====================================================================
    function tampilkanSlipGajiDokter(nama, periode) {
        if (!window.arsipGajiTerkunci) return alert("Data arsip tidak ditemukan!");
        
        // Cari data arsip berdasarkan nama dan bulan
        let dataArsip = window.arsipGajiTerkunci.find(x => x.namaDokter.toLowerCase() === nama.toLowerCase() && x.periode === periode);
        if (!dataArsip) return alert("Slip belum diterbitkan untuk bulan ini.");

        // Parse JSON rincian untuk menghitung jumlah tindakan
        let rincianArr = [];
        try { rincianArr = JSON.parse(dataArsip.rincianJson || "[]"); } catch(e) {}
        let jmlTindakan = rincianArr.length;

        // Ambil Keterangan Kustom (THR / Kasbon)
        let ketBonus = "Injeksi Bonus / Insentif";
        let ketPotongan = "Pemotongan Lain (Kasbon dll)";
        if (dataArsip.teksKeterangan) {
            let splitKet = dataArsip.teksKeterangan.split(" | Potongan: ");
            if (splitKet.length === 2) {
                ketBonus = splitKet[0].replace("Bonus: ", "") || ketBonus;
                ketPotongan = splitKet[1] || ketPotongan;
            }
        }

        // Buat format rupiah yang rapi
        const rp = (angka) => "Rp " + (angka || 0).toLocaleString('id-ID');

        // Buat elemen Pop-up (Overlay Modal)
        let modalId = 'modalSlipDokterPrint';
        let adaModal = document.getElementById(modalId);
        if (adaModal) adaModal.remove(); // Hapus yang lama jika ada

        let modalHtml = `
            <div id="${modalId}" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); z-index:9999; display:flex; justify-content:center; align-items:flex-start; overflow-y:auto; padding:20px; font-family:Arial, sans-serif;">
                
                <div style="background:white; width:100%; max-width:700px; margin:20px auto; padding:40px; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.5); position:relative;" id="areaPrintSlipDokter">
                    
                    <!-- Tombol Tutup & Print (Disembunyikan saat print pakai CSS khusus) -->
                    <div class="no-print" style="position:absolute; top:20px; right:20px; display:flex; gap:10px;">
                        <button onclick="window.print()" style="background:#3498db; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; font-weight:bold;">🖨️ Cetak / Simpan PDF</button>
                        <button onclick="document.getElementById('${modalId}').remove()" style="background:#e74c3c; color:white; border:none; padding:8px 15px; border-radius:4px; cursor:pointer; font-weight:bold;">✖ Tutup</button>
                    </div>

                    <!-- KOP SLIP GAJI -->
                    <div style="text-align:center; border-bottom:3px solid #2c3e50; padding-bottom:15px; margin-bottom:20px;">
                        <h1 style="margin:0; color:#2c3e50; font-size:24px; text-transform:uppercase; letter-spacing:1px;">KLINIK ANVAYA</h1>
                        <p style="margin:5px 0 0 0; color:#7f8c8d; font-size:14px;">Slip Honorarium & Fee Tindakan Medis</p>
                    </div>

                    <!-- INFO DOKTER -->
                    <table style="width:100%; margin-bottom:20px; font-size:14px; color:#34495e;">
                        <tr><td style="width:150px; font-weight:bold; padding:5px 0;">Nama Dokter</td><td style="width:10px;">:</td><td style="font-weight:bold; color:#2980b9; font-size:16px;">dr. ${dataArsip.namaDokter}</td></tr>
                        <tr><td style="font-weight:bold; padding:5px 0;">Periode Kinerja</td><td>:</td><td>Bulan ${periode}</td></tr>
                        <tr><td style="font-weight:bold; padding:5px 0;">Total Tindakan</td><td>:</td><td>${jmlTindakan} Pasien</td></tr>
                    </table>

                    <!-- TABEL RINCIAN PENDAPATAN -->
                    <table style="width:100%; border-collapse:collapse; margin-bottom:30px; font-size:14px;">
                        <thead>
                            <tr style="background:#ecf0f1; color:#2c3e50; text-align:left;">
                                <th style="padding:10px; border:1px solid #bdc3c7;">Komponen Pendapatan</th>
                                <th style="padding:10px; border:1px solid #bdc3c7; text-align:right;">Nominal (Rp)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="padding:12px; border:1px solid #bdc3c7;"><strong>1. Pokok Fee Tindakan (40%)</strong><br><span style="font-size:12px; color:#7f8c8d;">Berdasarkan tarif bersih setelah potongan lab & diskon.</span></td>
                                <td style="padding:12px; border:1px solid #bdc3c7; text-align:right; font-weight:bold; color:#2c3e50;">${rp(dataArsip.pokokFee)}</td>
                            </tr>
                            <tr>
                                <td style="padding:12px; border:1px solid #bdc3c7;"><strong>2. Penambahan / Bonus</strong><br><span style="font-size:12px; color:#7f8c8d;">Keterangan: ${ketBonus}</span></td>
                                <td style="padding:12px; border:1px solid #bdc3c7; text-align:right; color:#27ae60;">${dataArsip.bonus > 0 ? "+ " + rp(dataArsip.bonus) : "-"}</td>
                            </tr>
                            <tr>
                                <td style="padding:12px; border:1px solid #bdc3c7;"><strong>3. Pemotongan</strong><br><span style="font-size:12px; color:#7f8c8d;">Keterangan: ${ketPotongan}</span></td>
                                <td style="padding:12px; border:1px solid #bdc3c7; text-align:right; color:#e74c3c;">${dataArsip.potongan > 0 ? "- " + rp(dataArsip.potongan) : "-"}</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr style="background:#2c3e50; color:white;">
                                <td style="padding:15px; border:1px solid #2c3e50; text-align:right; font-size:16px; font-weight:bold; text-transform:uppercase;">Total Take Home Pay :</td>
                                <td style="padding:15px; border:1px solid #2c3e50; text-align:right; font-size:18px; font-weight:bold; color:#2ecc71;">${rp(dataArsip.thp)}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <!-- FOOTER / TTD -->
                    <div style="display:flex; justify-content:space-between; margin-top:40px; font-size:14px; color:#2c3e50;">
                        <div style="text-align:center;">
                            <p style="margin-bottom:60px;">Penerima,</p>
                            <p style="font-weight:bold; border-bottom:1px solid #2c3e50; display:inline-block; padding:0 20px;">dr. ${dataArsip.namaDokter}</p>
                        </div>
                        <div style="text-align:center;">
                            <p style="margin-bottom:60px;">Manajemen / Keuangan,</p>
                            <p style="font-weight:bold; border-bottom:1px solid #2c3e50; display:inline-block; padding:0 20px;">Klinik Anvaya</p>
                        </div>
                    </div>
                </div>
                
                <!-- CSS ini bertugas "menyembunyikan" background hitam & tombol saat di-print PDF -->
                <style>
                    @media print {
                        body * { visibility: hidden; }
                        #areaPrintSlipDokter, #areaPrintSlipDokter * { visibility: visible; }
                        #areaPrintSlipDokter { position: absolute; left: 0; top: 0; margin:0; padding:0; box-shadow:none; width:100%; }
                        .no-print { display: none !important; }
                    }
                </style>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }  
    
    // ==========================================
    // 🛠️ MESIN CRUD MASTER TINDAKAN
    // ==========================================
    window.dataMasterTindakanGlobal = window.dataMasterTindakanGlobal || [];
    let currentPageTindakan = 1;
    const rowsPerPageTindakan = 50; // Render 50 baris per halaman agar browser tidak hang

    // Tambahkan parameter "forceRefresh"
    function initMasterTindakan(forceRefresh = false) {
        let tbody = document.getElementById('tabelMasterTindakanBody');

        // 🔥 THE SMART CACHE: Jika data sudah ada di memori dan tidak dipaksa refresh, pakai memori!
        if (!forceRefresh && window.dataMasterTindakanGlobal && window.dataMasterTindakanGlobal.length > 0) {
            console.log("⚡ Memuat Master Tindakan dari Cache Memory (Instan!)");
            currentPageTindakan = 1;
            renderTabelMasterTindakan();
            return; // Hentikan eksekusi, jangan ganggu server Google!
        }

        if(tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:#7f8c8d; font-weight:bold;">Mengunduh Master Data Tindakan dari server... ⏳</td></tr>`;
        
        // Panggil layar hitam loading agar layar tidak bisa di-klik sembarangan
        if (typeof tampilkanLoading === "function") tampilkanLoading("⏳ Menyinkronkan ratusan data Master Tindakan...");

        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify({ action: "getAllMasterTindakan" }) })
        .then(res => res.json())
        .then(res => {
            if (typeof sembunyikanLoading === "function") sembunyikanLoading();
            
            if (res.result === "success") {
                window.dataMasterTindakanGlobal = res.data;
                currentPageTindakan = 1; // Reset halaman
                renderTabelMasterTindakan();
            } else {
                alert("Gagal: " + res.message);
            }
        })
        .catch(err => {
            if (typeof sembunyikanLoading === "function") sembunyikanLoading();
            console.error(err);
            if(tbody) tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:#e74c3c; font-weight:bold;">⚠️ Gagal koneksi ke server. Silakan klik tombol Segarkan.</td></tr>`;
        });
    }

    function renderTabelMasterTindakan(resetHalaman = false) {
        if (resetHalaman) currentPageTindakan = 1;

        let cari = document.getElementById('cariTindakan').value.toLowerCase();
        let statusFilter = document.getElementById('filterStatusTindakan').value;
        let tbody = document.getElementById('tabelMasterTindakanBody');
        let paginationDiv = document.getElementById('paginationControlsTindakan');
        
        // 1. FILTERING INSTAN DI MEMORI RAM (Sangat Cepat)
        let terfilter = window.dataMasterTindakanGlobal.filter(t => {
            let matchCari = t.namaTindakan.toLowerCase().includes(cari) || t.kategori.toLowerCase().includes(cari);
            let matchStatus = (statusFilter === 'Semua') ? true : (t.status === statusFilter);
            return matchCari && matchStatus;
        });

        if (terfilter.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:30px; color:#95a5a6; font-weight:bold;">Data tidak ditemukan.</td></tr>`;
            if (paginationDiv) paginationDiv.style.display = 'none';
            return;
        }

        // 2. PEMOTONGAN DATA (PAGINATION) UNTUK MENCEGAH BROWSER HANG
        if (paginationDiv) paginationDiv.style.display = 'block';

        const totalPages = Math.ceil(terfilter.length / rowsPerPageTindakan);
        if (currentPageTindakan > totalPages) currentPageTindakan = totalPages;

        const startIndex = (currentPageTindakan - 1) * rowsPerPageTindakan;
        const endIndex = startIndex + rowsPerPageTindakan;
        const paginatedItems = terfilter.slice(startIndex, endIndex);

        let html = '';
        paginatedItems.forEach((t, i) => {
            let actualIndex = startIndex + i + 1; // Penomoran asli berlanjut
            
            let badgeStatus = t.status === 'Aktif' 
                ? `<span style="background:#d4efdf; color:#27ae60; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;">Aktif</span>` 
                : `<span style="background:#fadbd8; color:#c0392b; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;">Nonaktif</span>`;
                
            let strConsent = String(t.butuhConsent).toLowerCase().trim();
            let strLab = String(t.butuhLab).toLowerCase().trim();
            
            let icnConsent = (t.butuhConsent == 1 || strConsent === "ya" || strConsent === "true") ? "📝 Ya" : "-";
            let icnLab = (t.butuhLab == 1 || strLab === "ya" || strLab === "true") ? "🧪 Ya" : "-";

            let hargaMaksTxt = (t.hargaMaksimal && Number(t.hargaMaksimal) > 0) 
                ? `Rp ${Number(t.hargaMaksimal).toLocaleString('id-ID')}` 
                : `-`;

            html += `
                <tr style="border-bottom: 1px solid #ecf0f1;">
                    <td style="padding:12px 10px; font-size:13px; color:#7f8c8d;">${actualIndex}</td>
                    <td style="padding:12px 10px; font-size:13px; font-weight:bold; color:#2c3e50;">${t.namaTindakan}</td>
                    <td style="padding:12px 10px; font-size:13px; color:#34495e;">${t.kategori}</td>
                    <td style="padding:12px 10px; font-size:13px; font-weight:bold; color:#2980b9; text-align:right;">Rp ${Number(t.hargaDasar).toLocaleString('id-ID')}</td>
                    <td style="padding:12px 10px; font-size:13px; color:#7f8c8d; text-align:right;">${hargaMaksTxt}</td>
                    <td style="padding:12px 10px; font-size:13px; text-align:center; color:#e67e22;">${icnConsent}</td>
                    <td style="padding:12px 10px; font-size:13px; text-align:center; color:#9b59b6;">${icnLab}</td>
                    <td style="padding:12px 10px; text-align:center;">${badgeStatus}</td>
                    <td style="padding:12px 10px; text-align:center;">
                        <button onclick="bukaModalTindakan('${t.idTindakan}')" style="background:#f39c12; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.1);">✏️ Edit</button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        // 3. UPDATE TAMPILAN KONTROL HALAMAN
        let pageInfo = document.getElementById('pageInfoTindakan');
        if (pageInfo) pageInfo.innerText = `Halaman ${currentPageTindakan} dari ${totalPages}`;
        
        let btnPrev = document.getElementById('btnPrevTindakan');
        let btnNext = document.getElementById('btnNextTindakan');
        if (btnPrev) btnPrev.disabled = (currentPageTindakan === 1);
        if (btnNext) btnNext.disabled = (currentPageTindakan === totalPages);
    }

    // 🔥 FUNGSI BARU UNTUK NAVIGASI HALAMAN
    function ubahHalamanTindakan(step) {
        currentPageTindakan += step;
        renderTabelMasterTindakan(false); // Render ulang tanpa me-reset halaman ke 1
    }

    // ==========================================
    // 🔄 TIMPA FUNGSI BUKA MODAL INI
    // ==========================================
    function bukaModalTindakan(id) {
        document.getElementById('inpTindakanId').value = id;
        
        // 🔥 MESIN DROPDOWN KATEGORI (VERSI DOM MANIPULATION / ANTI-MALAS)
        let datalist = document.getElementById('listKategoriTindakan');
        if (datalist && window.dataMasterTindakanGlobal) {
            // 1. Kosongkan isi datalist agar opsi tidak menumpuk dobel saat diklik berulang kali
            datalist.innerHTML = ''; 
            
            // 2. Ambil data, bersihkan spasi nyasar, buang yang kosong, & hilangkan duplikat
            let listBersih = window.dataMasterTindakanGlobal
                .map(item => item.kategori ? String(item.kategori).trim() : '')
                .filter(kat => kat !== '');
            let unikKategori = [...new Set(listBersih)];
            
            // 3. Paksa browser membaca opsi dengan membuat "Elemen Fisik" secara langsung
            unikKategori.forEach(kat => {
                let opt = document.createElement('option');
                opt.value = kat; // Nilai yang akan tersimpan
                opt.text = kat;  // 🔥 Teks yang wajib muncul agar terbaca oleh mesin Safari/Chrome
                datalist.appendChild(opt);
            });
        }

        if (id === '') {
            // MODE TAMBAH BARU
            document.getElementById('judulModalTindakan').innerText = "✨ Tambah Tindakan Baru";
            document.getElementById('inpTindakanNama').value = "";
            document.getElementById('inpTindakanKategori').value = "";
            document.getElementById('inpTindakanHarga').value = "";
            document.getElementById('inpTindakanMaks').value = "";
            document.getElementById('inpTindakanKet').value = "";
            document.getElementById('inpTindakanConsent').value = "Tidak";
            document.getElementById('inpTindakanLab').value = "Tidak";
            document.getElementById('inpTindakanStatus').value = "Aktif";
        } else {
            // MODE EDIT DATA
            document.getElementById('judulModalTindakan').innerText = "✏️ Edit Tindakan";
            let data = window.dataMasterTindakanGlobal.find(x => x.idTindakan === id);
            if(data) {
                document.getElementById('inpTindakanNama').value = data.namaTindakan;
                document.getElementById('inpTindakanKategori').value = data.kategori;
                
                // Load harga lama, beri titik ribuan sebelum ditampilkan
                document.getElementById('inpTindakanHarga').value = Number(data.hargaDasar).toLocaleString('id-ID');
                document.getElementById('inpTindakanMaks').value = (data.hargaMaksimal && Number(data.hargaMaksimal) > 0) ? Number(data.hargaMaksimal).toLocaleString('id-ID') : "";
                
                document.getElementById('inpTindakanKet').value = data.keterangan || "";
                
                let strConsent = String(data.butuhConsent).toLowerCase().trim();
                let strLab = String(data.butuhLab).toLowerCase().trim();
                document.getElementById('inpTindakanConsent').value = (data.butuhConsent == 1 || strConsent === "ya" || strConsent === "true") ? "Ya" : "Tidak";
                document.getElementById('inpTindakanLab').value = (data.butuhLab == 1 || strLab === "ya" || strLab === "true") ? "Ya" : "Tidak";
                document.getElementById('inpTindakanStatus').value = data.status || "Aktif";
            }
        }
        document.getElementById('modalMasterTindakan').style.display = 'flex';
    }

    // ==========================================
    // 🔄 TIMPA FUNGSI SIMPAN TINDAKAN BARU
    // ==========================================
    function simpanMasterTindakan() {
        let hargaMentah = document.getElementById('inpTindakanHarga').value.replace(/[^0-9]/g, '');
        let maksMentah = document.getElementById('inpTindakanMaks').value.replace(/[^0-9]/g, '');

        let valConsent = document.getElementById('inpTindakanConsent').value === 'Ya' ? 1 : 0;
        let valLab = document.getElementById('inpTindakanLab').value === 'Ya' ? 1 : 0;
        
        if (!window.tokenMasterTindakan) {
            window.tokenMasterTindakan = "MST-" + new Date().getTime() + "-" + Math.floor(Math.random() * 1000);
        }

        let payload = {
            idTindakan: document.getElementById('inpTindakanId').value,
            namaTindakan: document.getElementById('inpTindakanNama').value.trim(),
            kategori: document.getElementById('inpTindakanKategori').value.trim(),
            hargaDasar: Number(hargaMentah) || 0,
            hargaMaksimal: Number(maksMentah) || 0,
            keterangan: document.getElementById('inpTindakanKet').value,
            butuhConsent: valConsent, 
            butuhLab: valLab,         
            status: document.getElementById('inpTindakanStatus').value,
            tokenId: window.tokenMasterTindakan 
        };

        // 🔥 PERBAIKAN BUG HARGA 0: Kita cek 'hargaMentah === ""', bukan nilai angkanya.
        // Jadi jika User mengetik angka "0", sistem akan menganggapnya ada isinya dan meloloskannya!
        if (!payload.namaTindakan || !payload.kategori || hargaMentah === "") {
            alert("⚠️ Nama Tindakan, Kategori, dan Harga Dasar wajib diisi! (Ketik angka 0 jika gratis)"); 
            return;
        }

        document.getElementById('btnSimpanTindakan').innerText = "Menyimpan... ⏳";
        document.getElementById('btnSimpanTindakan').disabled = true;

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "simpanMasterTindakan", payload: payload })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                document.getElementById('modalMasterTindakan').style.display = 'none';

                // =====================================================================
                // 🔥 FITUR BARU: OPTIMISTIC UI UPDATE (REAKTIF 0 DETIK)
                // Memperbarui memori RAM secara instan tanpa menunggu loading dari server
                // =====================================================================
                if (typeof window.dataMasterTindakanGlobal !== "undefined") {
                    let indexDicari = -1;
                    if (payload.idTindakan) {
                        indexDicari = window.dataMasterTindakanGlobal.findIndex(t => String(t.idTindakan) === String(payload.idTindakan));
                    } else {
                        // Jika ID kosong, cari berdasarkan nama
                        indexDicari = window.dataMasterTindakanGlobal.findIndex(t => t.namaTindakan.toLowerCase() === payload.namaTindakan.toLowerCase());
                    }

                    if (indexDicari !== -1) {
                        // MODE EDIT: Timpa data lama dengan data baru di RAM
                        window.dataMasterTindakanGlobal[indexDicari].namaTindakan = payload.namaTindakan;
                        window.dataMasterTindakanGlobal[indexDicari].kategori = payload.kategori;
                        window.dataMasterTindakanGlobal[indexDicari].hargaDasar = payload.hargaDasar;
                        window.dataMasterTindakanGlobal[indexDicari].hargaMaksimal = payload.hargaMaksimal;
                        window.dataMasterTindakanGlobal[indexDicari].butuhConsent = payload.butuhConsent;
                        window.dataMasterTindakanGlobal[indexDicari].butuhLab = payload.butuhLab;
                        window.dataMasterTindakanGlobal[indexDicari].status = payload.status;
                        window.dataMasterTindakanGlobal[indexDicari].keterangan = payload.keterangan;
                    } else {
                        // MODE TAMBAH BARU: Sisipkan data baru di urutan paling atas RAM
                        window.dataMasterTindakanGlobal.unshift(payload);
                    }

                    // Render ulang tabel seketika tanpa menunggu!
                    if (typeof renderTabelMasterTindakan === "function") {
                        renderTabelMasterTindakan(false);
                    }
                }
                // =====================================================================

                alert("✅ Master Tindakan berhasil disimpan!");
                window.tokenMasterTindakan = null;
                
                // Proses download server (init) tetap berjalan di background secara diam-diam
                if (typeof initMasterTindakan === "function") initMasterTindakan(); 
            } else {
                alert("Gagal menyimpan: " + res.message);
            }
        })
        .catch(err => {
            console.error(err);
            document.getElementById('btnSimpanTindakan').innerText = "Koneksi Terputus...";
            alert("⚠️ KONEKSI TERPUTUS!\n\nJangan klik simpan berulang kali. Data Anda kemungkinan sudah masuk ke sistem.\n\nTabel akan dimuat ulang untuk memastikannya.");
            
            document.getElementById('modalMasterTindakan').style.display = 'none';
            if (typeof initMasterTindakan === "function") initMasterTindakan(); 
        })
        .finally(() => {
            setTimeout(() => {
                document.getElementById('btnSimpanTindakan').innerText = "💾 Simpan Data";
                document.getElementById('btnSimpanTindakan').disabled = false;
            }, 3000);
        });
    }

    // ==========================================
    // 🔥 FUNGSI BARU: SENSOR TITIK RUPIAH OTOMATIS
    // ==========================================
    function formatRibuanTindakan(input) {
        // 1. Hapus semua huruf/simbol, sisakan angka saja
        let angkaMurni = input.value.replace(/[^0-9]/g, ''); 
        if (angkaMurni === "") {
            input.value = "";
            return;
        }
        // 2. Pasang kembali titik ribuannya menggunakan standar Indonesia
        input.value = parseInt(angkaMurni, 10).toLocaleString('id-ID'); 
    }

    // =========================================================================
    // 🔥 FITUR BARU: TOGGLE HIDE/SHOW HISTORI RME (RESPONSIVE)
    // =========================================================================
    function toggleHistoriRME() {
        const panelInput = document.getElementById('kolomInputRME');
        const panelHistori = document.getElementById('kolomHistoriRME');
        const btnToggle = document.getElementById('btnToggleHistori');
        
        // Cek status saat ini (apakah sedang disembunyikan?)
        const isHidden = panelHistori.style.display === 'none';
        
        if (isHidden) {
            // 📖 TAMPILKAN KEMBALI HISTORI (Split Screen)
            panelHistori.style.display = 'block'; 
            panelInput.style.flex = '0 0 55%'; // Kembalikan porsi kiri ke 55%
            panelInput.style.borderRight = '2px solid #bdc3c7'; // Munculkan garis pembatas
            
            btnToggle.innerHTML = '👁️ Sembunyikan Histori';
            btnToggle.style.backgroundColor = '#34495e'; // Warna abu gelap
        } else {
            // 👁️ SEMBUNYIKAN HISTORI (Full Screen Input)
            panelHistori.style.display = 'none';
            panelInput.style.flex = '1 1 100%'; // Paksa kolom kiri melebar 100%
            panelInput.style.borderRight = 'none'; // Hilangkan garis pembatas
            
            btnToggle.innerHTML = '📖 Tampilkan Histori';
            btnToggle.style.backgroundColor = '#2980b9'; // Ubah warna jadi biru terang agar dokter ingat bisa membukanya lagi
        }
    }

    // =========================================================================
    // 🔥 REMOTE CONTROL: GLOBAL LOADING OVERLAY
    // =========================================================================
    function tampilkanLoading(pesan = "⏳ Sedang Memproses Data...") {
        const overlay = document.getElementById('globalSpinnerOverlay');
        const teks = document.getElementById('globalSpinnerText');
        if (overlay && teks) {
            teks.innerText = pesan;
            overlay.style.display = 'flex'; // Munculkan layar hitam
        }
    }

    function sembunyikanLoading() {
        const overlay = document.getElementById('globalSpinnerOverlay');
        if (overlay) {
            overlay.style.display = 'none'; // Sembunyikan layar hitam
        }
    }
    // =========================================================================

    // =========================================================================
    // 🔥 MESIN SMART AUTOCOMPLETE ICD-10 (CHIP / TAG UI)
    // =========================================================================
    window.masterICD = [];
    window.diagnosaTerpilih = []; // Memori penyimpan daftar diagnosa di layar

    document.addEventListener("DOMContentLoaded", function() {
        fetch('https://raw.githubusercontent.com/fendis0709/icd-10/master/master_icd_x.json')
            .then(response => response.json())
            .then(data => {
                window.masterICD = data;
                console.log("✅ 52.347 Data ICD-10 Berhasil Dimuat ke Memori Browser!");
            })
            .catch(err => console.error("Gagal memuat database ICD-10:", err));
    });

    // 1. FUNGSI MENGGAMBAR CHIP (KAPSUL) DI LAYAR
    function renderChipDiagnosa() {
        const tempatChip = document.getElementById('tempatChipDiagnosa');
        const textareaDB = document.getElementById('modalDiagnosa'); // Textarea tersembunyi
        
        tempatChip.innerHTML = ""; // Bersihkan layar
        
        window.diagnosaTerpilih.forEach((diag, index) => {
            const chip = document.createElement('div');
            chip.style.display = "flex";
            chip.style.justifyContent = "space-between";
            chip.style.alignItems = "center";
            chip.style.background = "#fff";
            chip.style.border = "1px solid #dcdde1";
            chip.style.padding = "8px 12px";
            chip.style.borderRadius = "4px";
            chip.style.fontSize = "13px";
            chip.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)";
            chip.style.borderLeft = "4px solid #3498db";
            
            const teks = document.createElement('span');
            teks.innerText = diag;
            teks.style.flex = "1";
            teks.style.fontWeight = "500";
            teks.style.color = "#2c3e50";
            
            // 🔥 TOMBOL X UNTUK MENGHAPUS INSTAN TANPA BACKSPACE
            const btnHapus = document.createElement('button');
            btnHapus.innerHTML = "❌ Hapus";
            btnHapus.style.background = "#ffeaa7";
            btnHapus.style.color = "#d35400";
            btnHapus.style.border = "none";
            btnHapus.style.borderRadius = "4px";
            btnHapus.style.cursor = "pointer";
            btnHapus.style.fontSize = "11px";
            btnHapus.style.fontWeight = "bold";
            btnHapus.style.padding = "4px 8px";
            
            btnHapus.onclick = function() {
                window.diagnosaTerpilih.splice(index, 1); // Hapus dari memori
                renderChipDiagnosa(); // Gambar ulang secara otomatis!
            };
            
            chip.appendChild(teks);
            chip.appendChild(btnHapus);
            tempatChip.appendChild(chip);
        });

        // 2. SINKRONISASI KE DATABASE (Pindahkan data visual ke textarea tersembunyi)
        if (textareaDB) {
            textareaDB.value = window.diagnosaTerpilih.join('\n');
        }
    }

    // 3. FUNGSI KETIKA USER MEMILIH ATAU MENGINPUT DIAGNOSA
    function pilihICD(teksDiagnosa) {
        const inputCari = document.getElementById('inputCariDiagnosa');
        const dropdownIcd = document.getElementById('icdDropdown');
        
        // =====================================================================
        // 🔥 FITUR BARU: SMART CUSTOM TAGGING
        // Mengecek apakah inputan adalah kode ICD asli atau ketikan bebas/dikte
        // Kode ICD asli selalu memiliki format "K00.0 - Nama Penyakit"
        // =====================================================================
        if (!teksDiagnosa.includes(" - ")) {
            // Jika tidak ada tanda " - ", berarti ini ketikan bebas / dikte custom
            // Kita ubah bentuknya agar rapi saat menjadi Chip Kapsul
            teksDiagnosa = "📝 CUSTOM - " + teksDiagnosa.charAt(0).toUpperCase() + teksDiagnosa.slice(1);
        }

        // Mencegah duplikasi diagnosa yang persis sama di 1 pasien
        if (!window.diagnosaTerpilih.includes(teksDiagnosa)) {
            window.diagnosaTerpilih.push(teksDiagnosa);
            renderChipDiagnosa(); // Gambar ulang UI Kapsulnya
        }
        
        if (inputCari) {
            inputCari.value = ""; // Langsung bersihkan kotak pencarian agar siap dicari lagi
            inputCari.focus();
        }
        if (dropdownIcd) dropdownIcd.style.display = 'none';
    }

    // 4. FUNGSI SINKRONISASI SAAT BUKA FITUR "EDIT HISTORI" MASA LALU
    function sinkronisasiChipDiagnosa() {
        const textareaDB = document.getElementById('modalDiagnosa');
        if (textareaDB && textareaDB.value.trim() !== "") {
            window.diagnosaTerpilih = textareaDB.value.split('\n').map(item => item.trim()).filter(item => item !== "");
        } else {
            window.diagnosaTerpilih = [];
        }
        renderChipDiagnosa();
    }

    // 5. PENDETEKSI KETIKAN PENCARIAN
    document.addEventListener('input', function(e) {
        if (e.target && e.target.id === 'inputCariDiagnosa') {
            const keyword = e.target.value.toLowerCase().trim();
            const dropdownIcd = document.getElementById('icdDropdown');
            
            if (keyword.length < 3) {
                dropdownIcd.style.display = 'none';
                return; 
            }

            if (window.masterICD.length === 0) {
                dropdownIcd.innerHTML = '<div style="padding: 10px; font-size: 13px; color: #e67e22;">⏳ Sedang mengunduh database medis... Coba lagi dalam 3 detik.</div>';
                dropdownIcd.style.display = 'block';
                return;
            }

            let hasilCari = window.masterICD.filter(item => 
                (item.nama_icd && item.nama_icd.toLowerCase().includes(keyword)) ||
                (item.nama_icd_indo && item.nama_icd_indo.toLowerCase().includes(keyword)) ||
                (item.kode_icd && item.kode_icd.toLowerCase().includes(keyword))
            );

            // Filter pintar gigi ditaruh paling atas
            hasilCari.sort((a, b) => {
                const isGigiA = a.kode_icd.startsWith('K0') || a.kode_icd.startsWith('K1');
                const isGigiB = b.kode_icd.startsWith('K0') || b.kode_icd.startsWith('K1');
                if (isGigiA && !isGigiB) return -1;
                if (!isGigiA && isGigiB) return 1;
                return 0;
            });

            const hasilFinal = hasilCari.slice(0, 20);

            dropdownIcd.innerHTML = '';
            if (hasilFinal.length > 0) {
                hasilFinal.forEach(item => {
                    let div = document.createElement('div');
                    div.style.padding = '8px 12px';
                    div.style.borderBottom = '1px solid #f1f2f6';
                    div.style.cursor = 'pointer';
                    div.style.fontSize = '12px';
                    div.style.color = '#2f3640';
                    
                    div.onmouseover = function() { this.style.backgroundColor = '#f1f2f6'; }
                    div.onmouseout = function() { this.style.backgroundColor = 'transparent'; }
                    
                    let teksTampil = item.nama_icd_indo && item.nama_icd_indo !== "-" ? item.nama_icd_indo : item.nama_icd;
                    div.innerHTML = `<strong style="color: #c0392b;">${item.kode_icd}</strong> - ${teksTampil}<br><small style="color:#7f8c8d;">${item.nama_icd}</small>`;
                    
                    div.addEventListener('click', function() {
                        pilihICD(`${item.kode_icd} - ${teksTampil}`);
                    });
                    
                    dropdownIcd.appendChild(div);
                });
                dropdownIcd.style.display = 'block';
            } else {
                dropdownIcd.innerHTML = '<div style="padding: 10px; color: #e74c3c; font-size: 13px;">❌ Penyakit tidak ditemukan dalam database. (Jika ingin menambahkan custom, tekan ENTER saja)</div>';
                dropdownIcd.style.display = 'block';
            }
        }
    });

    // 6. PENUTUP DROPDOWN OTOMATIS
    document.addEventListener('click', function(e) {
        const inputCari = document.getElementById('inputCariDiagnosa');
        const dropdownIcd = document.getElementById('icdDropdown');
        if (dropdownIcd && e.target !== inputCari && e.target !== dropdownIcd) {
            dropdownIcd.style.display = 'none';
        }
    });
    // =========================================================================
    

    // === AUTO-SET BULAN SAAT INI (UX Enhancement) ===
    document.addEventListener("DOMContentLoaded", function() {
        const inputFinansial = document.getElementById('filterBulanFinansial');
        if (inputFinansial) {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            inputFinansial.value = `${yyyy}-${mm}`; // Set default ke bulan ini
        }
    });
