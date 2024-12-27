
// filters.js
const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d');
let originalImage = null;

document.getElementById('imageInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            originalImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        if (!originalImage) return;
        const filterName = this.dataset.filter;
        applyFilter(filterName);
    });
});

function applyFilter(filterName) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    
    switch(filterName) {
        case 'colorFixer':
            for (let i = 0; i < pixels.length; i += 4) {
                // Auto level adjustment
                pixels[i] = autoLevel(pixels[i]);     // Red
                pixels[i+1] = autoLevel(pixels[i+1]); // Green
                pixels[i+2] = autoLevel(pixels[i+2]); // Blue
            }
            break;
            
        case 'denoiser':
            medianFilter(pixels, canvas.width, canvas.height);
            break;
            
        case 'oldPhotoRestorer':
            for (let i = 0; i < pixels.length; i += 4) {
                // Increase contrast and adjust colors
                const avg = (pixels[i] + pixels[i+1] + pixels[i+2]) / 3;
                pixels[i] = pixels[i+1] = pixels[i+2] = 
                    Math.min(255, Math.max(0, avg + (avg - 128) * 0.5));
            }
            break;
            
        case 'unblur':
            unsharpMask(pixels, canvas.width, canvas.height);
            break;
            
        case 'sharpener':
            sharpen(pixels, canvas.width, canvas.height);
            break;

            case 'faceEnhancer':
                faceEnhance(pixels, canvas.width, canvas.height);
                break;
    }
    
    ctx.putImageData(imageData, 0, 0);
}

function faceEnhance(pixels, width, height) {
    const tempPixels = new Uint8ClampedArray(pixels);
    
    // Skin tone enhancement
    for (let i = 0; i < pixels.length; i += 4) {
        const r = tempPixels[i];
        const g = tempPixels[i + 1];
        const b = tempPixels[i + 2];
        
        // Detect skin tones
        if (isSkinTone(r, g, b)) {
            // Smoothen skin
            pixels[i] = smoothPixel(tempPixels, i, width, 0);     // Red
            pixels[i+1] = smoothPixel(tempPixels, i+1, width, 1); // Green
            pixels[i+2] = smoothPixel(tempPixels, i+2, width, 2); // Blue
            
            // Enhance skin tone
            pixels[i] = Math.min(255, r * 1.1);     // Slightly increase red
            pixels[i+1] = Math.min(255, g * 1.05);  // Slightly increase green
        }
    }
}

function isSkinTone(r, g, b) {
    // Basic skin tone detection
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    
    return (
        r > 95 && g > 40 && b > 20 &&
        r > g && r > b &&
        max - min > 15 &&
        Math.abs(r - g) > 15
    );
}

function smoothPixel(pixels, idx, width, offset) {
    // Simple 3x3 averaging for smoothing
    let sum = 0;
    let count = 0;
    
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const pos = idx + (dy * width + dx) * 4;
            if (pos >= 0 && pos < pixels.length) {
                sum += pixels[pos];
                count++;
            }
        }
    }
    
    return sum / count;
}

function autoLevel(value) {
    return Math.min(255, Math.max(0, (value - 128) * 1.2 + 128));
}

function medianFilter(pixels, width, height) {
    const tempPixels = new Uint8ClampedArray(pixels);
    const radius = 1;
    
    for (let y = radius; y < height - radius; y++) {
        for (let x = radius; x < width - radius; x++) {
            for (let c = 0; c < 3; c++) {
                const values = [];
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const idx = ((y + dy) * width + (x + dx)) * 4 + c;
                        values.push(tempPixels[idx]);
                    }
                }
                values.sort((a, b) => a - b);
                pixels[(y * width + x) * 4 + c] = values[Math.floor(values.length / 2)];
            }
        }
    }
}

function unsharpMask(pixels, width, height) {
    const tempPixels = new Uint8ClampedArray(pixels);
    const amount = 0.8;
    const radius = 1;
    const threshold = 10;
    
    for (let y = radius; y < height - radius; y++) {
        for (let x = radius; x < width - radius; x++) {
            for (let c = 0; c < 3; c++) {
                const idx = (y * width + x) * 4 + c;
                let blur = 0;
                let weight = 0;
                
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const currIdx = ((y + dy) * width + (x + dx)) * 4 + c;
                        const w = 1 / ((dx * dx + dy * dy) * radius + 1);
                        blur += tempPixels[currIdx] * w;
                        weight += w;
                    }
                }
                
                blur /= weight;
                const diff = tempPixels[idx] - blur;
                if (Math.abs(diff) > threshold) {
                    pixels[idx] = Math.min(255, Math.max(0, 
                        tempPixels[idx] + diff * amount));
                }
            }
        }
    }
}

function sharpen(pixels, width, height) {
    const tempPixels = new Uint8ClampedArray(pixels);
    const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
    ];
    
    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            for (let c = 0; c < 3; c++) {
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                        sum += tempPixels[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                    }
                }
                pixels[(y * width + x) * 4 + c] = Math.min(255, Math.max(0, sum));
            }
        }
    }
}

document.getElementById('downloadBtn').addEventListener('click', function() {
    const link = document.createElement('a');
    link.download = 'filtered_image.png';
    link.href = canvas.toDataURL();
    link.click();
});


