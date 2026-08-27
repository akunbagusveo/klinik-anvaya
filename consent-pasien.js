// =========================================================================
// ✍️ MODUL ENGINE SIGNATURE PAD & INFORMED CONSENT
// =========================================================================
(function() {

    let isDrawing = false;
    let canvas, ctx;

    window.initSignaturePad = function() {
        canvas = document.getElementById('canvasTTD');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        canvas.addEventListener('mousedown', mulaiGambar);
        canvas.addEventListener('mousemove', gambar);
        canvas.addEventListener('mouseup', stopGambar);
        canvas.addEventListener('mouseout', stopGambar);

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
    };

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

    window.bersihkanTTD = function() {
        if (typeof canvas !== 'undefined' && typeof ctx !== 'undefined' && canvas && ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        const bannerTTD = document.getElementById('bannerPratinjauTTD');
        if (bannerTTD) bannerTTD.style.display = "none";

        document.querySelectorAll('#modalInformedConsent input[type="checkbox"]').forEach(chk => {
            chk.disabled = false;
        });

        const selTujuan = document.getElementById('selTujuanConsent');
        const inpKustom = document.getElementById('inpTujuanKustomConsent');
        if (selTujuan) selTujuan.disabled = false;
        if (inpKustom) inpKustom.disabled = false;
        
        const chkSetuju = document.getElementById('chkSayaSetuju');
        if (chkSetuju) chkSetuju.disabled = false;
    };

    window.bukaModalConsent = function(noRM, namaPasien, tindakan) {
        let rawRM = noRM;
        if (!rawRM || rawRM === "-" || rawRM === "undefined") {
            rawRM = document.getElementById('modalNoRM')?.value || document.getElementById('lblProfilRM')?.innerText || "-";
        }
        const cleanNoRM = String(rawRM).trim();

        const lblRM = document.getElementById('lblConsentRM');
        const lblNama = document.getElementById('lblConsentNama');
        if (lblRM) lblRM.innerText = cleanNoRM;
        if (lblNama) lblNama.innerText = namaPasien || document.getElementById('modalNama')?.value || "-";
        
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
        
        const lblTindakan = document.getElementById('lblConsentTindakan');
        if (lblTindakan) lblTindakan.innerText = teksTindakanFinal;

        const modal = document.getElementById('modalInformedConsent');
        const btnSimpan = document.getElementById('btnSimpanConsent');
        const chkSetuju = document.getElementById('chkSayaSetuju');
        const bannerTTD = document.getElementById('bannerPratinjauTTD');
        const imgTTD = document.getElementById('imgPratinjauTTD');
        const btnCetak = document.getElementById('btnCetakConsentPDF');

        const urlFotoLokalRMIni = localStorage.getItem('ttd_consent_' + cleanNoRM);
        const isConsentPasienIniAda = (urlFotoLokalRMIni && urlFotoLokalRMIni !== "-" && urlFotoLokalRMIni !== "undefined");

        if (isConsentPasienIniAda) {
            if (btnSimpan) {
                btnSimpan.style.backgroundColor = "#e67e22";
                btnSimpan.innerHTML = "🔄 Simpan Ulang / Revisi Consent";
            }
            
            const savedRisiko = JSON.parse(localStorage.getItem('risiko_consent_' + cleanNoRM) || '[]');
            document.querySelectorAll('#modalInformedConsent input[type="checkbox"]').forEach(chk => {
                let label = chk.parentElement ? chk.parentElement.innerText.trim() : "";
                if (label && !label.toLowerCase().includes("saya yang bertanda tangan")) {
                    chk.checked = savedRisiko.includes(label) || savedRisiko.includes(chk.value);
                    // 🔥 FIX: JANGAN di-disable agar dokter bisa revisi centangnya!
                    chk.disabled = false; 
                }
            });

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
                        inpKustom.disabled = false; // 🔥 FIX: Buka gembok revisi
                    }
                } else if (inpKustom) {
                    inpKustom.style.display = 'none';
                }
                selTujuan.disabled = false; // 🔥 FIX: Buka gembok revisi
            }

            if (chkSetuju) {
                chkSetuju.checked = true;
                chkSetuju.disabled = false; // 🔥 FIX: Buka gembok revisi
            }
            
            if (btnCetak) {
                btnCetak.style.display = "inline-block";
                const savedPdf = localStorage.getItem('pdf_url_consent_' + cleanNoRM);
                if (savedPdf && savedPdf !== "-" && savedPdf !== "undefined") {
                    btnCetak.innerHTML = "📄 Buka Ulang PDF Resmi";
                    btnCetak.style.backgroundColor = "#27ae60";
                } else {
                    btnCetak.innerHTML = "🖨️ Cetak / Unduh PDF Resmi";
                    btnCetak.style.backgroundColor = "#2980b9";
                }
            }

            let urlFoto = urlFotoLokalRMIni; 
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
            if (typeof window.bersihkanTTD === "function") window.bersihkanTTD();
            
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
            if (typeof window.initSignaturePad === "function") window.initSignaturePad();
        }, 200);
    };

    window.tutupModalConsent = function() {
        const modal = document.getElementById('modalInformedConsent');
        if (modal) modal.style.display = 'none';
    };

    window.kirimDataConsent = function() {
        const chkSetuju = document.getElementById('chkSayaSetuju');
        if (!chkSetuju || !chkSetuju.checked) {
            alert("⚠️ Wajib mencentang kotak pernyataan persetujuan terlebih dahulu!");
            return;
        }

        const canvasTepat = document.getElementById('canvasTTD');
        if (!canvasTepat) {
            alert("⚠️ Elemen kanvas tanda tangan tidak ditemukan di halaman!");
            return;
        }

        const blankCanvas = document.createElement('canvas');
        blankCanvas.width = canvasTepat.width;
        blankCanvas.height = canvasTepat.height;
        const isCanvasKosong = (canvasTepat.toDataURL() === blankCanvas.toDataURL());
        
        let ttdBase64Data = "";
        const bannerTTD = document.getElementById('bannerPratinjauTTD');

        if (isCanvasKosong) {
            if (bannerTTD && bannerTTD.style.display === "block" && window.urlFotoConsentAktif) {
                ttdBase64Data = window.urlFotoConsentAktif; 
            } else {
                alert("⚠️ Pasien atau wali wajib menorehkan tanda tangan pada area kotak yang disediakan!");
                return;
            }
        } else {
            ttdBase64Data = canvasTepat.toDataURL("image/png");
        }

        const risikoTerpilih = [];
        document.querySelectorAll('.chk-risiko:checked').forEach(el => {
            risikoTerpilih.push(el.value);
        });

        let btn = (window.event && window.event.target) ? window.event.target : null;
        if (!btn || btn.tagName !== 'BUTTON') {
            btn = document.getElementById('btnSimpanConsent');
        }

        const teksAsli = btn ? btn.innerText : "Simpan Persetujuan";
        if (btn) {
            btn.disabled = true;
            btn.innerText = "⏳ Mengirim & Menyimpan...";
        }

        if (typeof window.tampilkanLoading === "function") window.tampilkanLoading("⏳ Mengunggah Tanda Tangan Pasien...");

        const payload = {
            action: "simpanConsent",
            noRM: document.getElementById('lblConsentRM')?.innerText || "-",
            namaPasien: document.getElementById('lblConsentNama')?.innerText || "-",
            tindakan: document.getElementById('lblConsentTindakan')?.innerText || "-",
            risikoTerpilih: risikoTerpilih,
            statusTTD: "Digital",
            ttdBase64: ttdBase64Data 
        };

        fetch(window.WEB_APP_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(res => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();

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

                    // 🔥 FIX PDF REVISI: Hancurkan cache PDF lama agar sistem DIPAKSA bikin PDF baru dengan TTD dan Risiko terbaru!
                    localStorage.removeItem('pdf_url_consent_' + cleanRM);
                    window.pdfConsentAktif = null;
                }
                
                window.consentSudahDisimpanHariIni = true;
                if (res.urlFoto || res.linkFoto) window.urlFotoConsentAktif = res.urlFoto || res.linkFoto;

                if (typeof window.simpanDraftRME === "function") window.simpanDraftRME();
                if (typeof window.periksaKebutuhanConsentUI === "function") window.periksaKebutuhanConsentUI();

                if (typeof window.cetakInformedConsentPDF === "function") {
                    window.cetakInformedConsentPDF(true); 
                }

                window.tutupModalConsent();
            } else {
                alert("❌ Gagal menyimpan consent: " + (res.message || "Terjadi kesalahan server."));
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function") window.sembunyikanLoading();
            if (btn) {
                btn.disabled = false;
                btn.innerText = teksAsli;
            }
            alert("⚠️ Terjadi kesalahan koneksi sistem saat mengirim data.");
        });
    };

    window.triggerInformedConsentDariRME = function() {
        const elNoRM = document.getElementById('modalNoRM');
        const elNama = document.getElementById('modalNama');
        const noRM = elNoRM ? elNoRM.value || "-" : "-";
        const namaPasien = elNama ? elNama.value || "-" : "-";

        const kontainer = document.getElementById('kontainerTindakanDinamis');
        let daftarTindakan = [];

        if (kontainer) {
            const inputTindakan = kontainer.querySelectorAll('input[type="text"], select, textarea');
            inputTindakan.forEach(el => {
                if (el.value && el.value.trim() !== "") {
                    daftarTindakan.push(el.value.trim());
                }
            });
        }

        let teksTindakan = daftarTindakan.join(", ");
        if (daftarTindakan.length === 0) {
            teksTindakan = prompt("⚠️ Belum ada tindakan yang dipilih di form. Silakan ketik nama tindakan medis untuk persetujuan ini:", "Odontektomi / Tindakan Bedah Minor");
            if (!teksTindakan) return; 
        }

        window.bukaModalConsent(noRM, namaPasien, teksTindakan);
    };

    window.periksaKebutuhanConsentUI = function() {
        const btnConsent = document.getElementById('btnBuatConsent');
        if (!btnConsent) return;

        const noRM = document.getElementById('modalNoRM')?.value || document.getElementById('lblProfilRM')?.innerText || "-";
        const cleanNoRM = String(noRM).trim();

        const savedTTD = localStorage.getItem('ttd_consent_' + cleanNoRM) || window.urlFotoConsentAktif;
        const savedRisiko = localStorage.getItem('risiko_consent_' + cleanNoRM);
        
        if ((savedTTD && savedTTD !== "-" && savedTTD !== "undefined") || (savedRisiko && savedRisiko !== "[]" && savedRisiko !== null)) {
            window.consentSudahDisimpanHariIni = true;
            if (savedTTD) window.urlFotoConsentAktif = savedTTD;
            
            btnConsent.disabled = false;
            btnConsent.style.cursor = "pointer";
            btnConsent.style.opacity = "1";
            btnConsent.style.backgroundColor = "#27ae60"; 
            btnConsent.innerHTML = "✅ Informed Consent Tersimpan";
            btnConsent.style.display = "inline-flex";
            btnConsent.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
            btnConsent.style.border = "none";
            return; 
        }

        window.consentSudahDisimpanHariIni = false;
        let butuhConsent = false;

        const semuaInputTindakan = document.querySelectorAll('#kontainerTindakanDinamis .sel-nama-tindakan, #kontainerTindakanDinamis input[type="text"]');
        
        semuaInputTindakan.forEach(el => {
            if (el.classList.contains('inp-harga-tindakan') || el.classList.contains('inp-catatan-tindakan')) return;

            if (el && el.value) {
                const teks = String(el.value).trim().toLowerCase();
                let isBerisiko = false;

                if (el.tagName.toLowerCase() === 'select' && el.selectedIndex >= 0) {
                    const opt = el.options[el.selectedIndex];
                    if (opt && opt.getAttribute('data-butuh-consent') === "1") isBerisiko = true;
                }

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

        if (butuhConsent) {
            btnConsent.disabled = false;
            btnConsent.style.cursor = "pointer";
            btnConsent.style.opacity = "1"; 
            btnConsent.style.backgroundColor = "#e67e22"; 
            btnConsent.innerHTML = "⚠️ Buat Informed Consent (Wajib)";
            btnConsent.style.display = "inline-flex";
            btnConsent.style.boxShadow = "0 0 12px rgba(230, 126, 34, 0.85)";
            btnConsent.style.border = "2px solid #f39c12";
            btnConsent.style.fontWeight = "bold";
        } else {
            btnConsent.disabled = true;
            btnConsent.style.cursor = "not-allowed"; 
            btnConsent.style.opacity = "0.5"; 
            btnConsent.style.backgroundColor = "#95a5a6"; 
            btnConsent.innerHTML = "✍️ Buat Informed Consent";
            btnConsent.style.display = "inline-flex";
            btnConsent.style.boxShadow = "none";
            btnConsent.style.border = "none";
            btnConsent.style.fontWeight = "normal";
        }
    };

    window.addEventListener('load', function() {
        document.addEventListener('change', function(e) {
            if (e.target && e.target.classList.contains('sel-nama-tindakan')) {
                window.periksaKebutuhanConsentUI();
            }
        });
    });

    window.resetStatusConsentUI = function() {
        window.consentSudahDisimpanHariIni = false;

        const btnConsent = document.getElementById('btnBuatConsent');
        if (btnConsent) {
            btnConsent.classList.remove('btn-consent-wajib');
            btnConsent.style.backgroundColor = "#e67e22"; 
            btnConsent.innerHTML = "✍️ Buat Informed Consent";
            btnConsent.disabled = false;
        }

        document.querySelectorAll('.badge-consent').forEach(el => el.remove());
    };

    // =====================================================================
    // 6. ENGINE PENCETAK PDF CONSENT (ANTI DATA TERTUKAR)
    // =====================================================================
    window.cetakInformedConsentPDF = function(isSilent = false) {
        const noRM = document.getElementById('lblConsentRM')?.innerText || document.getElementById('modalNoRM')?.value || "-";
        
        const existingPdfUrl = localStorage.getItem('pdf_url_consent_' + noRM);
        if (existingPdfUrl && existingPdfUrl !== "-" && existingPdfUrl !== "undefined") {
            if (!isSilent) {
                alert("♻️ Membuka kembali dokumen PDF resmi yang telah dicetak sebelumnya...");
                window.open(existingPdfUrl, '_blank');
            }
            return; 
        }

        const btnCetak = document.getElementById('btnCetakConsentPDF');
        const teksAsli = btnCetak ? btnCetak.innerHTML : "🖨️ Cetak / Unduh PDF Resmi";
        
        if (btnCetak && !isSilent) {
            btnCetak.disabled = true;
            btnCetak.innerHTML = "⏳ Membuat Dokumen PDF... (Mohon Tunggu)";
            btnCetak.style.backgroundColor = "#7f8c8d";
        }

        const sessionData = JSON.parse(localStorage.getItem('anvaya_session') || '{}');
        const namaPasien = document.getElementById('lblConsentNama')?.innerText || document.getElementById('modalNama')?.value || "-";
        const tindakan = document.getElementById('lblConsentTindakan')?.innerText || "-";
        
        const diagnosa = document.getElementById('modalDiagnosa')?.value || document.getElementById('inputDiagnosaAktif')?.value || "Sesuai rekam medis aktif";
        
        // 🔥 FIX DATA PASIEN TERTUKAR: 
        // Memastikan variabel global hanya digunakan JIKA nomor RM-nya 100% cocok dengan pasien ini!
        const pAktifRaw = window.pasienRMEAktif || {};
        const pAktif = (pAktifRaw.noRM === noRM) ? pAktifRaw : {}; 

        let detailAntrean = null;
        if (typeof window.dataAntreanGlobal !== 'undefined' && window.dataAntreanGlobal !== null) {
            detailAntrean = window.dataAntreanGlobal.find(p => p.noRM === noRM);
        }

        let namaDokterDariData = detailAntrean ? detailAntrean.namaDokter : (pAktif.namaDokter || "");
        let namaDokterDinamis = namaDokterDariData || sessionData.namaLengkap || sessionData.username || document.getElementById('selDokter')?.value || "Dokter Klinik Anvaya";
        
        if (!namaDokterDinamis.toLowerCase().includes("dr.") && !namaDokterDinamis.toLowerCase().includes("dr ") && namaDokterDinamis !== "Dokter Klinik Anvaya") {
            namaDokterDinamis = "dr. " + namaDokterDinamis.replace(/\b\w/g, l => l.toUpperCase());
        }

        let umurTeks = "-";
        if (pAktif.tanggalLahir && typeof window.hitungUmur === "function") {
            umurTeks = `${window.hitungUmur(pAktif.tanggalLahir)} Thn (${pAktif.tanggalLahir})`;
        } else if (detailAntrean && detailAntrean.tanggalLahir && typeof window.hitungUmur === "function") {
            umurTeks = `${window.hitungUmur(detailAntrean.tanggalLahir)} Thn`;
        } else {
            // 🔥 Ambil dari UI hanya jika profil yang tampil di latar belakang benar-benar milik pasien ini
            const uiRm = document.getElementById('lblProfilRM')?.innerText || "";
            if (uiRm === noRM) {
                const domUmur = document.getElementById('lblProfilUmur')?.innerText || "";
                const match = domUmur.match(/\((.*?)\)/);
                umurTeks = match ? match[1] : (domUmur !== "-" ? domUmur : "-");
            }
        }

        let jenisKelamin = pAktif.jenisKelamin || detailAntrean?.jenisKelamin || "-";
        
        let alamat = "-";
        if (pAktif.alamat) {
            alamat = pAktif.alamat;
        } else if (detailAntrean && detailAntrean.alamat) {
            alamat = detailAntrean.alamat;
        } else {
            const uiRm = document.getElementById('lblProfilRM')?.innerText || "";
            if (uiRm === noRM) {
                alamat = document.getElementById('lblProfilDomisili')?.innerText || "-";
            }
        }

        let daftarRisiko = [];
        document.querySelectorAll('#modalInformedConsent input[type="checkbox"]:checked').forEach(chk => {
            let label = chk.parentElement ? chk.parentElement.innerText.trim() : "";
            if (label && !label.toLowerCase().includes("saya yang bertanda tangan")) {
                daftarRisiko.push(label);
            }
        });

        const urlFotoTTD = window.urlFotoConsentAktif || localStorage.getItem('ttd_consent_' + noRM) || "-";
        
        let tujuanTindakan = "-";
        if (typeof window.getTujuanConsentAktif === "function") {
            tujuanTindakan = window.getTujuanConsentAktif();
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

        if (typeof window.tampilkanLoading === "function" && !isSilent) {
            window.tampilkanLoading("⏳ Merakit Dokumen PDF...");
        }

        fetch(window.WEB_APP_URL, { method: "POST", body: JSON.stringify(payload) })
        .then(res => res.json())
        .then(res => {
            if (typeof window.sembunyikanLoading === "function" && !isSilent) window.sembunyikanLoading();

            if (btnCetak && !isSilent) {
                btnCetak.disabled = false;
                btnCetak.innerHTML = "📄 Buka Ulang PDF Resmi";
                btnCetak.style.backgroundColor = "#27ae60"; 
            }

            if (res.result === "success" && res.pdfUrl) {
                window.pdfConsentAktif = res.pdfUrl;
                if (noRM !== "-") localStorage.setItem('pdf_url_consent_' + noRM, res.pdfUrl);

                if (!isSilent) {
                    alert("✅ Dokumen PDF Resmi berhasil dibuat!\n\nDokumen akan dibuka secara otomatis di tab baru.");
                    window.open(res.pdfUrl, '_blank');
                }
            } else {
                if (!isSilent) alert("❌ Gagal membuat PDF: " + (res.message || "Terjadi kesalahan di server."));
            }
        })
        .catch(err => {
            if (typeof window.sembunyikanLoading === "function" && !isSilent) window.sembunyikanLoading();
            if (btnCetak && !isSilent) {
                btnCetak.disabled = false;
                btnCetak.innerHTML = teksAsli;
                btnCetak.style.backgroundColor = "#2980b9";
            }
            if (!isSilent) alert("⚠️ Gangguan koneksi saat menghubungi mesin cetak server.");
        });
    };

    window.toggleTujuanKustomConsent = function(value) {
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
    };

    window.getTujuanConsentAktif = function() {
        const sel = document.getElementById('selTujuanConsent');
        const inpKustom = document.getElementById('inpTujuanKustomConsent');
        if (!sel) return "Penyembuhan & perbaikan fungsi klinis kedokteran gigi";
        
        if (sel.value === "KUSTOM" && inpKustom && inpKustom.value.trim() !== "") {
            return inpKustom.value.trim();
        }
        return sel.value !== "KUSTOM" ? sel.value : "Penyembuhan & perbaikan fungsi klinis kedokteran gigi";
    };

})();