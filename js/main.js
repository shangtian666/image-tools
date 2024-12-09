// 等待 DOM 加载完成
document.addEventListener('DOMContentLoaded', function() {
    // 获取所有标签按钮和功能区域
    const tabButtons = document.querySelectorAll('.tab-btn');
    const functionSections = document.querySelectorAll('.function-section');

    // 为每个标签按钮添加点击事件
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // 移除所有标签的激活状态
            tabButtons.forEach(btn => btn.classList.remove('active'));
            // 添加当前标签的激活状态
            button.classList.add('active');

            // 获取目标功能区域的ID
            const targetId = button.dataset.tab + 'Section';

            // 隐藏所有功能区域
            functionSections.forEach(section => {
                section.style.display = 'none';
                section.classList.remove('active');
            });

            // 显示目标功能区域
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.style.display = 'block';
                targetSection.classList.add('active');
            }
        });
    });
}); 