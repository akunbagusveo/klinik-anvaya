// =========================================================================
// 📝 MODUL PENDAFTARAN PASIEN
// =========================================================================
(function() {

    // --- 1. VARIABEL PRIVAT MODUL ---
    let cacheMasterPasien = []; // Memori penampung di RAM Browser

    // =====================================================================
    // 2. FORM PENDAFTARAN PASIEN SUBMIT (DIBUNGKUS AMAN)
    // =====================================================================
    window.addEventListener('load', function() {
        const formPasien = document.getElementById('formPasien');
        if (formPasien) {
            formPasien.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // 🔥 SATPAM VALIDASI: Pastikan staf sudah memilih Jenis Pasien
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

                // 🔥 BENTENG 1: BLOKIR KETIK MANUAL TANGGAL MASA LALU
                const hariIniStr = new Date().toLocaleDateString('en-CA'); 
                if (tglKunjunganVal < hariIniStr) {
                    alert("🚫 TANGGAL TIDAK VALID!\n\nAnda memasukkan tanggal di masa lalu. Secara logika, pendaftaran baru tidak bisa mundur ke hari kemarin.");
                    return; 
                }

                // 🔥 BENTENG 2: ANTI DOUBLE-BOOKING (THE ULTIMATE RADAR)
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
                        if (typeof window.updateDaftarDokter === "function") window.updateDaftarDokter();
                        return; 
                    }
                }

                const submitBtn = e.target.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = true; 
                    submitBtn.innerText = "Mengirim...";
                }

                if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Menyimpan Data Pendaftaran ke Database...");

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
                    noRM: tipePasienAktif === "baru" ? "" : (document.getElementById('txtNoRM') ? document.getElementById('txtNoRM').value : ""),
                    nama: document.getElementById('nama') ? document.getElementById('nama').value : "",
                    ktp: document.getElementById('txtKTP') ? document.getElementById('txtKTP').value : "", 
                    tempatLahir: document.getElementById('tempatLahir') ? document.getElementById('tempatLahir').value : "",
                    tanggalLahir: document.getElementById('tanggalLahir') ? document.getElementById('tanggalLahir').value : "", 
                    gender: document.querySelector('input[name="gender"]:checked') ? document.querySelector('input[name="gender"]:checked').value : "", 
                    whatsapp: document.getElementById('whatsapp') ? document.getElementById('whatsapp').value : "", 
                    pekerjaan: document.getElementById('pekerjaan') ? document.getElementById('pekerjaan').value : "",
                    email: document.getElementById('email') ? document.getElementById('email').value : "",
                    alamat: document.getElementById('alamat') ? document.getElementById('alamat').value : "",
                    kecamatan: document.getElementById('kecamatan') ? document.getElementById('kecamatan').value : "",
                    kota: document.getElementById('kota') ? document.getElementById('kota').value : "", 
                    tglKunjungan: tglKunjunganVal,
                    waktuKunjungan: waktuKunjunganVal,
                    tujuan: document.getElementById('tujuan') ? document.getElementById('tujuan').value : "", 
                    riwayatAlergi: document.getElementById('riwayatAlergi') ? document.getElementById('riwayatAlergi').value : "",
                    riwayatObat: document.getElementById('riwayatObat') ? document.getElementById('riwayatObat').value : "",
                    idDokter: idDokterVal,
                    statusBayar: "Belum Lunas",
                    operatorUsername: usernameAktif, 
                    operatorRole: roleAktif          
                };

                fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(data) })
                .then(response => response.json())
                .then(res => {
                    if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();

                    if (submitBtn) {
                        submitBtn.disabled = false; 
                        submitBtn.innerText = "Kirim & Simpan Pendaftaran";
                    }
                    
                    if(res.result === "success") {
                        alert("🎉 Pendaftaran berhasil disimpan ke data master klinik!");
                        formPasien.reset();
                        
                        window.tokenPendaftaranUnik = "TX-" + new Date().getTime() + "-" + Math.floor(Math.random() * 10000);
                        
                        if(typeof window.resetFormKePosisiNetral === "function") window.resetFormKePosisiNetral();
                        if(typeof window.aturStatusProteksiForm === "function") window.aturStatusProteksiForm(false); 
                        if(typeof window.muatAntreanHariIni === "function") window.muatAntreanHariIni(1);
                    } else { 
                        alert("❌ Gagal menyimpan ke Sheets: " + (res.message || "Error tidak diketahui")); 
                    }
                })
                .catch(err => {
                    if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();

                    if (submitBtn) submitBtn.innerText = "Koneksi Terputus...";
                    alert("⚠️ KONEKSI TERPUTUS SAAT MENGIRIM!\n\nJangan panik atau klik simpan ulang. Data Anda kemungkinan besar SUDAH MASUK ke server.\n\nSistem akan memuat ulang antrean untuk memastikannya. Silakan cek tabel Antrean setelah ini.");
                    
                    if(typeof window.muatAntreanHariIni === "function") window.muatAntreanHariIni(1);
                    console.error("Error submit pendaftaran:", err);
                    
                    setTimeout(() => {
                        if (submitBtn) {
                            submitBtn.disabled = false; 
                            submitBtn.innerText = "Kirim & Simpan Pendaftaran";
                        }
                    }, 5000);
                });
            });
        }
    });

    // =====================================================================
    // 3. MESIN PENCARIAN PASIEN LAMA (FRONTEND CACHING)
    // =====================================================================
    window.bukaModalCariPasien = function() {
        const modal = document.getElementById('modalCariPasienLama');
        const spinner = document.getElementById('spinnerCariPasien');
        const areaTabel = document.getElementById('areaTabelCariPasien');
        const inputCari = document.getElementById('inputCariModalPasien');
        
        if (!modal || !spinner || !areaTabel || !inputCari) {
            alert("⚠️ Gagal membuka jendela pencarian: Struktur HTML Modal belum terpasang dengan benar di index.html!");
            return;
        }
        
        modal.style.display = 'flex';
        inputCari.value = '';
        document.getElementById('bodyTabelCariPasien').innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #888;">Silakan ketik nama pasien di kotak pencarian atas.</td></tr>';
        
        if (cacheMasterPasien.length > 0) {
            inputCari.focus();
            return;
        }

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
    };

    window.tutupModalPasien = function() {
        const modal = document.getElementById('modalCariPasienLama');
        if (modal) modal.style.display = 'none';
    };

    window.filterPasienDariCache = function() {
        const inputCari = document.getElementById('inputCariModalPasien');
        if (!inputCari) return;

        const kataKunci = inputCari.value.toLowerCase().trim();
        const tbody = document.getElementById('bodyTabelCariPasien');

        if (kataKunci.length < 1) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: #888;">Silakan ketik nama pasien di kotak pencarian atas.</td></tr>';
            return;
        }

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

        let html = "";
        hasil.slice(0, 15).forEach(p => {
            let noRM   = p.noRM || p[0] || "-";
            let nama   = p.namaPasien || p.nama || p[1] || "-";
            let tgl    = p.tanggalLahir || p.tglLahir || p[3] || "-";
            let wa     = p.noWA || p.whatsapp || p[5] || "-";
            let alamat = p.alamat || p[8] || "-";
            
            let amanObj = encodeURIComponent(JSON.stringify(p));

            html += `
                <tr style="border-bottom: 1px solid #eee; transition: background 0.2s;" onmouseover="this.style.background='#f1f8ff'" onmouseout="this.style.background='transparent'">
                    <td style="padding: 10px; font-weight: bold; color: #2a5298;">${noRM}</td>
                    <td style="padding: 10px; font-weight: bold;">${nama}</td>
                    <td style="padding: 10px;">${tgl}</td>
                    <td style="padding: 10px;">${wa}</td>
                    <td style="padding: 10px; color: #555;"><small>${alamat}</small></td>
                    <td style="padding: 10px; text-align: center;">
                        <button onclick="window.pilihPasienKeForm('${amanObj}')" style="background-color: #27ae60; color: white; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            ✔ Pilih
                        </button>
                    </td>
                </tr>
            `;
        });
        tbody.innerHTML = html;
    };

    window.pilihPasienKeForm = function(encodedData) {
        const p = JSON.parse(decodeURIComponent(encodedData));
        
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

        const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        
        setVal('txtNoRM', noRM);
        setVal('nama', nama);
        setVal('txtKTP', ktp.toString().replace(/'/g, ''));
        setVal('tempatLahir', tmpLhr);
        setVal('tanggalLahir', tglLhr);
        setVal('pekerjaan', kerja);
        setVal('whatsapp', wa.toString().replace(/'/g, ''));
        setVal('email', email);
        setVal('alamat', alamat);
        setVal('kecamatan', kec);
        setVal('kota', kota);

        const rbLaki = document.getElementById('rbLaki');
        const rbPerempuan = document.getElementById('rbPerempuan');
        if (gender.toString().toLowerCase().includes('perempuan') && rbPerempuan) {
            rbPerempuan.checked = true;
        } else if (rbLaki) {
            rbLaki.checked = true;
        }

        ['txtNoRM', 'nama', 'txtKTP'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.readOnly = true;
                el.style.backgroundColor = "#e9ecef";
            }
        });

        window.tutupModalPasien();
        
        alert(`✅ Pasien Terpilih:\nNo. RM: ${noRM}\nNama: ${nama}\n\nSilakan lengkapi Rencana Tanggal Kunjungan & Dokter!`);
        if (document.getElementById('tujuan')) {
            document.getElementById('tujuan').focus();
        }
    };

    // =====================================================================
    // 4. KETERSEDIAAN DOKTER
    // =====================================================================
    window.muatDokterTersedia = function(tanggal, jam, namaDokterAktif) {
        const selectElement = document.getElementById('editDokterSelect'); // Atau 'pilihDokter'
        if (!selectElement) return;

        if (!tanggal || !jam) {
            selectElement.innerHTML = '<option value="">-- Pilih Waktu Terlebih Dahulu --</option>';
            return; 
        }

        selectElement.innerHTML = '<option value="">⏳ Memuat Dokter...</option>';

        const payload = { 
            action: "getAvailableDokter", 
            tanggal: tanggal, 
            jam: jam 
        };

        fetch(WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
        .then(response => response.json())
        .then(res => {
            if (res.result === "success" && res.data.length > 0) {
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
    };

    window.triggerMuatDokterTersedia = function() {
        let tgl = document.getElementById('editTanggalInput') ? document.getElementById('editTanggalInput').value : "";
        let jam = document.getElementById('editJamSelect') ? document.getElementById('editJamSelect').value : "";
        window.muatDokterTersedia(tgl, jam, "");
    };


    // =====================================================================
    // 5. FUNGSI UTILITAS PENDAFTARAN
    // =====================================================================
    window.aturStatusProteksiForm = function(status) {
        const fields = ['nama', 'txtKTP', 'tempatLahir', 'tanggalLahir', 'whatsapp', 'pekerjaan', 'email', 'kecamatan', 'kota', 'alamat'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.readOnly = status;
        });

        const elemenGender = document.querySelectorAll('input[name="gender"]');
        elemenGender.forEach(radio => { radio.disabled = status; });
    };

    window.generateNoRMInstan = function() {
        const txtRM = document.getElementById('txtNoRM');
        if (!txtRM) return;

        if (cacheMasterPasien && cacheMasterPasien.length > 0) {
            let maxNum = 0;
            cacheMasterPasien.forEach(p => {
                let rmStr = (p.noRM || p[0] || "").toString();
                let numPart = parseInt(rmStr.replace(/[^0-9]/g, ''), 10);
                if (!isNaN(numPart) && numPart > maxNum) {
                    maxNum = numPart;
                }
            });

            let nextNum = maxNum + 1;
            txtRM.value = "RM-" + String(nextNum).padStart(4, '0');
            txtRM.style.backgroundColor = "#e8f8f5"; 
        } else {
            txtRM.placeholder = "⏳ Memuat nomor baru...";
            if (typeof window.ambilNoRMOtomatis === "function") {
                window.ambilNoRMOtomatis();
            }
        }
    };

    window.ambilNoRMOtomatis = function() {
        fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'getNewRM' })
        })
        .then(res => res.json())
        .then(res => {
            const txtRM = document.getElementById('txtNoRM');
            if(res.result === 'success' && txtRM) {
                txtRM.value = res.noRM;
            }
        })
        .catch(err => console.error("Gagal men-generate No. RM:", err));
    };

    window.aturTipePasien = function(tipe) {
        const boxLama = document.getElementById('boxPasienLama');
        const daftarInput = ['txtNoRM', 'nama', 'txtKTP', 'tempatLahir', 'tanggalLahir', 'pekerjaan', 'whatsapp', 'email', 'alamat', 'kecamatan', 'kota'];

        if (tipe === 'lama') {
            if (boxLama) boxLama.style.display = 'block';
            window.bukaModalCariPasien(); 
        } else {
            if (boxLama) boxLama.style.display = 'none';
            
            daftarInput.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    if (id !== 'txtNoRM') el.readOnly = false; 
                    el.style.backgroundColor = "#fff";
                    el.value = "";
                }
            });
            
            const rbLaki = document.getElementById('rbLaki');
            if (rbLaki) rbLaki.checked = true;

            window.generateNoRMInstan(); 
        }
    };

})();