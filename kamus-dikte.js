// =========================================================================
// 📖 MODUL KAMUS DIKTE & VOICE RECOGNITION
// Dibungkus dalam IIFE agar variabel tidak bentrok dengan modul lain
// =========================================================================
(function() {
    // 1. Variabel Privat (Aman dari bentrok dengan file JS lain)
    let kamusKoreksiDinamis = {};
    let dataKamusArray = []; 
    let currentPage = 1;
    const rowsPerPage = 10; 

    // 2. Fungsi Utama (Dikaitkan ke window agar bisa dipanggil dari HTML onclick)
    window.muatKamusDikte = function() {
        const bodyKamus = document.getElementById('bodyKamus');
        if (bodyKamus) {
            bodyKamus.innerHTML = `<tr><td colspan="3" style="text-align:center;">Memuat data kamus... ⏳</td></tr>`;
        }

        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Memuat data Kamus Dikte dari Server...");

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getKamusDikte" })
        })
        .then(res => res.json())
        .then(res => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();

            if (res.result === "success") {
                if (!res.data) return;

                let objekKoreksiBersih = {};
                let arrayUntukTabel = [];

                if (Array.isArray(res.data)) {
                    for (let i = 1; i < res.data.length; i++) {
                        let salah = res.data[i][0] ? res.data[i][0].toString().trim() : "";
                        let benar = res.data[i][1] ? res.data[i][1].toString().trim() : "";
                        
                        if (salah !== "") {
                            objekKoreksiBersih[salah.toLowerCase()] = benar;
                            arrayUntukTabel.push({
                                salah: salah,
                                benar: benar,
                                barisSheet: i + 1
                            });
                        }
                    }
                } else {
                    objekKoreksiBersih = res.data;
                    arrayUntukTabel = Object.keys(res.data).map((salah, index) => {
                        return { salah: salah, benar: res.data[salah], barisSheet: index + 2 };
                    });
                }

                arrayUntukTabel.reverse();

                kamusKoreksiDinamis = objekKoreksiBersih; 
                dataKamusArray = arrayUntukTabel;
                currentPage = 1; 
                
                if (bodyKamus) renderKamusTable(); 
            } else {
                if (bodyKamus) {
                    bodyKamus.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">Gagal: ${res.message || 'Terjadi kesalahan sistem.'}</td></tr>`;
                }
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            console.error("Gagal memuat kamus dikte:", err);
            if (bodyKamus) {
                bodyKamus.innerHTML = `<tr><td colspan="3" style="text-align:center; color:red;">Gagal memuat data.</td></tr>`;
            }
        });
    };

    // Fungsi Render Tabel (Privat - hanya dipanggil dari dalam modul ini)
    function renderKamusTable() {
        const tbody = document.getElementById('bodyKamus');
        const paginationDiv = document.getElementById('paginationControls');
        tbody.innerHTML = ""; 
        
        if (dataKamusArray.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Belum ada data kamus.</td></tr>`;
            paginationDiv.style.display = 'none'; 
            return;
        }

        paginationDiv.style.display = 'block'; 

        const startIndex = (currentPage - 1) * rowsPerPage;
        const endIndex = startIndex + rowsPerPage;
        const paginatedItems = dataKamusArray.slice(startIndex, endIndex);
        
        paginatedItems.forEach(item => {
            let row = `<tr>
                <td>${item.salah}</td>
                <td>${item.benar}</td>
                <td style="text-align:center;">
                    <button onclick="hapusKamus(${item.barisSheet})" style="color:red; cursor:pointer;">Hapus</button>
                </td>
            </tr>`;
            tbody.innerHTML += row;
        });

        const totalPages = Math.ceil(dataKamusArray.length / rowsPerPage);
        document.getElementById('pageInfo').innerText = `Halaman ${currentPage} dari ${totalPages}`;
        
        document.getElementById('btnPrev').disabled = (currentPage === 1);
        document.getElementById('btnNext').disabled = (currentPage === totalPages);
    }

    // Fungsi Navigasi Halaman
    window.ubahHalaman = function(direction) {
        const totalPages = Math.ceil(dataKamusArray.length / rowsPerPage);
        currentPage += direction;
        
        if (currentPage < 1) currentPage = 1;
        if (currentPage > totalPages) currentPage = totalPages;
        
        renderKamusTable(); 
    };

    // Fungsi Tambah Kamus
    window.tambahKamus = function() {
        const elInputSalah = document.getElementById('inputSalah');
        const elInputBenar = document.getElementById('inputBenar');
        const salah = elInputSalah.value.trim();
        const benar = elInputBenar.value.trim();
        
        if (!salah || !benar) {
            alert("⚠️ Kolom kata salah dan kata perbaikan tidak boleh kosong!");
            return;
        }

        const salahLower = salah.toLowerCase();
        if (kamusKoreksiDinamis[salahLower]) {
            const kataLama = kamusKoreksiDinamis[salahLower];
            alert(`🚫 KATA SUDAH TERDAFTAR!\n\nKata salah "${salah}" sudah ada di dalam kamus dengan perbaikan menjadi "${kataLama}".\n\nJika ingin mengubahnya, hapus data lama terlebih dahulu.`);
            return; 
        }
        
        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Menyimpan kata baru ke Kamus...");

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "simpanKamus", salah: salah, benar: benar })
        })
        .then(res => res.json())
        .then(res => {
            if (res.result === "success") {
                elInputSalah.value = "";
                elInputBenar.value = "";
                if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
                setTimeout(() => {
                    alert("✅ Kata berhasil ditambahkan ke kamus!");
                    window.muatKamusDikte(); 
                }, 100);
            } else {
                if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
                alert("❌ Gagal menyimpan kata: " + res.message); 
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            console.error("Gagal menambah data:", err);
            alert("⚠️ Gangguan koneksi saat menyimpan kata.");
        });
    };

    // Fungsi Hapus Kamus
    window.hapusKamus = function(rowIndex) {
        if (!confirm("Apakah Anda yakin ingin menghapus baris kata ini?")) return;
        
        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Menghapus kata dari database...");

        fetch(WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify({ action: "hapusKamus", rowIndex: rowIndex })
        })
        .then(res => res.json())
        .then(res => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            if (res.result === "success") {
                alert("Kata berhasil dihapus!");
                window.muatKamusDikte(); 
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            console.error("Gagal menghapus data:", err);
        });
    };

    // Fungsi Dikte Suara
    window.mulaiDikte = function(targetId) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Maaf, browser Anda tidak mendukung fitur Dikte Suara. Mohon gunakan Google Chrome terbaru.");
            return;
        }

        const targetInput = document.getElementById(targetId);
        const btnMicrophone = event.currentTarget; 
        const originalIcon = "🎙️";

        if (window.pengenalSuaraAktif) {
            window.pengenalSuaraAktif.stop();
            window.pengenalSuaraAktif = null;
            btnMicrophone.innerText = originalIcon;
            targetInput.placeholder = "";
            return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.lang = 'id-ID';
        recognition.continuous = true; 
        recognition.interimResults = false; 

        recognition.onstart = function() {
            window.pengenalSuaraAktif = recognition; 
            btnMicrophone.innerText = "🛑 (Klik Stop)"; 
            targetInput.placeholder = "Mendengarkan suara Anda terus-menerus... (Klik 🛑 untuk berhenti)";
        };

        recognition.onresult = function(event) {
            let hasilText = event.results[event.results.length - 1][0].transcript;
            let textNormal = hasilText.replace(/[\s\u00A0]+/g, " ");
            
            if (kamusKoreksiDinamis && Object.keys(kamusKoreksiDinamis).length > 0) {
                for (const [salah, benar] of Object.entries(kamusKoreksiDinamis)) {
                    let kataSalahBersih = salah.toString().trim().replace(/[\s\u00A0]+/g, " ");
                    if (kataSalahBersih !== "") {
                        const polaRegex = kataSalahBersih.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[\\s\\u00A0]+');
                        const regexAman = new RegExp(polaRegex, "gi");
                        textNormal = textNormal.replace(regexAman, benar);
                    }
                }
            }
            
            hasilText = textNormal.trim();
            hasilText = hasilText.replace(/\s+,/g, ",").replace(/\s+\./g, ".").replace(/,\s*\./g, ",").replace(/\.\s*,/g, ",").replace(/\.{2,}/g, ".");

            if (hasilText) {
                let currentVal = targetInput.value;
                let spasiPemisah = (currentVal !== "" && !currentVal.endsWith(" ") && !currentVal.endsWith("\n")) ? " " : "";
                
                let harusKapital = currentVal.trim() === "" || /[.\!?]\s*$/.test(currentVal);
                if (harusKapital) hasilText = hasilText.charAt(0).toUpperCase() + hasilText.slice(1);
                
                targetInput.value += spasiPemisah + hasilText;
                targetInput.value = targetInput.value.replace(/\s{2,}/g, " ");
                targetInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
        };

        recognition.onerror = function(event) {
            console.error("Mic error:", event.error);
            if(event.error === 'not-allowed') alert("Izin mikrofon diblokir.");
            window.pengenalSuaraAktif = null;
            btnMicrophone.innerText = originalIcon;
        };

        recognition.onend = function() {
            window.pengenalSuaraAktif = null;
            btnMicrophone.innerText = originalIcon; 
            targetInput.placeholder = "";
        };

        recognition.start();
    };

    // Auto-Jalankan
    window.addEventListener('load', window.muatKamusDikte);
})();