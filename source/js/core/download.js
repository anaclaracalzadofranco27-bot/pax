/* Download unico usado pelos exportadores do shell (iframe da Aba 1 e independente). */
window.APHA_downloadBlob = function downloadBlob(blob, filename, revokeAfterMs = 15000) {
    if (!blob || !filename) return false;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), revokeAfterMs);
    return true;
};
