// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 全局变量
    let imageFiles = [];
    let compressedImages = [];
    let currentQuality = 80;

    // DOM 元素
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const qualitySlider = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const imageList = document.getElementById('imageList');
    const previewConfirmSection = document.getElementById('previewConfirmSection');
    const previewCompressBtn = document.getElementById('previewCompressBtn');
    const confirmDownloadBtn = document.getElementById('confirmDownloadBtn');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const imageCountSpan = document.getElementById('imageCount');
    const batchProgress = document.querySelector('.batch-progress');
    const progressBar = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');

    // 事件监听
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('drop', handleDrop);
    fileInput.addEventListener('change', handleFileSelect);
    qualitySlider.addEventListener('input', handleQualityChange);
    previewCompressBtn.addEventListener('click', compressAllImages);
    confirmDownloadBtn.addEventListener('click', downloadAllImages);
    clearAllBtn.addEventListener('click', clearAllImages);

    // 处理文件拖放
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    }

    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
        
        const files = [...e.dataTransfer.files].filter(file => 
            file.type === 'image/jpeg' || file.type === 'image/png'
        );
        
        if (files.length > 0) {
            handleFiles(files);
        }
    }

    // 处理文件选择
    function handleFileSelect(e) {
        const files = [...e.target.files];
        handleFiles(files);
        fileInput.value = ''; // 清空input，允许重复选择相同文件
    }

    // 处理文件
    function handleFiles(files) {
        imageFiles = [...imageFiles, ...files];
        updateImageCount();
        displayImages();
        previewConfirmSection.style.display = 'block';
        // 自动开始压缩预览
        setTimeout(() => compressAllImages(), 100);
    }

    // 更新图片数量显示
    function updateImageCount() {
        imageCountSpan.textContent = imageFiles.length;
    }

    // 显示图片预览
    function displayImages() {
        imageList.innerHTML = '';
        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const imageItem = createImagePreviewElement(file, i);
            imageList.appendChild(imageItem);
            
            // 读取并显示原图
            const reader = new FileReader();
            reader.onload = (function(currentItem, currentIndex) {
                return function(e) {
                    const originalImg = currentItem.querySelector('.preview-original img');
                    const compressedImg = currentItem.querySelector('.preview-compressed img');
                    originalImg.src = e.target.result;
                    compressedImg.src = e.target.result;
                    
                    // 存储原始图片数据
                    originalImg.dataset.originalSrc = e.target.result;
                    originalImg.dataset.index = currentIndex;
                };
            })(imageItem, i);
            reader.readAsDataURL(file);
        }
    }

    // 创建图片预览元素
    function createImagePreviewElement(file, index) {
        const div = document.createElement('div');
        div.className = 'image-item';
        div.dataset.index = index;
        div.innerHTML = `
            <div class="preview-pair">
                <div class="preview-original">
                    <img src="" alt="${file.name}" title="原图" data-index="${index}">
                    <div class="size-label">原始大小: ${formatFileSize(file.size)}</div>
                </div>
                <div class="preview-compressed">
                    <img src="" alt="${file.name}" title="压缩预览" data-index="${index}">
                    <div class="compress-status status-pending">⏳</div>
                    <div class="size-label">处理中...</div>
                </div>
            </div>
            <div class="image-info">
                <div class="image-name">${file.name}</div>
                <div class="compression-ratio">处理中...</div>
            </div>
        `;
        return div;
    }

    // 处理质量变化
    async function handleQualityChange(e) {
        currentQuality = parseInt(e.target.value);
        qualityValue.textContent = `${currentQuality}%`;
        // 自动更新压缩预览
        await compressAllImages();
    }

    // 压缩所有图片
    async function compressAllImages() {
        if (imageFiles.length === 0) return;

        previewCompressBtn.disabled = true;
        batchProgress.style.display = 'block';
        compressedImages = new Array(imageFiles.length);
        let processed = 0;

        const quality = currentQuality / 100;
        const totalImages = imageFiles.length;

        // 串行处理每张图片
        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const imageItem = document.querySelector(`.image-item[data-index="${i}"]`);
            if (!imageItem) continue;

            const statusIndicator = imageItem.querySelector('.compress-status');
            const originalImg = imageItem.querySelector('.preview-original img');
            const compressedImg = imageItem.querySelector('.preview-compressed img');
            const compressedSizeLabel = imageItem.querySelector('.preview-compressed .size-label');
            const compressionRatio = imageItem.querySelector('.compression-ratio');

            try {
                statusIndicator.className = 'compress-status status-processing';
                statusIndicator.textContent = '🔄';

                // 使用原图数据进行压缩
                const compressedBlob = await compressImage(file, originalImg.dataset.originalSrc, quality);
                compressedImages[i] = compressedBlob;

                // 更新压缩后的预览
                compressedImg.src = URL.createObjectURL(compressedBlob);
                
                // 更新压缩信息
                const ratio = Math.round((1 - compressedBlob.size / file.size) * 100);
                compressionRatio.textContent = `节省 ${ratio}% 空间`;
                compressionRatio.style.color = ratio > 0 ? '#34c759' : '#ff3b30';
                compressedSizeLabel.textContent = `压缩后: ${formatFileSize(compressedBlob.size)}`;

                statusIndicator.className = 'compress-status status-done';
                statusIndicator.textContent = '✓';
            } catch (error) {
                console.error(`压缩第 ${i + 1} 张图片失败:`, error);
                statusIndicator.className = 'compress-status status-error';
                statusIndicator.textContent = '❌';
                compressedImages[i] = null;
            }

            processed++;
            updateProgress(processed, totalImages);
        }

        previewCompressBtn.disabled = false;
        confirmDownloadBtn.disabled = false;
    }

    // 压缩单个图片
    function compressImage(file, originalDataUrl, quality) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = this.naturalWidth;
                canvas.height = this.naturalHeight;
                ctx.drawImage(this, 0, 0);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('压缩失败'));
                        }
                    },
                    file.type,
                    quality
                );
            };
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = originalDataUrl;
        });
    }

    // 下载所有压缩后的图片
    async function downloadAllImages() {
        if (compressedImages.length === 0) return;

        // 如果只有一张图片，直接下载
        if (compressedImages.length === 1 && compressedImages[0]) {
            const link = document.createElement('a');
            const url = URL.createObjectURL(compressedImages[0]);
            link.href = url;
            link.download = getCompressedFileName(imageFiles[0].name);
            link.click();
            URL.revokeObjectURL(url);
            return;
        }

        // 创建一个隐藏的表单
        const form = document.createElement('form');
        form.style.display = 'none';
        document.body.appendChild(form);

        // 为每个压缩后的图片创建下载链接
        for (let i = 0; i < compressedImages.length; i++) {
            const blob = compressedImages[i];
            if (!blob) {
                console.warn(`跳过下载第 ${i + 1} 张图片：压缩失败`);
                continue;
            }

            const originalName = imageFiles[i].name;
            const fileName = getCompressedFileName(originalName);
            
            // 创建下载链接
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = fileName;
            form.appendChild(link);
            
            // 触发下载
            link.click();
            
            // 立即清理URL
            URL.revokeObjectURL(url);
            form.removeChild(link);

            // 添加延迟，避免浏览器阻止多个下载
            await new Promise(resolve => setTimeout(resolve, 300));
        }

        // 移除表单
        document.body.removeChild(form);

        // 显示下载完成提示
        const toast = document.getElementById('toast');
        if (toast) {
            const toastMessage = toast.querySelector('.toast-message');
            const toastIcon = toast.querySelector('.toast-icon');
            toastMessage.textContent = `已开始下载 ${compressedImages.filter(Boolean).length} 张图片`;
            toastIcon.textContent = '✅';
            toast.style.display = 'flex';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 3000);
        }
    }

    // 清空所有图片
    function clearAllImages() {
        imageFiles = [];
        compressedImages = [];
        imageList.innerHTML = '';
        updateImageCount();
        previewConfirmSection.style.display = 'none';
        confirmDownloadBtn.disabled = true;
        batchProgress.style.display = 'none';
    }

    // 更新进度条
    function updateProgress(current, total) {
        const percentage = (current / total) * 100;
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${current}/${total} 已完成`;
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 获取压缩后的文件名
    function getCompressedFileName(originalName) {
        const lastDotIndex = originalName.lastIndexOf('.');
        if (lastDotIndex === -1) return `${originalName}_compressed`;
        return `${originalName.substring(0, lastDotIndex)}_compressed${originalName.substring(lastDotIndex)}`;
    }
}); 