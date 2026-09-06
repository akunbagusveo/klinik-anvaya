// =========================================================================
// 🔥 MESIN SMART AUTOCOMPLETE ICD-10 (CHIP / TAG UI)
// =========================================================================
(function() {

    window.masterICD = [];
    window.diagnosaTerpilih = []; 

    window.addEventListener("load", function() {
        fetch('https://raw.githubusercontent.com/fendis0709/icd-10/master/master_icd_x.json')
            .then(response => response.json())
            .then(data => {
                window.masterICD = data;
                console.log("✅ 52.347 Data ICD-10 Berhasil Dimuat ke Memori Browser!");
            })
            .catch(err => console.error("Gagal memuat database ICD-10:", err));
    });

    window.renderChipDiagnosa = function() {
        const tempatChip = document.getElementById('tempatChipDiagnosa');
        const textareaDB = document.getElementById('modalDiagnosa'); 
        
        if (!tempatChip) return;
        tempatChip.innerHTML = ""; 
        
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
            
            // Masukkan teks ke dalam chip terlebih dahulu
            chip.appendChild(teks);
            
            // 🔥 LOGIKA GEMBOK: Tombol Hapus HANYA dibuat dan dimunculkan jika UI Diagnosa TIDAK terkunci
            if (!window.isDiagnosaLocked) {
                const btnHapus = document.createElement('button');
                btnHapus.type = "button"; // 🔥 PENTING: Mencegah Form RME tersubmit tidak sengaja
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
                    window.diagnosaTerpilih.splice(index, 1); 
                    window.renderChipDiagnosa(); 
                };
                
                // Masukkan tombol hapus ke dalam chip
                chip.appendChild(btnHapus);
            }
            
            // Render chip ke layar
            tempatChip.appendChild(chip);
        });

        if (textareaDB) {
            textareaDB.value = window.diagnosaTerpilih.join('\n');
        }
    };

    // 🔥 FUNGSI BARU: Mengunci seluruh UI Diagnosa
    window.kunciDiagnosaUI = function(isLocked) {
        window.isDiagnosaLocked = isLocked;
        const inputCari = document.getElementById('inputCariDiagnosa');
        const quickPick = document.getElementById('quickPickDiagnosa');
        const btnMic = document.getElementById('btnMicDiagnosa');
        const peringatanId = 'peringatanDiagnosaTerkunci';
        let peringatan = document.getElementById(peringatanId);

        if (isLocked) {
            if (inputCari) inputCari.style.display = 'none';
            if (quickPick) quickPick.style.display = 'none';
            if (btnMic) btnMic.style.display = 'none';
            
            // Tambahkan banner peringatan kuning jika belum ada
            if (!peringatan && inputCari) {
                peringatan = document.createElement('div');
                peringatan.id = peringatanId;
                peringatan.style = "padding: 10px; background: #fff3cd; border: 1px solid #ffe69c; color: #856404; border-radius: 4px; font-size: 12px; margin-bottom: 8px; font-style: italic;";
                peringatan.innerHTML = "🔒 <strong>Diagnosa Terkunci.</strong> Informed Consent telah diterbitkan.";
                inputCari.parentNode.insertBefore(peringatan, inputCari);
            }
        } else {
            if (inputCari) inputCari.style.display = 'block';
            if (quickPick) quickPick.style.display = 'flex';
            if (btnMic) btnMic.style.display = 'inline-block';
            if (peringatan) peringatan.remove();
        }
        
        // Render ulang untuk menghilangkan/memunculkan tombol Hapus
        window.renderChipDiagnosa();
    };

    // 🔥 FUNGSI BARU: Mengunci seluruh UI Tindakan
    window.kunciTindakanUI = function(isLocked) {
        window.isTindakanLocked = isLocked;
        const btnTambah = document.getElementById('btnTambahTindakan');
        const semuaBaris = document.querySelectorAll('.baris-tindakan-item');

        if (isLocked) {
            if (btnTambah) btnTambah.style.display = 'none'; // Hilangkan tombol tambah
            
            semuaBaris.forEach(row => {
                const inpNama = row.querySelector('.sel-nama-tindakan');
                const inpQty = row.querySelector('.inp-qty-tindakan');
                const inpCatatan = row.querySelector('.inp-catatan-tindakan');
                const tombolHapusMic = row.querySelectorAll('button');
                
                if (inpNama) { inpNama.disabled = true; inpNama.style.backgroundColor = "#e9ecef"; }
                if (inpQty) { inpQty.disabled = true; inpQty.style.backgroundColor = "#e9ecef"; }
                if (inpCatatan) { inpCatatan.disabled = true; inpCatatan.style.backgroundColor = "#e9ecef"; }
                tombolHapusMic.forEach(btn => btn.style.display = 'none'); // Hilangkan mic & tempat sampah
            });
        } else {
            if (btnTambah) btnTambah.style.display = 'inline-flex';
            
            semuaBaris.forEach(row => {
                const inpNama = row.querySelector('.sel-nama-tindakan');
                const inpQty = row.querySelector('.inp-qty-tindakan');
                const inpCatatan = row.querySelector('.inp-catatan-tindakan');
                const tombolHapusMic = row.querySelectorAll('button');
                
                if (inpNama) { inpNama.disabled = false; inpNama.style.backgroundColor = "white"; }
                if (inpQty) { inpQty.disabled = false; inpQty.style.backgroundColor = "transparent"; }
                if (inpCatatan) { inpCatatan.disabled = false; inpCatatan.style.backgroundColor = "white"; }
                tombolHapusMic.forEach(btn => btn.style.display = 'inline-flex');
            });
        }
    };

    window.pilihICD = function(teksDiagnosa) {
        const inputCari = document.getElementById('inputCariDiagnosa');
        const dropdownIcd = document.getElementById('icdDropdown');
        
        if (!teksDiagnosa.includes(" - ")) {
            teksDiagnosa = "📝 CUSTOM - " + teksDiagnosa.charAt(0).toUpperCase() + teksDiagnosa.slice(1);
        }

        if (!window.diagnosaTerpilih.includes(teksDiagnosa)) {
            window.diagnosaTerpilih.push(teksDiagnosa);
            window.renderChipDiagnosa(); 
        }
        
        if (inputCari) {
            inputCari.value = ""; 
            inputCari.focus();
        }
        if (dropdownIcd) dropdownIcd.style.display = 'none';
    };

    window.sinkronisasiChipDiagnosa = function() {
        const textareaDB = document.getElementById('modalDiagnosa');
        if (textareaDB && textareaDB.value.trim() !== "") {
            window.diagnosaTerpilih = textareaDB.value.split('\n').map(item => item.trim()).filter(item => item !== "");
        } else {
            window.diagnosaTerpilih = [];
        }
        window.renderChipDiagnosa();
    };

    window.addEventListener('load', function() {
        document.addEventListener('input', function(e) {
            if (e.target && e.target.id === 'inputCariDiagnosa') {
                const keyword = e.target.value.toLowerCase().trim();
                const dropdownIcd = document.getElementById('icdDropdown');
                if (!dropdownIcd) return;
                
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
                        
                        div.onmouseover = function() { this.style.backgroundColor = '#f1f2f6'; };
                        div.onmouseout = function() { this.style.backgroundColor = 'transparent'; };
                        
                        let teksTampil = item.nama_icd_indo && item.nama_icd_indo !== "-" ? item.nama_icd_indo : item.nama_icd;
                        div.innerHTML = `<strong style="color: #c0392b;">${item.kode_icd}</strong> - ${teksTampil}<br><small style="color:#7f8c8d;">${item.nama_icd}</small>`;
                        
                        div.addEventListener('click', function() {
                            window.pilihICD(`${item.kode_icd} - ${teksTampil}`);
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

        document.addEventListener('click', function(e) {
            const inputCari = document.getElementById('inputCariDiagnosa');
            const dropdownIcd = document.getElementById('icdDropdown');
            if (dropdownIcd && e.target !== inputCari && e.target !== dropdownIcd) {
                dropdownIcd.style.display = 'none';
            }
        });
    });

})();