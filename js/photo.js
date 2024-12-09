// 证件照尺寸配置（毫米转像素，按300dpi计算）
const PHOTO_SIZES = {
    small_one: { width: 260, height: 378 },     // 小一寸（22×32mm）
    one: { width: 295, height: 413 },           // 一寸（25×35mm）
    large_one: { width: 390, height: 567 },     // 大一寸（33×48mm）
    small_two: { width: 413, height: 531 },     // 小二寸（35×45mm）
    two: { width: 413, height: 579 },           // 二寸（35×49mm）
    large_two: { width: 413, height: 626 }      // 大二寸（35×53mm）
};

// 处理证件照
async function processIdPhoto(file, size, backgroundColor) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();

        reader.onload = function(e) {
            img.onload = function() {
                try {
                    const result = generateIdPhoto(img, size, backgroundColor);
                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };
            img.onerror = () => reject(new Error('图片加载失败'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsDataURL(file);
    });
}

// 生成证件照
function generateIdPhoto(img, sizeType, backgroundColor) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 获取目标尺寸
    const targetSize = PHOTO_SIZES[sizeType];
    if (!targetSize) {
        throw new Error('无效的尺寸类型');
    }

    // 设置画布尺寸为目标尺寸
    canvas.width = targetSize.width;
    canvas.height = targetSize.height;

    // 填充背景色
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 计算缩放和位置
    const scale = Math.min(
        targetSize.width / img.width,
        targetSize.height / img.height
    );

    // 计算缩放后的尺寸
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;

    // 计算居中位置
    const x = (targetSize.width - scaledWidth) / 2;
    const y = (targetSize.height - scaledHeight) / 2;

    // 绘制图像
    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);

    // 返回处理后的图片数据
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('生成证件照失败'));
                }
            },
            'image/jpeg',
            1.0
        );
    });
}

// 初始化证件照功能
document.addEventListener('DOMContentLoaded', function() {
    const idPhotoDropZone = document.getElementById('idPhotoDropZone');
    const idPhotoInput = document.getElementById('idPhotoInput');
    const photoSize = document.getElementById('photoSize');
    const colorButtons = document.querySelectorAll('.color-btn');
    const customColor = document.getElementById('customColor');
    const idPhotoPreviewSection = document.getElementById('idPhotoPreviewSection');
    const idPhotoList = document.getElementById('idPhotoList');
    const processIdPhotosBtn = document.getElementById('processIdPhotosBtn');
    const downloadIdPhotosBtn = document.getElementById('downloadIdPhotosBtn');
    const clearIdPhotosBtn = document.getElementById('clearIdPhotosBtn');
    const idPhotoCount = document.getElementById('idPhotoCount');

    let currentColor = '#FFFFFF';
    let idPhotoFiles = [];
    let processedPhotos = [];

    // 初始化拖放区域
    if (idPhotoDropZone) {
        // 点击上传
        idPhotoDropZone.addEventListener('click', () => idPhotoInput.click());

        // 处理拖放
        idPhotoDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            idPhotoDropZone.classList.add('drag-over');
        });

        idPhotoDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            idPhotoDropZone.classList.remove('drag-over');
        });

        idPhotoDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            idPhotoDropZone.classList.remove('drag-over');
            
            const files = Array.from(e.dataTransfer.files).filter(file => 
                file.type === 'image/jpeg' || file.type === 'image/png'
            );
            
            if (files.length > 0) {
                handleIdPhotoFiles(files);
            }
        });
    }

    // 处理文件选择
    if (idPhotoInput) {
        idPhotoInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files).filter(file => 
                file.type === 'image/jpeg' || file.type === 'image/png'
            );
            
            if (files.length > 0) {
                handleIdPhotoFiles(files);
            }
            // 清空 input，允许重复选择相同文件
            e.target.value = '';
        });
    }

    // 处理文件上传
    function handleIdPhotoFiles(files) {
        idPhotoFiles = [...files];
        updateIdPhotoCount();
        displayIdPhotoFiles();
        idPhotoPreviewSection.style.display = 'block';
    }

    // 更新图片数量
    function updateIdPhotoCount() {
        idPhotoCount.textContent = idPhotoFiles.length;
    }

    // 显示上传的图片
    function displayIdPhotoFiles() {
        idPhotoList.innerHTML = '';
        // 创建一个数组来存储所有加载图片的 Promise
        const loadPromises = idPhotoFiles.map((file, index) => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    resolve({
                        file,
                        index,
                        dataUrl: e.target.result
                    });
                };
                reader.readAsDataURL(file);
            });
        });

        // 等待所有图片加载完成后再显示
        Promise.all(loadPromises).then(results => {
            results.forEach(({file, index, dataUrl}) => {
                const div = document.createElement('div');
                div.className = 'image-item';
                div.dataset.index = index;
                div.innerHTML = `
                    <div class="preview-pair">
                        <div class="preview-original">
                            <img src="${dataUrl}" alt="${file.name}" title="原图">
                            <div class="size-label">原始大小: ${formatFileSize(file.size)}</div>
                        </div>
                        <div class="preview-processed">
                            <img src="${dataUrl}" alt="${file.name}" title="处理后">
                            <div class="process-status status-pending">⏳</div>
                            <div class="size-label">处理中...</div>
                        </div>
                    </div>
                    <div class="image-info">
                        <div class="image-name">${file.name}</div>
                    </div>
                `;
                idPhotoList.appendChild(div);
            });
        });
    }

    // 处理所有证件照
    async function processAllIdPhotos() {
        if (idPhotoFiles.length === 0) return;

        processIdPhotosBtn.disabled = true;
        downloadIdPhotosBtn.disabled = true;
        processedPhotos = new Array(idPhotoFiles.length);
        let processed = 0;

        const selectedSize = photoSize.value;
        const totalPhotos = idPhotoFiles.length;

        try {
            // 串行处理每张图片
            for (let i = 0; i < totalPhotos; i++) {
                const file = idPhotoFiles[i];
                const imageItem = document.querySelector(`.image-item[data-index="${i}"]`);
                
                if (!imageItem) {
                    console.error(`找不到索引为 ${i} 的图片项`);
                    continue;
                }

                const statusIndicator = imageItem.querySelector('.process-status');
                const processedImg = imageItem.querySelector('.preview-processed img');
                const processedSizeLabel = imageItem.querySelector('.preview-processed .size-label');

                try {
                    // 更新状态为处理中
                    statusIndicator.className = 'process-status status-processing';
                    statusIndicator.textContent = '🔄';

                    // 处理图片
                    const processedBlob = await processIdPhoto(file, selectedSize, currentColor);
                    
                    // 存储处理结果
                    processedPhotos[i] = processedBlob;

                    // 创建预览URL
                    const processedUrl = URL.createObjectURL(processedBlob);

                    // 确保图片加载完成后再继续
                    await new Promise((resolve, reject) => {
                        const tempImg = new Image();
                        tempImg.onload = () => {
                            processedImg.src = processedUrl;
                            resolve();
                        };
                        tempImg.onerror = () => reject(new Error('预览图片加载失败'));
                        tempImg.src = processedUrl;
                    });

                    // 更新大小信息
                    processedSizeLabel.textContent = `处理后: ${formatFileSize(processedBlob.size)}`;

                    // 更新状态为完成
                    statusIndicator.className = 'process-status status-done';
                    statusIndicator.textContent = '✓';
                } catch (error) {
                    console.error(`处理第 ${i + 1} 张图片失败:`, error);
                    statusIndicator.className = 'process-status status-error';
                    statusIndicator.textContent = '❌';
                    processedPhotos[i] = null;
                }

                processed++;
                updateIdPhotoProgress(processed, totalPhotos);
            }
        } catch (error) {
            console.error('处理过程中发生错误:', error);
        } finally {
            processIdPhotosBtn.disabled = false;
            downloadIdPhotosBtn.disabled = false;
        }
    }

    // 更新进度
    function updateIdPhotoProgress(current, total) {
        const progressBar = document.querySelector('#idPhotoPreviewSection .progress-fill');
        const progressText = document.querySelector('#idPhotoPreviewSection .progress-text');
        if (progressBar && progressText) {
            const percentage = (current / total) * 100;
            progressBar.style.width = `${percentage}%`;
            progressText.textContent = `${current}/${total} 已完成`;
        }
    }

    // 下载处理后的照片
    async function downloadIdPhotos() {
        if (!processedPhotos || processedPhotos.length === 0) {
            console.warn('没有可下载的照片');
            return;
        }

        const form = document.createElement('form');
        form.style.display = 'none';
        document.body.appendChild(form);

        try {
            // 按照原始顺序下载
            for (let i = 0; i < processedPhotos.length; i++) {
                const blob = processedPhotos[i];
                if (!blob) {
                    console.warn(`跳过下载第 ${i + 1} 张图片：处理失败`);
                    continue;
                }

                const originalName = idPhotoFiles[i].name;
                const fileName = getIdPhotoFileName(originalName);
                
                // 创建下载链接
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.href = url;
                link.download = fileName;
                form.appendChild(link);
                
                // 触发下载
                link.click();
                
                // 清理资源
                URL.revokeObjectURL(url);
                form.removeChild(link);

                // 添加延迟，避免浏览器阻止多个下载
                await new Promise(resolve => setTimeout(resolve, 300));
            }
        } catch (error) {
            console.error('下载过程中发生错误:', error);
        } finally {
            document.body.removeChild(form);
        }
    }

    // 清空所有照片
    function clearIdPhotos() {
        idPhotoFiles = [];
        processedPhotos = [];
        idPhotoList.innerHTML = '';
        updateIdPhotoCount();
        idPhotoPreviewSection.style.display = 'none';
        downloadIdPhotosBtn.disabled = true;
    }

    // 事件监听
    idPhotoDropZone.addEventListener('click', () => idPhotoInput.click());
    idPhotoInput.addEventListener('change', (e) => handleIdPhotoFiles(e.target.files));
    processIdPhotosBtn.addEventListener('click', processAllIdPhotos);
    downloadIdPhotosBtn.addEventListener('click', downloadIdPhotos);
    clearIdPhotosBtn.addEventListener('click', clearIdPhotos);

    // 颜色选择
    colorButtons.forEach(button => {
        button.addEventListener('click', () => {
            colorButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            currentColor = button.dataset.color;
        });
    });

    customColor.addEventListener('input', (e) => {
        currentColor = e.target.value;
        colorButtons.forEach(btn => btn.classList.remove('active'));
    });

    // 格式化文件大小
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 获取处理后的文件名
    function getIdPhotoFileName(originalName) {
        const lastDotIndex = originalName.lastIndexOf('.');
        if (lastDotIndex === -1) return `${originalName}_idphoto`;
        return `${originalName.substring(0, lastDotIndex)}_idphoto${originalName.substring(lastDotIndex)}`;
    }
}); 