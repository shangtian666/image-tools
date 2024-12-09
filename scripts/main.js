// 获取DOM元素
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const imageList = document.getElementById('imageList');
const qualitySlider = document.getElementById('quality');
const qualityValue = document.getElementById('qualityValue');
const compressAllBtn = document.getElementById('compressAllBtn');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const batchProgress = document.querySelector('.batch-progress');
const progressFill = document.querySelector('.progress-fill');
const progressText = document.querySelector('.progress-text');
const toast = document.getElementById('toast');

// 证件照相关元素
const idPhotoDropZone = document.getElementById('idPhotoDropZone');
const idPhotoInput = document.getElementById('idPhotoInput');
const idPhotoPreviewSection = document.getElementById('idPhotoPreviewSection');
const idPhotoOriginal = document.getElementById('idPhotoOriginal');
const idPhotoPreview = document.getElementById('idPhotoPreview');
const photoSize = document.getElementById('photoSize');
const colorBtns = document.querySelectorAll('.color-btn');
const customColor = document.getElementById('customColor');
const downloadIdPhoto = document.getElementById('downloadIdPhoto');

// 全局变量
let imageItems = new Map(); // 存储所有图片项
let isProcessing = false;
let originalFile = null;
let currentBackgroundColor = '#FFFFFF';

// 标签切换功能
const tabBtns = document.querySelectorAll('.tab-btn');
const functionSections = document.querySelectorAll('.function-section');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        functionSections.forEach(s => s.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab + 'Section').classList.add('active');
    });
});

// 处理拖放
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#0071e3';
    dropZone.style.background = '#f8f8f8';
});

dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#e0e0e0';
    dropZone.style.background = 'white';
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#e0e0e0';
    dropZone.style.background = 'white';
    
    const files = Array.from(e.dataTransfer.files).filter(file => isImageFile(file));
    if (files.length > 0) {
        handleFiles(files);
    }
});

// 处理点击上传
dropZone.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files).filter(file => isImageFile(file));
    if (files.length > 0) {
        handleFiles(files);
    }
});

// 检查文件类型
function isImageFile(file) {
    return file.type.match(/^image\/(jpeg|png)$/);
}

// 处理文件
function handleFiles(files) {
    files.forEach(file => {
        // 创建图片项
        const imageItem = createImageItem(file);
        imageList.appendChild(imageItem);
        
        // 读���并显示图片
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = imageItem.querySelector('.image-preview');
            preview.src = e.target.result;
            
            // 存储图片信息
            imageItems.set(file.name, {
                file: file,
                originalSize: file.size,
                originalDataUrl: e.target.result,
                compressedDataUrl: null,
                compressedSize: 0,
                element: imageItem
            });
            
            // 更新原始大小显示
            const originalSizeSpan = imageItem.querySelector('.original-size');
            originalSizeSpan.textContent = formatFileSize(file.size);
        };
        reader.readAsDataURL(file);
    });
    
    updateBatchButtons();
}

// 创建图片项
function createImageItem(file) {
    const div = document.createElement('div');
    div.className = 'image-item';
    div.innerHTML = `
        <img class="image-preview" alt="${file.name}">
        <div class="image-info">
            <div class="image-name">${file.name}</div>
            <div class="size-info">
                <span>原始：<span class="original-size">-</span></span>
                <span>压缩后：<span class="compressed-size">-</span></span>
            </div>
        </div>
        <div class="image-actions">
            <button class="compress-btn">压缩</button>
            <button class="download-btn" disabled>下载</button>
        </div>
    `;
    
    // 添加压缩按钮事件
    const compressBtn = div.querySelector('.compress-btn');
    compressBtn.addEventListener('click', () => {
        compressImage(file.name);
    });
    
    // 添加下载按钮事件
    const downloadBtn = div.querySelector('.download-btn');
    downloadBtn.addEventListener('click', () => {
        downloadCompressedImage(file.name);
    });
    
    return div;
}

// 压缩单张图片
async function compressImage(fileName) {
    const imageData = imageItems.get(fileName);
    if (!imageData) return;
    
    const quality = qualitySlider.value;
    
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            const compressedDataUrl = canvas.toDataURL(imageData.file.type, quality / 100);
            
            // 计算压缩后的大小
            const base64Data = compressedDataUrl.split(',')[1];
            const compressedSize = Math.ceil(base64Data.length * 3 / 4);
            
            // 更新图片数据
            imageData.compressedDataUrl = compressedDataUrl;
            imageData.compressedSize = compressedSize;
            
            // 更新UI
            const compressedSizeSpan = imageData.element.querySelector('.compressed-size');
            compressedSizeSpan.textContent = formatFileSize(compressedSize);
            
            // 启用下载按钮
            const downloadBtn = imageData.element.querySelector('.download-btn');
            downloadBtn.disabled = false;
            
            resolve();
        };
        img.src = imageData.originalDataUrl;
    });
}

// 下载单张压缩后的图片
function downloadCompressedImage(fileName) {
    const imageData = imageItems.get(fileName);
    if (!imageData || !imageData.compressedDataUrl) return;
    
    const link = document.createElement('a');
    link.download = `compressed_${fileName}`;
    link.href = imageData.compressedDataUrl;
    link.click();
}

// 批量压缩
async function compressAllImages() {
    if (isProcessing) return;
    isProcessing = true;
    
    // 显示进度条
    batchProgress.style.display = 'block';
    const totalImages = imageItems.size;
    let processedImages = 0;
    
    try {
        for (const [fileName] of imageItems) {
            await compressImage(fileName);
            processedImages++;
            
            // 更新进度
            const progress = (processedImages / totalImages) * 100;
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${processedImages}/${totalImages} 已完成`;
        }
        
        // 显示完成提示
        showToast('✅ 所有图片压缩完成！');
    } catch (error) {
        showToast('❌ 压缩过程中出现错误');
    } finally {
        isProcessing = false;
        // 隐藏进度条
        setTimeout(() => {
            batchProgress.style.display = 'none';
            progressFill.style.width = '0%';
        }, 1000);
    }
}

// 批量下载
async function downloadAllImages() {
    if (isProcessing) return;
    isProcessing = true;
    
    // 创建ZIP文件
    const zip = new JSZip();
    const totalImages = imageItems.size;
    let processedImages = 0;
    
    // 显示进度条
    batchProgress.style.display = 'block';
    
    try {
        for (const [fileName, imageData] of imageItems) {
            if (imageData.compressedDataUrl) {
                // 将base64转换为二进制
                const base64Data = imageData.compressedDataUrl.split(',')[1];
                const binaryData = atob(base64Data);
                const array = new Uint8Array(binaryData.length);
                for (let i = 0; i < binaryData.length; i++) {
                    array[i] = binaryData.charCodeAt(i);
                }
                
                // 添加到ZIP
                zip.file(`compressed_${fileName}`, array);
                
                processedImages++;
                // 更新进度
                const progress = (processedImages / totalImages) * 100;
                progressFill.style.width = `${progress}%`;
                progressText.textContent = `${processedImages}/${totalImages} 已完成`;
            }
        }
        
        // 生成并下载ZIP
        const content = await zip.generateAsync({type: 'blob'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = 'compressed_images.zip';
        link.click();
        
        showToast('✅ 压缩包已开始下载！');
    } catch (error) {
        showToast('❌ 下载过程中出现错误');
    } finally {
        isProcessing = false;
        // 隐藏进度条
        setTimeout(() => {
            batchProgress.style.display = 'none';
            progressFill.style.width = '0%';
        }, 1000);
    }
}

// 清空列表
function clearImageList() {
    imageList.innerHTML = '';
    imageItems.clear();
    updateBatchButtons();
    showToast('🗑️ 列表已清空');
}

// 更新批量操作按钮状态
function updateBatchButtons() {
    const hasImages = imageItems.size > 0;
    compressAllBtn.style.display = hasImages ? 'block' : 'none';
    downloadAllBtn.style.display = hasImages ? 'block' : 'none';
    clearAllBtn.style.display = hasImages ? 'block' : 'none';
}

// 显示提示信息
function showToast(message) {
    const toastMessage = toast.querySelector('.toast-message');
    toastMessage.textContent = message;
    toast.style.display = 'flex';
    
    setTimeout(() => {
        toast.style.display = 'none';
    }, 3000);
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 事件监听
compressAllBtn.addEventListener('click', compressAllImages);
downloadAllBtn.addEventListener('click', downloadAllImages);
clearAllBtn.addEventListener('click', clearImageList);

qualitySlider.addEventListener('input', (e) => {
    qualityValue.textContent = e.target.value + '%';
}); 