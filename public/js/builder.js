(function () {
  const nameInput = document.getElementById('name-input');
  const previewName = document.getElementById('preview-name');
  const previewEmoji = document.getElementById('preview-emoji');
  const previewAccessory = document.getElementById('preview-accessory');
  const previewAvatar = document.getElementById('preview-avatar');

  nameInput.addEventListener('input', () => {
    previewName.textContent = nameInput.value.trim() || 'اسم الخرا';
  });

  document.querySelectorAll('#hue-swatches input').forEach((input) => {
    input.addEventListener('change', () => {
      previewEmoji.style.filter = `hue-rotate(${input.dataset.hue}deg) saturate(${input.dataset.hue === '0' ? 1 : 1.6})`;
    });
  });

  document.querySelectorAll('#aura-swatches input').forEach((input) => {
    input.addEventListener('change', () => {
      previewAvatar.style.background = input.dataset.color === 'transparent' ? 'transparent' : `${input.dataset.color}33`;
    });
  });

  document.querySelectorAll('#accessory-swatches input').forEach((input) => {
    input.addEventListener('change', () => {
      previewAccessory.textContent = input.dataset.emoji || '';
    });
  });
})();
