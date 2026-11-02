document.addEventListener('DOMContentLoaded', () => {
    
    const menuBtn = document.getElementById("menu-btn");
    const navLinks = document.getElementById("nav-links");

    menuBtn.addEventListener("click", () => {
        navLinks.classList.toggle("show");
    });

    // ==========================================
    // 1. CORE UTILITIES & UI
    // ==========================================
    const showToast = (msg, type = 'success') => {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    const formatBytes = (bytes, decimals = 2) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024, dm = decimals < 0 ? 0 : decimals, sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
        };

    // Theme Switcher
    const themeBtn = document.getElementById('theme-toggle');
    const html = document.documentElement;
    themeBtn.addEventListener('click', () => {
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
    });

    // SPA Router
    window.navigate = (route) => {
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
        
        const targetView = document.getElementById(`view-${route}`);
        const targetLink = document.querySelector(`.nav-links a[data-route="${route}"]`);
        
        if (targetView) targetView.classList.add('active');
        if (targetLink) targetLink.classList.add('active');
    };

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            window.navigate(e.target.getAttribute('data-route'));
        });
    });

    // Drag & Drop Setup Utility
    const setupDropZone = (zoneId, inputId, callback) => {
        const zone = document.getElementById(zoneId);
        const input = document.getElementById(inputId);

        zone.addEventListener('click', () => input.click());
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            zone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            });
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            zone.addEventListener(eventName, () => zone.classList.add('dragover'));
        });

        ['dragleave', 'drop'].forEach(eventName => {
            zone.addEventListener(eventName, () => zone.classList.remove('dragover'));
        });

        zone.addEventListener('drop', (e) => {
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                callback(e.dataTransfer.files);
            }
        });

        input.addEventListener('change', (e) => {
            if (e.target.files && e.target.files.length > 0) {
                callback(e.target.files);
            }
        });
    };

    // Add this helper function below your existing setupDropZone utility
    const updateConvertedSize = async () => {
        if (converterFiles.length === 0) return;
        
        const format = document.getElementById('convert-format').value;
        const quality = parseFloat(document.getElementById('convert-quality').value);
        
        document.getElementById('size-new-conv').innerText = 'Calculating...';
        
        let totalSize = 0;
        
        // Loop through all uploaded files to calculate total converted size
        for (let i = 0; i < converterFiles.length; i++) {
            const file = converterFiles[i];
            try {
                const img = await loadImage(file);
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                if (format === 'image/jpeg') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                
                ctx.drawImage(img, 0, 0);
                
                if (format === "image/svg+xml") {

            const svgSize = await new Promise((resolve) => {

                ImageTracer.imageToSVG(
                    URL.createObjectURL(file),
                    function(svgString) {

                        const blob = new Blob([svgString], {
                            type: "image/svg+xml"
                        });

                        resolve(blob.size);

                    },
                    {
                        ltres: 0.1,
                        qtres: 0.1,
                        pathomit: 0,
                        colorsampling: 2,
                        numberofcolors: Math.round(16 + quality * 240),
                        mincolorratio: 0,
                        colorquantcycles: 3
                    }
                );

            });

            totalSize += svgSize;

        } 
        else{
                // Wrap toBlob in a promise so we can wait for the calculation
                
                const blobSize = await new Promise((resolve) => {
                    canvas.toBlob((blob) => {
                        resolve(blob ? blob.size : 0);
                    }, format, quality);
                });

                totalSize += blobSize;
            }
                
            } catch (err) {
                console.error("Error calculating size for", file.name, err);
            }
        }
        
        document.getElementById('size-new-conv').innerText = formatBytes(totalSize);
    };

    // ==========================================
    // 2. IMAGE CONVERTER LOGIC
    // ==========================================
    let converterFiles = [];
    
    document.getElementById('convert-quality').addEventListener('input', (e) => {
        document.getElementById('quality-val').textContent = Math.round(e.target.value * 100);
    });


    document.getElementById('convert-format').addEventListener('change', updateConvertedSize);
    document.getElementById('convert-quality').addEventListener('change', updateConvertedSize);

    setupDropZone('converter-drop', 'converter-input', (files) => {
        // Filter out non-images
        converterFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
        if (converterFiles.length === 0) {
            showToast('No valid images selected.', 'error');
            return;
        }
        const file = files[0];
        document.getElementById('converter-preview').src = URL.createObjectURL(file);
        document.getElementById('converter-controls').classList.remove('hidden');
        document.querySelector('#converter-drop p').innerHTML = `${converterFiles.length} file(s) ready to convert.`;
        showToast(`${converterFiles.length} file(s) loaded.`);
        document.getElementById('file-info-conv').classList.remove('hidden');
        document.getElementById('size-orig-conv').innerText = formatBytes(file.size);
        document.getElementById('size-new-conv').innerText = '-';
    });

    document.getElementById('btn-convert').addEventListener('click', async () => {
        if (converterFiles.length === 0) return;
        const format = document.getElementById('convert-format').value;
        const quality = parseFloat(document.getElementById('convert-quality').value);
        const ext = format.split('/')[1];

        // Process sequentially to prevent memory overload
        for (let i = 0; i < converterFiles.length; i++) {
            const file = converterFiles[i];
            
            try {
                const img = await loadImage(file);
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                
                // Fill white background for transparent to JPG conversion
                if (format === 'image/jpeg') {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                
                ctx.drawImage(img, 0, 0);
                const originalName = file.name.substring(0, file.name.lastIndexOf('.'));

                 if (format === "image/svg+xml") {

                ImageTracer.imageToSVG(
                    URL.createObjectURL(file),
                    function(svgString) {

                        const blob = new Blob([svgString], {
                            type: "image/svg+xml"
                        });

                        triggerDownload(blob, `${originalName}-converted.svg`);
                        document.getElementById('size-new-conv').innerText =
                            formatBytes(blob.size);

                    }
                );

            } else {
                    canvas.toBlob((blob) => {
                        const originalName = file.name.substring(0, file.name.lastIndexOf('.'));
                        triggerDownload(blob, `${originalName}-converted.${ext}`);
                        document.getElementById('size-new-conv').innerText = formatBytes(blob.size);
                    }, format, quality);
                }

            } catch (err) {
                showToast(`Failed to convert ${file.name}`, 'error');
                console.error(err);
            }
        }
        showToast('Conversion complete!');
    });

    // ==========================================
    // 3. IMAGE RESIZER LOGIC
    // ==========================================
    let resizerFile = null;
    let resizerImg = null;
    const widthInput = document.getElementById('resize-width');
    const heightInput = document.getElementById('resize-height');
    const aspectCheckbox = document.getElementById('keep-aspect');
    let originalRatio = 1;

    const preventInvalidChars = (e) => {
        // Array of characters we want to block
        const invalidChars = ["-", "+", "e", "E", "."];
        
        if (invalidChars.includes(e.key)) {
            e.preventDefault(); // Stops the character from appearing in the box
        }
    };

    // Attach the block function to both inputs by their ID
    document.getElementById('resize-width').addEventListener('keydown', preventInvalidChars);
    document.getElementById('resize-height').addEventListener('keydown', preventInvalidChars);

    // Debounce timer to prevent browser lag when typing fast
    let resizeTimer; 

    const updateResizedSize = () => {
        if (!resizerImg) return;
        
        const targetWidth = parseInt(widthInput.value);
        const targetHeight = parseInt(heightInput.value);
        
        if (!targetWidth || !targetHeight) {
            document.getElementById('size-new-conv1').innerText = '-';
            return;
        }

        document.getElementById('size-new-conv1').innerText = 'Calculating...';

        // Clear previous calculation if user is still typing
        clearTimeout(resizeTimer);
        
        // Wait 300ms after the user stops typing to calculate
        resizeTimer = setTimeout(() => {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(resizerImg, 0, 0, targetWidth, targetHeight);
            
            // Your original code exports resizer to PNG, so we calculate PNG size
            canvas.toBlob((blob) => {
                if (blob) {
                    document.getElementById('size-new-conv1').innerText = formatBytes(blob.size);
                }
            }, 'image/png', 1.0);
        }, 300); 
    };

    setupDropZone('resizer-drop', 'resizer-input', async (files) => {
        const file = files[0];
        if (!file.type.startsWith('image/')) {
            showToast('Please select a valid image.', 'error');
            return;
        }
        resizerFile = file;
        try {
            resizerImg = await loadImage(file);
            originalRatio = resizerImg.width / resizerImg.height;
            
            document.getElementById('resizer-preview').src = URL.createObjectURL(file);
            document.getElementById('original-dimensions').textContent = `Original: ${resizerImg.width} x ${resizerImg.height}px`;
            
            document.getElementById('file-info-conv1').classList.remove('hidden');
            document.getElementById('size-orig-conv1').innerText = formatBytes(file.size);

            widthInput.value = resizerImg.width;
            heightInput.value = resizerImg.height;
            
            document.getElementById('resizer-controls').classList.remove('hidden');
            showToast('Image loaded successfully.');
            
            updateResizedSize();
            
        } catch (err) {
            showToast('Failed to load image.' + err, 'error');
        }
    });

    // Handle Aspect Ratio Linkage
    if (widthInput.value !== "") {
            widthInput.value = Math.max(1, Math.abs(parseInt(widthInput.value)));
        }
    widthInput.addEventListener('input', () => {
        if (aspectCheckbox.checked && widthInput.value) {
            heightInput.value = Math.max(1, Math.round(widthInput.value / originalRatio));
        }
        updateResizedSize();
    });

    heightInput.addEventListener('input', () => {
        if (heightInput.value !== "") {
            heightInput.value = Math.max(1, Math.abs(parseInt(heightInput.value)));
        }
        if (aspectCheckbox.checked && heightInput.value) {
            widthInput.value = Math.max(1, Math.round(heightInput.value * originalRatio));
        }
        updateResizedSize();
    });

    // Presets
    document.getElementById('resize-preset').addEventListener('change', (e) => {
        if (e.target.value === 'custom') return;
        const [w, h] = e.target.value.split('x');
        widthInput.value = w;
        aspectCheckbox.checked = false; // Usually presets break original aspect ratio
        heightInput.value = h;
        updateResizedSize();
    });

    document.getElementById('btn-resize').addEventListener('click', () => {
        if (!resizerImg) return;
        
        const targetWidth = parseInt(widthInput.value);
        const targetHeight = parseInt(heightInput.value);
        
        if (!targetWidth || !targetHeight) {
            showToast('Invalid dimensions', 'error');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        
        // Anti-aliasing for better downscaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(resizerImg, 0, 0, targetWidth, targetHeight);
        
        canvas.toBlob((blob) => {
            const originalName = resizerFile.name.substring(0, resizerFile.name.lastIndexOf('.'));
            triggerDownload(blob, `${originalName}-resized.png`);
            showToast('Image resized successfully!');
        }, 'image/png', 1.0);
    });

    // ==========================================
    // 4. HELPER FUNCTIONS
    // ==========================================
    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url); // Prevent memory leak
                resolve(img);
            };
            img.onerror = reject;
            img.src = url;
        });
    }

    function triggerDownload(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000); // Cleanup
    }

    
// Global State Variables
    let rawImage = new Image();
    let currentRotation = 0;
    let flipH = 1;
    let flipV = 1;

    // DOM Elements
    const fileInput = document.getElementById('file-input');
    const dropzone = document.getElementById('dropzone');
    const mainView = document.getElementById('main-view');
    const imgOriginal = document.getElementById('img-original');
    const canvas = document.getElementById('canvas-edited');
    const ctx = canvas.getContext('2d');

    

    // Controls
    const sliders = {
      brightness: { input: document.getElementById('brightness'), label: document.getElementById('val-brightness') },
      contrast: { input: document.getElementById('contrast'), label: document.getElementById('val-contrast') },
      saturate: { input: document.getElementById('saturate'), label: document.getElementById('val-saturate') },
      blur: { input: document.getElementById('blur'), label: document.getElementById('val-blur') },
      grayscale: { input: document.getElementById('grayscale'), label: document.getElementById('val-grayscale') },
      sepia: { input: document.getElementById('sepia'), label: document.getElementById('val-sepia') },
      hue: { input: document.getElementById('hue'), label: document.getElementById('val-hue') },
      invert: { input: document.getElementById('invert'), label: document.getElementById('val-invert') }
    };

    // Load Image Handler
    // fileInput.addEventListener('change', (e) => {
    //   const file = e.target.files[0];
    //   if (file) loadImage(file);
    // });

    fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];

    if (file) {
        loadEditorImage(file);
    }
});

    // Drag & Drop Handlers
    window.addEventListener('dragover', (e) => e.preventDefault());
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      if (e.dataTransfer.files.length) {
        loadEditorImage(e.dataTransfer.files[0]);
      }
    });

    function loadEditorImage(file) {
    if (!file || !file.type.startsWith('image/')) {
        showToast('Please select a valid image.', 'error');
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        rawImage.src = e.target.result;
        imgOriginal.src = e.target.result;
    };

    reader.onerror = () => {
        showToast('Unable to read image.', 'error');
    };

    reader.readAsDataURL(file);
}

    // Step A: Grab all control elements with the 'editor-ctrl' class
    const editorControls = document.querySelectorAll('.editor-ctrl');

    // Step B: Create a helper function to enable or disable them
    function setControlsDisabled(isDisabled) {
    editorControls.forEach(ctrl => {
        ctrl.disabled = isDisabled;
    });
    }
    rawImage.onload = () => {
      dropzone.style.display = 'none';
      mainView.style.display = 'grid';

      setControlsDisabled(false);
      resetFilters();
      render();
    };

    // Attach Input Event Listeners
    Object.keys(sliders).forEach(key => {
      sliders[key].input.addEventListener('input', () => {
        sliders[key].label.textContent = sliders[key].input.value;
        render();
      });
    });

    // Transform Action Event Listeners
    document.getElementById('btn-rotate').addEventListener('click', () => {
      currentRotation = (currentRotation + 90) % 360;
      render();
    });

    document.getElementById('btn-rotateRight').addEventListener('click', () => {
      currentRotation = (currentRotation - 90 + 360) % 360;
      render();
    });
    
    document.getElementById('btn-flip-h').addEventListener('click', () => {
      flipH *= -1;
      render();
    });

    document.getElementById('btn-flip-v').addEventListener('click', () => {
      flipV *= -1;
      render();
    });

    document.getElementById('btn-reset').addEventListener('click', resetFilters);

    function resetFilters() {
      sliders.brightness.input.value = 50;
      sliders.contrast.input.value = 50;
      sliders.saturate.input.value = 50;
      sliders.blur.input.value = 0;
      sliders.grayscale.input.value = 0;
      sliders.sepia.input.value = 0;
      sliders.hue.input.value = 0;
      sliders.invert.input.value = 0;

      currentRotation = 0;
      flipH = 1;
      flipV = 1;

      Object.keys(sliders).forEach(key => {
        sliders[key].label.textContent = sliders[key].input.value;
      });

      render();
    }

    // Canvas Rendering Core Engine (Mapped to 0-100 Inputs)
    function render() {
      if (!rawImage.src) return;

      const isRotated90 = currentRotation === 90 || currentRotation === 270;
      const width = isRotated90 ? rawImage.height : rawImage.width;
      const height = isRotated90 ? rawImage.width : rawImage.height;

      canvas.width = width;
      canvas.height = height;

      ctx.save();
      ctx.clearRect(0, 0, width, height);

      // Center context for transformations
      ctx.translate(width / 2, height / 2);
      ctx.rotate((currentRotation * Math.PI) / 180);
      ctx.scale(flipH, flipV);

      // Calculations mapping 0-100 scale inputs to CSS filter units
      const bVal = sliders.brightness.input.value * 2;         // 50 -> 100%
      const cVal = sliders.contrast.input.value * 2;           // 50 -> 100%
      const sVal = sliders.saturate.input.value * 2;           // 50 -> 100%
      const blurVal = (sliders.blur.input.value / 100) * 20;   // 0-100 -> 0-20px
      const hueVal = (sliders.hue.input.value / 100) * 360;    // 0-100 -> 0-360deg

      const filterString = `
        brightness(${bVal}%)
        contrast(${cVal}%)
        saturate(${sVal}%)
        blur(${blurVal}px)
        grayscale(${sliders.grayscale.input.value}%)
        sepia(${sliders.sepia.input.value}%)
        hue-rotate(${hueVal}deg)
        invert(${sliders.invert.input.value}%)
      `;

      ctx.filter = filterString;

      // Draw original image
      ctx.drawImage(
        rawImage, 
        -rawImage.width / 2, 
        -rawImage.height / 2, 
        rawImage.width, 
        rawImage.height
      );

      ctx.restore();
    }

    // Export Functionality
    document.getElementById('btn-download').addEventListener('click', () => {
      if (!rawImage.src) return;
      const link = document.createElement('a');
      link.download = 'edited-image.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  

});




     
    
